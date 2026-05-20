import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, MapPin, Package, PackageCheck } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { EmptyState } from '../components/EmptyState';
import { formatOrderNumber, getTrackedOrder, getTrackedOrderFromSupabase, normalizeOrderNumber } from '../lib/orderTracking';
import { getSupabaseClient } from '../lib/supabase';
import { PageSeo } from '../components/PageSeo';
import { showErrorToast } from '../lib/notifications';
import { formatPKR } from '../lib/pricing';
import { Skeleton } from '../components/ui/skeleton';
import type { TrackedOrder } from '../types';

const STATUS_MESSAGES: Record<string, string> = {
  Confirmed: 'Your order has been received and payment confirmed. We will begin processing it shortly.',
  Processing: 'Our team is reviewing your order and preparing it for packing.',
  Packed: 'Your items have been carefully packed and are ready for dispatch.',
  Shipped: 'Your order has been handed over and is on its way to you.',
  'In Transit': 'Your order is on the way to your city.',
  'Out for Delivery': 'Your order is out for delivery today — please keep your phone nearby.',
  Delivered: 'Your order has been delivered. Thank you for shopping with Bejeweled!',
  Cancelled: 'This order has been cancelled. Please contact our support for further assistance.',
};

function getStatusMessage(status: string, description: string): string {
  return description || STATUS_MESSAGES[status] || 'Your order is being processed.';
}

export default function OrderTrackingDetails() {
  const { orderNumber = '' } = useParams();
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();
    const normalized = normalizeOrderNumber(orderNumber);

    // Show localStorage data instantly while Supabase loads
    const local = getTrackedOrder(orderNumber);
    if (local) setTrackedOrder(local);

    async function loadFromSupabase() {
      try {
        const remote = await getTrackedOrderFromSupabase(orderNumber);
        if (!cancelled) {
          setTrackedOrder(remote);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          if (!local) {
            showErrorToast('Tracking error', err instanceof Error ? err.message : 'Failed to load order details.');
          }
        }
      }
    }

    void loadFromSupabase();

    // Realtime: re-fetch when admin updates this order
    const channel = supabase
      .channel(`order-tracking-${normalized}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_number=eq.${normalized}`,
      }, () => {
        void loadFromSupabase();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [orderNumber]);

  const pageTitle = trackedOrder ? `Track ${formatOrderNumber(trackedOrder.orderNumber)}` : 'Order Tracking';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo title={pageTitle} />
      <Header />

      <main className="store-section">
        <div className="store-shell">

          {loading ? (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)] xl:items-start">
              <div className="space-y-8">
                {/* Header card skeleton */}
                <div className="overflow-hidden rounded-[2rem] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5' }}>
                  <div className="border-b px-6 py-5 md:px-8 space-y-3" style={{ borderColor: '#E8D5F5', backgroundColor: '#FAF7FF' }}>
                    <Skeleton className="h-4 w-40 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                    <Skeleton className="h-9 w-56 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                    <Skeleton className="h-4 w-72 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:p-8 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="rounded-2xl p-5" style={{ backgroundColor: '#FAF7FF' }}>
                        <Skeleton className="mb-2 h-3 w-16 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                        <Skeleton className="h-5 w-24 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Timeline skeleton */}
                <div className="rounded-[2rem] border p-6 md:p-8" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5' }}>
                  <Skeleton className="mb-2 h-8 w-52 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                  <Skeleton className="mb-6 h-4 w-80 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                  <div className="space-y-5">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="flex gap-4">
                        <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                        <div className="flex-1 space-y-2 rounded-[1.5rem] border p-5" style={{ borderColor: '#EFE6D3' }}>
                          <Skeleton className="h-5 w-40 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                          <Skeleton className="h-4 w-full rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                          <Skeleton className="h-4 w-32 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Sidebar skeleton */}
              <div className="space-y-8">
                <div className="rounded-[2rem] border p-6 md:p-8 space-y-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5' }}>
                  <Skeleton className="h-7 w-40 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="space-y-1">
                      <Skeleton className="h-3 w-20 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                      <Skeleton className="h-5 w-36 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                    </div>
                  ))}
                </div>
                <div className="rounded-[2rem] border p-6 md:p-8 space-y-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5' }}>
                  <Skeleton className="h-7 w-32 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                  {[1, 2].map((n) => (
                    <div key={n} className="flex gap-4 rounded-2xl p-3" style={{ backgroundColor: '#FAF7FF' }}>
                      <Skeleton className="h-16 w-16 flex-shrink-0 rounded-xl" style={{ backgroundColor: '#EEF2EE' }} />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                        <Skeleton className="h-3 w-12 rounded-full" style={{ backgroundColor: '#EEF2EE' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !trackedOrder ? (
            <EmptyState
              icon={<PackageCheck className="h-8 w-8" aria-hidden="true" />}
              title="Order not found"
              description="We couldn't find an order with this number. Please double-check the order ID from your confirmation screen or email."
              actionLabel="Track Another Order"
              actionTo="/track-order"
              ariaLabel="Order not found"
            />
          ) : (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)] xl:items-start">
              <section className="space-y-8" aria-labelledby="tracking-heading">
                <article className="overflow-hidden rounded-[2rem] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5', boxShadow: '0 12px 42px rgba(91, 30, 110, 0.12)' }}>
                  <div className="border-b px-6 py-5 md:px-8" style={{ background: 'linear-gradient(135deg, #FAF7FF 0%, #F3ECF9 100%)', borderColor: '#E8D5F5' }}>
                    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="max-w-2xl">
                        <p className="mb-2 text-sm uppercase tracking-[0.2em]" style={{ fontFamily: 'Inter, sans-serif', color: '#B7B09F', fontWeight: 700 }}>
                          Order Tracking
                        </p>
                        <h1 id="tracking-heading" className="mb-2 text-3xl md:text-4xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
                          {formatOrderNumber(trackedOrder.orderNumber)}
                        </h1>
                        <p className="text-sm leading-relaxed md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
                          {getStatusMessage(trackedOrder.status, trackedOrder.statusDescription)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center rounded-full px-4 py-2 text-sm" style={{ backgroundColor: '#F0F4F0', color: '#3B0D4A', border: '1px solid #E8D5F5', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          {trackedOrder.status}
                        </span>
                      </div>
                    </header>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3 md:p-8">
                    <div className="rounded-2xl p-5" style={{ backgroundColor: '#FAF7FF' }}>
                      <p className="mb-1 text-xs uppercase tracking-[0.16em]" style={{ fontFamily: 'Inter, sans-serif', color: '#B7B09F', fontWeight: 700 }}>Order Placed</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{trackedOrder.orderPlacedAt}</p>
                    </div>
                    <div className="rounded-2xl p-5" style={{ backgroundColor: '#FAF7FF' }}>
                      <p className="mb-1 text-xs uppercase tracking-[0.16em]" style={{ fontFamily: 'Inter, sans-serif', color: '#B7B09F', fontWeight: 700 }}>Route</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Lahore → {trackedOrder.destinationCity}</p>
                    </div>
                    <div className="rounded-2xl p-5" style={{ backgroundColor: '#FAF7FF' }}>
                      <p className="mb-1 text-xs uppercase tracking-[0.16em]" style={{ fontFamily: 'Inter, sans-serif', color: '#B7B09F', fontWeight: 700 }}>Estimated Delivery</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{trackedOrder.estimatedDelivery}</p>
                    </div>
                  </div>
                </article>

                <article className="rounded-[2rem] border p-6 md:p-8" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5', boxShadow: '0 12px 42px rgba(91, 30, 110, 0.12)' }}>
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="mb-2 text-3xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
                        Order Progress
                      </h2>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.7 }}>
                        Track each step of your order from placement to delivery.
                      </p>
                    </div>
                    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#FAF7FF' }}>
                      <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Current Status</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{trackedOrder.timeline.filter((event) => event.completed).slice(-1)[0]?.label ?? trackedOrder.status}</p>
                    </div>
                  </div>

                  {(() => {
                    const lastCompletedIndex = trackedOrder.timeline.reduce(
                      (acc, e, i) => (e.completed ? i : acc),
                      -1
                    );
                    return (
                      <ol className="space-y-3" role="list">
                        {trackedOrder.timeline.map((event, index) => {
                          const isCurrent = index === lastCompletedIndex;
                          const isDone = event.completed && !isCurrent;
                          const isPending = !event.completed;
                          return (
                            <li key={event.id} className="relative flex gap-4">
                              {/* Step indicator column */}
                              <div className="flex flex-col items-center">
                                <span
                                  className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: isDone ? '#5B1E6E' : isCurrent ? '#3B0D4A' : '#F0EDE6',
                                    border: isCurrent ? '2px solid #5B1E6E' : isPending ? '2px solid #E8D5F5' : 'none',
                                    boxShadow: isCurrent ? '0 0 0 4px rgba(91,30,110,0.15)' : 'none',
                                  }}
                                  aria-hidden="true"
                                >
                                  {isDone && <Check className="h-4 w-4" style={{ color: '#FFFFFF' }} />}
                                  {isCurrent && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#FFFFFF' }} />}
                                  {isPending && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#C8C0B4' }} />}
                                </span>
                                {index < trackedOrder.timeline.length - 1 && (
                                  <span
                                    className="mt-1 w-0.5"
                                    style={{
                                      backgroundColor: event.completed ? '#5B1E6E' : '#DDD6CB',
                                      minHeight: '2rem',
                                      flex: 1,
                                    }}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              {/* Step content */}
                              <div
                                className="mb-3 min-w-0 flex-1 rounded-2xl border px-5 py-4"
                                style={{
                                  backgroundColor: isCurrent ? '#EEF5EC' : isPending ? '#FAFAF8' : '#FAF7FF',
                                  borderColor: isCurrent ? '#5B1E6E' : isPending ? '#E8E0D4' : '#E8D5F5',
                                  boxShadow: isCurrent ? '0 2px 12px rgba(91,30,110,0.14)' : 'none',
                                }}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <h3
                                      className="text-sm"
                                      style={{
                                        fontFamily: 'Inter, sans-serif',
                                        color: isPending ? '#AAAAAA' : '#1A0A24',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {event.label}
                                    </h3>
                                    {isCurrent && (
                                      <span
                                        className="rounded-full px-2 py-0.5 text-xs"
                                        style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                                      >
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  {event.timestamp && (
                                    <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#B7B09F' }}>
                                      {event.timestamp}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="mt-1 text-sm leading-relaxed"
                                  style={{ fontFamily: 'Inter, sans-serif', color: isPending ? '#C8C0B4' : '#5B1E6E' }}
                                >
                                  {event.description}
                                </p>
                                {!isPending && event.location && (
                                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 500 }}>
                                    <MapPin className="h-3 w-3" aria-hidden="true" />
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    );
                  })()}
                </article>
              </section>

              <aside className="space-y-8 xl:sticky xl:top-28" aria-labelledby="order-summary-heading">
                <article className="rounded-[2rem] border p-6 md:p-8" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5', boxShadow: '0 12px 42px rgba(91, 30, 110, 0.12)' }}>
                  <h2 id="order-summary-heading" className="mb-6 text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
                    Delivery Details
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <p className="mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Customer</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{trackedOrder.customerName}</p>
                      <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>{trackedOrder.email}</p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Shipping Address</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', lineHeight: 1.7 }}>
                        {trackedOrder.shippingAddressLine}
                        <br />
                        {trackedOrder.city}, {trackedOrder.state} {trackedOrder.zipCode}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Order Placed</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{trackedOrder.orderPlacedAt}</p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Destination</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{trackedOrder.destinationCity}</p>
                    </div>
                  </div>
                </article>

                <article className="rounded-[2rem] border p-6 md:p-8" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8D5F5', boxShadow: '0 12px 42px rgba(91, 30, 110, 0.12)' }}>
                  <h2 className="mb-6 text-2xl" style={{ fontFamily: 'Playfair Display, serif', color: '#3B0D4A', fontWeight: 600 }}>
                    Order Items
                  </h2>

                  <ul className="mb-6 space-y-4" role="list">
                    {trackedOrder.items.map((item) => (
                      <li key={`${trackedOrder.orderNumber}-${item.id}`} className="flex gap-4 rounded-2xl p-3" style={{ backgroundColor: '#FAF7FF' }}>
                        <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" style={{ border: '2px solid #E8D5F5' }} />
                        <div className="min-w-0 flex-1">
                          <h3 className="product-title-wrap mb-1 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                            {item.name}
                          </h3>
                          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 600 }}>
                          {formatPKR(item.price * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <dl className="space-y-3 rounded-2xl p-5" style={{ backgroundColor: '#FAF7FF' }}>
                    <div className="flex justify-between">
                      <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Subtotal</dt>
                      <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{formatPKR(trackedOrder.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Delivery</dt>
                      <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{trackedOrder.shippingCost === 0 ? 'Free' : formatPKR(trackedOrder.shippingCost)}</dd>
                    </div>
                    {trackedOrder.tax > 0 && (
                      <div className="flex justify-between">
                        <dt style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>COD Tax (4%)</dt>
                        <dd style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>{formatPKR(trackedOrder.tax)}</dd>
                      </div>
                    )}
                    <hr style={{ borderColor: '#E8D5F5', borderWidth: '1px' }} />
                    <div className="flex justify-between">
                      <dt className="text-lg" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 600 }}>Total</dt>
                      <dd className="text-xl" style={{ fontFamily: 'Inter, sans-serif', color: '#3B0D4A', fontWeight: 700 }}>{formatPKR(trackedOrder.total)}</dd>
                    </div>
                  </dl>

                  <Link to="/track-order" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 transition-all hover:scale-[1.02]" style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(91, 30, 110, 0.24)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    <Package className="h-5 w-5" aria-hidden="true" />
                    Track Another Order
                  </Link>

                  <p className="mt-4 text-center text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', lineHeight: 1.7 }}>
                    Need help? Share your order ID with support for faster assistance.
                  </p>
                </article>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}