import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errors';
import type { AdminOrder, AdminCustomer, OrderStatus } from '../types';

export type { AdminOrder, AdminCustomer };

export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, email, created_at, total, status')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) handleSupabaseError(error, 'Failed to load orders');

  return (data ?? []).map((row) => ({
    id: row.order_number || row.id,
    orderNumber: row.order_number,
    customer: row.customer_name,
    email: row.email,
    date: row.created_at,
    total: Number(row.total),
    status: normalizeStatus(row.status),
  }));
}

function normalizeStatus(status: string): AdminOrder['status'] {
  const s = status?.toLowerCase?.() ?? '';
  if (s === 'processing') return 'Processing';
  if (s === 'shipped') return 'Shipped';
  if (s === 'delivered') return 'Delivered';
  if (s === 'packed') return 'Packed';
  if (s === 'in transit') return 'In Transit';
  if (s === 'out for delivery') return 'Out for Delivery';
  if (s === 'confirmed') return 'Confirmed';
  return 'Processing';
}

export async function updateOrderStatus(orderNumber: string, status: string) {
  const supabase = getSupabaseClient();

  // Fetch existing timeline history so we can append the new status event
  const { data: existing } = await supabase
    .from('orders')
    .select('timeline')
    .eq('order_number', orderNumber)
    .maybeSingle();

  const rawTimeline: unknown[] = Array.isArray(existing?.timeline) ? existing.timeline : [];
  // Keep only history-log entries (new format: {status, timestamp}); discard old display format
  const historyLog = rawTimeline.filter(
    (e): e is { status: string; timestamp: string } =>
      typeof (e as Record<string, unknown>).status === 'string' &&
      !('completed' in (e as Record<string, unknown>))
  );

  // Append the new status with the real timestamp
  const updatedTimeline = [...historyLog, { status, timestamp: new Date().toISOString() }];

  // Derive a status description so the tracking page always shows up-to-date text
  const STATUS_DESCRIPTIONS: Record<string, string> = {
    Confirmed: 'Your order has been received and payment confirmed. We will begin processing it shortly.',
    Processing: 'Our team is reviewing your order and preparing it for packing.',
    Packed: 'Your items have been carefully packed and are ready for dispatch.',
    Shipped: 'Your order has been handed over and is on its way to you.',
    'In Transit': 'Your order is on the way to your city.',
    'Out for Delivery': 'Your order is out for delivery today — please keep your phone nearby.',
    Delivered: 'Your order has been delivered. Thank you for shopping with Bejeweled!',
    Cancelled: 'This order has been cancelled. Please contact our support for further assistance.',
  };

  const { error } = await supabase
    .from('orders')
    .update({
      status,
      status_description: STATUS_DESCRIPTIONS[status] ?? '',
      timeline: updatedTimeline,
    })
    .eq('order_number', orderNumber);

  if (error) handleSupabaseError(error, 'Failed to update order status');
}

export async function fetchAllCustomers(): Promise<AdminCustomer[]> {
  const supabase = getSupabaseClient();

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, role, created_at')
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  if (profilesError) handleSupabaseError(profilesError, 'Failed to load customer profiles');
  if (!profiles || profiles.length === 0) return [];

  // Get order aggregates for all users
  const { data: orders } = await supabase
    .from('orders')
    .select('user_id, total');

  // Aggregate orders per user
  const orderAgg = new Map<string, { totalSpent: number; orderCount: number }>();
  for (const order of orders ?? []) {
    const existing = orderAgg.get(order.user_id) ?? { totalSpent: 0, orderCount: 0 };
    existing.totalSpent += Number(order.total);
    existing.orderCount += 1;
    orderAgg.set(order.user_id, existing);
  }

  // Get user emails from auth - we'll use the profile id and email from orders
  const emailMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  for (const order of orders ?? []) {
    if (order.user_id && !emailMap.has(order.user_id)) {
      // We need the email; the orders table has it
    }
  }

  // Re-fetch orders with email and customer_name
  const { data: ordersWithEmail } = await supabase
    .from('orders')
    .select('user_id, email, customer_name');

  for (const order of ordersWithEmail ?? []) {
    if (order.user_id && order.email) {
      emailMap.set(order.user_id, order.email);
    }
    if (order.user_id && order.customer_name) {
      nameMap.set(order.user_id, order.customer_name);
    }
  }

  return profiles.map((profile) => {
    const agg = orderAgg.get(profile.id) ?? { totalSpent: 0, orderCount: 0 };
    return {
      id: profile.id,
      email: emailMap.get(profile.id) ?? '',
      name: nameMap.get(profile.id) ?? emailMap.get(profile.id)?.split('@')[0] ?? 'Unknown',
      role: profile.role,
      createdAt: profile.created_at,
      totalSpent: agg.totalSpent,
      orderCount: agg.orderCount,
    };
  });
}
