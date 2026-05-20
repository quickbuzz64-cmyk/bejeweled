import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Package, Heart, LayoutDashboard, LogOut, ChevronRight, Menu, X } from 'lucide-react';
import { formatPKR } from '../lib/pricing';
import { showErrorToast, showSuccessToast } from '../lib/notifications';
import { signOut, useAuthSession } from '../lib/auth';
import { PageSeo } from '../components/PageSeo';
import { getUserOrdersFromSupabase, type TrackedOrder } from '../lib/orderTracking';
import { getSupabaseClient } from '../lib/supabase';
import { useWishlist } from '../lib/wishlist';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import type { DashboardView, DashboardOrder, OrderStatus } from '../types';
import { Skeleton } from '../components/ui/skeleton';

function mapTrackedToOrder(tracked: TrackedOrder): DashboardOrder {
  const statusMap: Record<string, OrderStatus> = {
    Confirmed: 'Processing',
    Packed: 'Processing',
    'In Transit': 'Shipped',
    'Out for Delivery': 'Shipped',
    Delivered: 'Delivered',
  };
  return {
    id: tracked.orderNumber,
    orderNumber: `#${tracked.orderNumber}`,
    date: tracked.orderPlacedAt || tracked.estimatedDelivery || '',
    status: statusMap[tracked.status] ?? 'Processing',
    total: tracked.total,
    items: tracked.items?.length ?? 0,
  };
}

const VALID_TABS: DashboardView[] = ['overview', 'orders', 'wishlist'];

const statusBadge = (status: DashboardOrder['status']) => {
  switch (status) {
    case 'Delivered': return { bg: '#F0FBF0', text: '#1A4A1A', border: '#A8D8A8' };
    case 'Shipped':   return { bg: '#EDF5FF', text: '#1A2E4A', border: '#A8C8F0' };
    case 'Processing':return { bg: '#FFFBEC', text: '#4A3A00', border: '#E0C860' };
    case 'Cancelled': return { bg: '#FFF0F0', text: '#4A1A1A', border: '#E0A8A8' };
    default:          return { bg: '#F5F5F5', text: '#444',    border: '#DDD'     };
  }
};

const NAV_TABS: { view: DashboardView; label: string; Icon: React.ElementType }[] = [
  { view: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
  { view: 'orders',   label: 'My Orders', Icon: Package },
  { view: 'wishlist', label: 'Wishlist',  Icon: Heart },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as DashboardView | null;
  const currentView: DashboardView = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'overview';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authSession = useAuthSession();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const { items: wishlistItems, loading: wishlistLoading } = useWishlist();
  const cartStore = useCartStore();
  const wishlistStore = useWishlistStore();

  const goTo = (view: DashboardView) => {
    if (view === 'overview') {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ tab: view }, { replace: false });
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!authSession?.isAuthenticated) return;

    async function loadOrders() {
      try {
        const tracked = await getUserOrdersFromSupabase();
        setOrders(tracked.map(mapTrackedToOrder));
      } catch (err) {
        setOrders([]);
        showErrorToast('Orders', err instanceof Error ? err.message : 'Failed to load orders.');
      } finally {
        setOrdersLoading(false);
      }
    }

    void loadOrders();

    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel('dashboard-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => { void loadOrders(); })
        .subscribe();
    });

    return () => { if (channel) void supabase.removeChannel(channel); };
  }, [authSession]);

  const handleLogout = async () => {
    await signOut();
    showSuccessToast('Signed out.', 'See you next time.');
    navigate('/');
  };

  if (!authSession?.isAuthenticated) return null;

  const fullName = [authSession.firstName, authSession.lastName].filter(Boolean).join(' ');

  const tabLabel: Record<DashboardView, string> = {
    overview: 'Dashboard',
    orders:   'My Orders',
    wishlist: 'Wishlist',
  };

  const card: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8D5F5',
    borderRadius: '4px',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7FF', fontFamily: 'Inter, sans-serif' }}>
      <PageSeo title={tabLabel[currentView]} />

      {/* ── TOP HEADER NAV ─────────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8D5F5',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(91,30,110,0.05)',
        }}
      >
        {/* Desktop */}
        <div
          className="hidden md:flex"
          style={{ alignItems: 'center', padding: '0 40px', height: '62px' }}
        >
          {/* Left: brand + back to store */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
            <Link
              to="/"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: '#1A0A24',
                letterSpacing: '0.1em',
                textDecoration: 'none',
              }}
            >
              BEJEWELED
            </Link>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#E8D5F5' }} />
            <Link
              to="/shop"
              style={{ fontSize: '0.8125rem', color: '#6B4F7A', textDecoration: 'none', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#3B0D4A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6B4F7A'; }}
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Center: tab navigation */}
          <nav
            aria-label="Dashboard navigation"
            style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
          >
            {NAV_TABS.map(({ view, label, Icon }) => {
              const active = currentView === view;
              return (
                <button
                  key={view}
                  onClick={() => goTo(view)}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '0 22px',
                    height: '62px',
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? '2px solid #5B1E6E' : '2px solid transparent',
                    color: active ? '#3B0D4A' : '#6B4F7A',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    letterSpacing: '0.01em',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#3B0D4A'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#6B4F7A'; }}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right: track order + user info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            <Link
              to="/track-order"
              style={{ fontSize: '0.8125rem', color: '#6B4F7A', textDecoration: 'none', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#3B0D4A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6B4F7A'; }}
            >
              <Package size={14} aria-hidden="true" />
              Track Order
            </Link>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#E8D5F5' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1A0A24', margin: 0, lineHeight: 1.3 }}>
                  {fullName || authSession.firstName}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#9B8FAA', margin: 0, lineHeight: 1.3 }}>
                  {authSession.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid #E8D5F5',
                  borderRadius: '3px',
                  color: '#6B4F7A',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF7FF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <LogOut size={14} aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile row */}
        <div
          className="flex md:hidden"
          style={{ alignItems: 'center', padding: '0 20px', height: '56px', justifyContent: 'space-between' }}
        >
          <Link
            to="/"
            style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', color: '#1A0A24', letterSpacing: '0.1em', textDecoration: 'none' }}
          >
            BEJEWELED
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B4F7A', fontFamily: 'Inter, sans-serif' }}>
              {authSession.firstName}
            </span>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B0D4A', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div
            className="flex flex-col md:hidden"
            style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8D5F5', padding: '8px 20px 16px', gap: '2px' }}
          >
            {NAV_TABS.map(({ view, label, Icon }) => {
              const active = currentView === view;
              return (
                <button
                  key={view}
                  onClick={() => goTo(view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 12px',
                    background: active ? '#F3EEF8' : 'none',
                    border: 'none',
                    borderRadius: '3px',
                    borderLeft: active ? '2px solid #5B1E6E' : '2px solid transparent',
                    color: active ? '#3B0D4A' : '#6B4F7A',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
            <div style={{ margin: '8px 0', height: '1px', backgroundColor: '#E8D5F5' }} />
            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', color: '#6B4F7A', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}
            >
              <Package size={16} aria-hidden="true" />
              Track Order
            </Link>
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', background: 'none', border: 'none', borderRadius: '3px', color: '#6B4F7A', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
            >
              <LogOut size={16} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }} className="sm:px-8 lg:px-12">

          {/* ──────────────── OVERVIEW ──────────────────────────────────── */}
          {currentView === 'overview' && (
            <section aria-labelledby="dashboard-heading">
              <header style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>MY ACCOUNT</p>
                <h1 id="dashboard-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 8px', lineHeight: 1.2 }}>
                  Welcome back, {authSession.firstName}
                </h1>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', margin: 0 }}>Here's an overview of your account activity.</p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Orders',  value: ordersLoading ? '—' : String(orders.length) },
                  { label: 'Wishlist Items', value: String(wishlistItems.length) },
                  { label: 'Total Spent',   value: ordersLoading ? '—' : formatPKR(orders.reduce((s, o) => s + o.total, 0)) },
                ].map(({ label, value }) => (
                  <article key={label} style={{ ...card, padding: '20px 24px' }}>
                    <p style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 6px' }}>{label}</p>
                    <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.75rem', color: '#1A0A24', fontWeight: 600, margin: 0, lineHeight: 1 }}>{value}</p>
                  </article>
                ))}
              </div>

              <div style={{ ...card, padding: '28px 28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Recent Orders</h2>
                  <button onClick={() => goTo('orders')} style={{ background: 'none', border: 'none', color: '#5B1E6E', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                    View all →
                  </button>
                </div>

                {ordersLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[1, 2, 3].map((n) => (
                      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: n < 3 ? '1px solid #F0E8F8' : 'none' }}>
                        <Skeleton style={{ height: '14px', width: '80px', borderRadius: '2px', backgroundColor: '#EEE' }} />
                        <Skeleton style={{ height: '14px', width: '60px', borderRadius: '2px', backgroundColor: '#EEE' }} />
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Package size={32} style={{ color: '#E8D5F5', margin: '0 auto 10px' }} aria-hidden="true" />
                    <p style={{ color: '#9B8FAA', fontSize: '0.875rem', margin: '0 0 16px' }}>No orders placed yet.</p>
                    <Link to="/shop" style={{ display: 'inline-block', backgroundColor: '#5B1E6E', color: '#FFFFFF', padding: '8px 20px', borderRadius: '3px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                      Shop Now
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {orders.slice(0, 4).map((order, i) => {
                      const sc = statusBadge(order.status);
                      return (
                        <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < Math.min(3, orders.length - 1) ? '1px solid #F0E8F8' : 'none', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontWeight: 600, color: '#1A0A24', fontSize: '0.875rem', margin: '0 0 2px' }}>{order.orderNumber}</p>
                            <p style={{ color: '#9B8FAA', fontSize: '0.75rem', margin: 0 }}>{order.date} · {order.items} {order.items === 1 ? 'item' : 'items'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: '3px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 500 }}>
                              {order.status}
                            </span>
                            <p style={{ fontWeight: 700, color: '#1A0A24', fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap' }}>{formatPKR(order.total)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ──────────────── MY ORDERS ─────────────────────────────────── */}
          {currentView === 'orders' && (
            <section aria-labelledby="orders-heading">
              <header style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>HISTORY</p>
                <h1 id="orders-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 6px', lineHeight: 1.2 }}>
                  My Orders
                </h1>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', margin: 0 }}>
                  {ordersLoading ? 'Loading…' : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} placed`}
                </p>
              </header>

              {!ordersLoading && orders.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Total Orders',  value: String(orders.length) },
                    { label: 'Total Spent',   value: formatPKR(orders.reduce((s, o) => s + o.total, 0)) },
                    { label: 'Active Orders', value: String(orders.filter((o) => o.status === 'Processing' || o.status === 'Shipped').length) },
                  ].map(({ label, value }) => (
                    <article key={label} style={{ ...card, padding: '16px 20px' }}>
                      <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 4px' }}>{label}</p>
                      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#1A0A24', fontWeight: 600, margin: 0, lineHeight: 1 }}>{value}</p>
                    </article>
                  ))}
                </div>
              )}

              <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse' }} role="table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E8D5F5', backgroundColor: '#FAF7FF' }}>
                      {['Order', 'Date', 'Status', 'Total', ''].map((h, i) => (
                        <th key={i} scope="col" style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6B4F7A', fontWeight: 600, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                          {h || <span className="sr-only">Actions</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ordersLoading
                      ? [1, 2, 3].map((n) => (
                        <tr key={n} style={{ borderBottom: '1px solid #F0E8F8' }}>
                          {[80, 96, 64, 56, 72].map((w, i) => (
                            <td key={i} style={{ padding: '16px 20px' }}>
                              <Skeleton style={{ height: '14px', width: `${w}px`, borderRadius: '2px', backgroundColor: '#F0E8F8' }} />
                            </td>
                          ))}
                        </tr>
                      ))
                      : orders.map((order, idx) => {
                        const sc = statusBadge(order.status);
                        return (
                          <tr key={order.id} style={{ borderBottom: idx < orders.length - 1 ? '1px solid #F0E8F8' : 'none' }}>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1A0A24', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}>{order.orderNumber}</td>
                            <td style={{ padding: '16px 20px', color: '#6B4F7A', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{order.date}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: '3px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }} role="status" aria-label={`Status: ${order.status}`}>
                                {order.status}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1A0A24', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{formatPKR(order.total)}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <Link to={`/track-order/${order.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#5B1E6E', color: '#FFFFFF', padding: '6px 12px', borderRadius: '3px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }} aria-label={`View details for ${order.orderNumber}`}>
                                Details <ChevronRight size={13} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>

                {!ordersLoading && orders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                    <Package size={40} style={{ color: '#E8D5F5', margin: '0 auto 12px' }} aria-hidden="true" />
                    <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600, fontSize: '1.25rem', margin: '0 0 8px' }}>No orders yet</h3>
                    <p style={{ color: '#9B8FAA', fontSize: '0.875rem', margin: '0 0 20px' }}>Start exploring the collection</p>
                    <Link to="/shop" style={{ display: 'inline-block', backgroundColor: '#5B1E6E', color: '#FFFFFF', padding: '10px 24px', borderRadius: '3px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Shop Now</Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ──────────────── WISHLIST ──────────────────────────────────── */}
          {currentView === 'wishlist' && (
            <section aria-labelledby="wishlist-heading">
              <header style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>SAVED</p>
                <h1 id="wishlist-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 6px', lineHeight: 1.2 }}>
                  My Wishlist
                </h1>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', margin: 0 }}>
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
                </p>
              </header>

              {wishlistLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} style={{ ...card, display: 'flex', gap: '14px', padding: '16px' }}>
                      <Skeleton style={{ height: '72px', width: '72px', flexShrink: 0, borderRadius: '3px', backgroundColor: '#F0E8F8' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                        <Skeleton style={{ height: '13px', width: '70%', borderRadius: '2px', backgroundColor: '#EEE' }} />
                        <Skeleton style={{ height: '13px', width: '35%', borderRadius: '2px', backgroundColor: '#F0E8F8' }} />
                        <Skeleton style={{ height: '28px', width: '90px', borderRadius: '3px', backgroundColor: '#EEE' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : wishlistItems.length === 0 ? (
                <div style={{ ...card, padding: '64px 24px', textAlign: 'center' }}>
                  <Heart size={40} style={{ color: '#E8D5F5', margin: '0 auto 12px' }} aria-hidden="true" />
                  <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600, fontSize: '1.25rem', margin: '0 0 8px' }}>Wishlist is empty</h3>
                  <p style={{ color: '#9B8FAA', fontSize: '0.875rem', margin: '0 0 20px' }}>Save pieces you love to revisit them anytime</p>
                  <Link to="/shop" style={{ display: 'inline-block', backgroundColor: '#5B1E6E', color: '#FFFFFF', padding: '10px 24px', borderRadius: '3px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Browse Collection</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlistItems.map((item) => (
                    <article key={item.id} style={{ ...card, display: 'flex', gap: '14px', padding: '16px', position: 'relative' }}>
                      <Link to={`/product/${item.productId}`} style={{ flexShrink: 0 }}>
                        <img src={item.image} alt={item.name} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #E8D5F5', display: 'block' }} />
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/product/${item.productId}`} style={{ textDecoration: 'none' }}>
                          <h3 style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.875rem', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h3>
                        </Link>
                        <p style={{ color: '#3B0D4A', fontWeight: 700, fontSize: '0.9375rem', margin: '0 0 10px' }}>{formatPKR(item.price)}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => cartStore.addItem(item.productId, 1, { name: item.name, price: item.price, image: item.image }).then(() => showSuccessToast('Added to cart', item.name)).catch((err: unknown) => showErrorToast('Cart error', err instanceof Error ? err.message : 'Failed to add to cart.'))}
                            style={{ padding: '6px 12px', backgroundColor: '#5B1E6E', color: '#FFFFFF', border: 'none', borderRadius: '3px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => wishlistStore.removeItem(item.id).catch((err: unknown) => showErrorToast('Wishlist', err instanceof Error ? err.message : 'Failed to remove.'))}
                            style={{ padding: '6px 10px', background: 'none', color: '#9B8FAA', border: '1px solid #E8D5F5', borderRadius: '3px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
