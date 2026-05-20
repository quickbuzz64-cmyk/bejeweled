import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errors';
import type {
  ShippingMethod,
  TrackedOrderItem,
  TrackingEvent,
  TrackedOrder,
  CreateTrackedOrderInput,
} from '../types';

export type { TrackedOrderItem, TrackingEvent, TrackedOrder, CreateTrackedOrderInput };

// ─── Status level mapping ─────────────────────────────────────────────────────
// 7-step manual tracking progression controlled by the admin.
// "confirmed" represents "Order Placed" (initial state when order is created).
const STATUS_LEVEL: Record<string, number> = {
  confirmed: 1,        // Order Placed
  processing: 2,       // Processing
  packed: 3,           // Packed
  shipped: 4,          // Shipped
  'in transit': 5,     // In Transit
  'out for delivery': 6, // Out for Delivery
  delivered: 7,        // Delivered
};

// ─── Status history entry (stored in DB timeline JSONB column) ────────────────
interface StatusHistoryEntry {
  status: string;
  timestamp: string; // ISO 8601
}

/**
 * Returns true when the stored JSONB array is the new history-log format
 * (items with {status, timestamp}) vs the old display-events format
 * (items with {id, label, completed}).
 */
function isHistoryLog(rawTimeline: unknown[]): boolean {
  if (rawTimeline.length === 0) return true;
  const first = rawTimeline[0] as Record<string, unknown>;
  return typeof first.status === 'string' && !('completed' in first);
}

function getHistoryLog(rawTimeline: unknown[]): StatusHistoryEntry[] {
  if (!isHistoryLog(rawTimeline)) return [];
  return rawTimeline as StatusHistoryEntry[];
}

/**
 * Builds the 7-step display timeline dynamically from the DB row's current
 * `status` field and the status-history log stored in `timeline`.
 * Steps are marked completed based on the current status level; timestamps
 * come from the history log where available, or are estimated from created_at.
 * This is a MANUAL tracking system — no courier/carrier integration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDisplayTimeline(row: any): TrackingEvent[] {
  const statusRaw: string = row.status ?? 'Confirmed';
  const level = STATUS_LEVEL[statusRaw.toLowerCase()] ?? 1;
  const rawTimeline: unknown[] = Array.isArray(row.timeline) ? row.timeline : [];
  const history = getHistoryLog(rawTimeline);
  const createdAt = new Date((row.created_at as string) || new Date().toISOString());
  const destCity: string = row.destination_city || row.city || '';
  const shippingAddress: string = row.shipping_address || '';
  const city: string = row.city || '';
  const addressLine = [shippingAddress, city].filter(Boolean).join(', ');
  const isDelivered = statusRaw.toLowerCase() === 'delivered';

  // Build level → ISO timestamp map from history log
  const levelTimestamps = new Map<number, string>();
  for (const entry of history) {
    const entryLevel = STATUS_LEVEL[entry.status.toLowerCase()];
    if (entryLevel !== undefined && !levelTimestamps.has(entryLevel)) {
      levelTimestamps.set(entryLevel, entry.timestamp);
    }
  }

  // Estimated hour offsets for steps without an explicit history entry
  const estimateOffsetHours = [0, 2, 5, 12, 36, 96, 120];

  const steps = [
    {
      id: 'placed',
      label: 'Order Placed',
      description: 'Your order has been received and payment confirmed.',
      location: 'Bejeweled Online Store, Lahore',
      level: 1,
    },
    {
      id: 'processing',
      label: 'Processing',
      description: 'Our team is reviewing your order and preparing it for packing.',
      location: 'Lahore Fulfillment Center',
      level: 2,
    },
    {
      id: 'packed',
      label: 'Packed',
      description: 'Your items have been carefully packed and are ready for dispatch.',
      location: 'Lahore Fulfillment Warehouse',
      level: 3,
    },
    {
      id: 'shipped',
      label: 'Shipped',
      description: 'Your order has been handed over and is on its way.',
      location: 'Lahore Dispatch Center',
      level: 4,
    },
    {
      id: 'in_transit',
      label: 'In Transit',
      description: 'Your order is on the way to your city.',
      location: destCity ? `En route to ${destCity}` : 'In Transit',
      level: 5,
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      description: 'Your order is out for delivery today — please keep your phone nearby.',
      location: destCity || 'Your City',
      level: 6,
    },
    {
      id: 'delivered',
      label: isDelivered ? 'Delivered' : 'Delivery',
      description: isDelivered
        ? 'Your order has been delivered. Thank you for shopping with Bejeweled!'
        : 'Your order will be delivered to the provided shipping address.',
      location: addressLine || destCity || 'Delivery Address',
      level: 7,
    },
  ];

  return steps.map((step, idx) => {
    const completed = level >= step.level;
    const isCurrent = level === step.level;

    let timestamp = '';
    if (levelTimestamps.has(step.level)) {
      timestamp = formatTimestamp(new Date(levelTimestamps.get(step.level)!));
    } else if (completed) {
      // Estimate from created_at for completed steps with no explicit history
      timestamp = formatTimestamp(addHours(createdAt, estimateOffsetHours[idx]));
    } else if (step.id === 'delivered' && !isCurrent) {
      // Future delivery step: show estimated delivery date if available
      timestamp = (row.estimated_delivery as string) || formatTimestamp(addDays(createdAt, 5));
    }

    return {
      id: step.id,
      label: step.label,
      description: step.description,
      location: step.location,
      timestamp,
      completed,
    };
  });
}

const STORAGE_KEY = 'snugsip-guest-orders';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function readStoredOrders() {
  if (!canUseStorage()) {
    return [] as TrackedOrder[];
  }

  const rawOrders = window.localStorage.getItem(STORAGE_KEY);

  if (!rawOrders) {
    return [] as TrackedOrder[];
  }

  try {
    return JSON.parse(rawOrders) as TrackedOrder[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [] as TrackedOrder[];
  }
}

function writeStoredOrders(orders: TrackedOrder[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}

export function normalizeOrderNumber(value: string) {
  return value.replace(/#/g, '').trim().toUpperCase();
}

export function formatOrderNumber(value: string) {
  const normalizedValue = normalizeOrderNumber(value);
  return normalizedValue ? `#${normalizedValue}` : '#';
}

export function buildOrderTrackingPath(value: string) {
  return `/track-order/${normalizeOrderNumber(value)}`;
}

export function getTrackedOrder(orderNumber: string) {
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
  const storedOrders = readStoredOrders();
  return storedOrders.find((order) => normalizeOrderNumber(order.orderNumber) === normalizedOrderNumber) ?? null;
}

export async function getTrackedOrderFromSupabase(orderNumber: string): Promise<TrackedOrder | null> {
  const supabase = getSupabaseClient();
  const normalized = normalizeOrderNumber(orderNumber);
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', normalized)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'Failed to load order details');
  if (!data) return null;
  return mapRowToTrackedOrder(data);
}

export async function getUserOrdersFromSupabase(): Promise<TrackedOrder[]> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) handleSupabaseError(error, 'Failed to load your orders');
  return (data ?? []).map(mapRowToTrackedOrder);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToTrackedOrder(row: any): TrackedOrder {
  return {
    orderNumber: row.order_number,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    shippingAddressLine: row.shipping_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    shippingMethod: row.shipping_method,
    paymentMethod: row.payment_method,
    status: row.status,
    // Always derive statusDescription from status so it stays in sync with admin changes
    statusDescription: row.status_description || '',
    carrier: row.carrier,
    trackingCode: row.tracking_code,
    originCity: row.origin_city,
    destinationCity: row.destination_city,
    estimatedDelivery: row.estimated_delivery,
    orderPlacedAt: row.order_placed_at || formatTimestamp(new Date(row.created_at as string)),
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    tax: row.tax,
    total: row.total,
    // Timeline is always built dynamically from current status + history log
    timeline: buildDisplayTimeline(row),
  };
}

export function getMostRecentTrackedOrder() {
  const storedOrders = readStoredOrders();
  return storedOrders[0] ?? null;
}

export function saveTrackedOrder(order: TrackedOrder) {
  const normalizedOrderNumber = normalizeOrderNumber(order.orderNumber);
  const remainingOrders = readStoredOrders().filter(
    (existingOrder) => normalizeOrderNumber(existingOrder.orderNumber) !== normalizedOrderNumber
  );

  writeStoredOrders([order, ...remainingOrders].slice(0, 10));

  // Also persist to Supabase (fire-and-forget)
  void saveOrderToSupabase(order);
}

async function saveOrderToSupabase(order: TrackedOrder) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('orders').upsert(
      {
        order_number: order.orderNumber,
        user_id: user.id,
        customer_name: order.customerName,
        email: order.email,
        phone: order.phone,
        shipping_address: order.shippingAddressLine,
        city: order.city,
        state: order.state,
        zip_code: order.zipCode,
        shipping_method: order.shippingMethod,
        payment_method: order.paymentMethod ?? 'cod',
        status: order.status,
        status_description: order.statusDescription,
        carrier: order.carrier,
        tracking_code: order.trackingCode,
        origin_city: order.originCity,
        destination_city: order.destinationCity,
        estimated_delivery: order.estimatedDelivery,
        order_placed_at: order.orderPlacedAt,
        items: order.items,
        subtotal: order.subtotal,
        shipping_cost: order.shippingCost,
        tax: order.tax,
        total: order.total,
        // Store a status-history log (not the display events) so the timeline
        // can be rebuilt dynamically and admin status updates propagate correctly.
        timeline: [{ status: order.status, timestamp: new Date().toISOString() }] satisfies StatusHistoryEntry[],
      },
      { onConflict: 'order_number' }
    );
    if (error) console.error('[saveOrderToSupabase]', error);
  } catch (err) {
    // Supabase persistence is best-effort; localStorage is the fallback
    console.error('[saveOrderToSupabase]', err);
  }
}

export function createTrackedOrder(input: CreateTrackedOrderInput) {
  const createdAt = new Date();
  const orderNumber = `CZP-${Math.floor(10000 + Math.random() * 90000)}`;
  const customerName = `${input.firstName} ${input.lastName}`.trim();
  const estimatedDeliveryDate = addDays(createdAt, 5);
  const orderPlacedAt = formatTimestamp(createdAt);

  // Build the initial display timeline from the 'Confirmed' (Order Placed) status
  const initialRow = {
    status: 'Confirmed',
    created_at: createdAt.toISOString(),
    destination_city: input.city,
    city: input.city,
    shipping_address: input.address,
    estimated_delivery: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(estimatedDeliveryDate),
    // No history entries yet — timestamps estimated from created_at
    timeline: [],
  };

  return {
    orderNumber,
    customerName,
    email: input.email,
    phone: input.phone,
    shippingAddressLine: input.address,
    city: input.city,
    state: input.state,
    zipCode: input.zipCode,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    status: 'Confirmed' as const,
    statusDescription: 'Your order has been received and payment confirmed. We will begin processing it shortly.',
    carrier: '',
    trackingCode: '',
    originCity: 'Lahore',
    destinationCity: input.city,
    estimatedDelivery: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(estimatedDeliveryDate),
    orderPlacedAt,
    items: input.items,
    subtotal: input.subtotal,
    shippingCost: input.shippingCost,
    tax: input.tax,
    total: input.total,
    // Display timeline is built dynamically so localStorage also shows correct steps
    timeline: buildDisplayTimeline(initialRow),
  } satisfies TrackedOrder;
}