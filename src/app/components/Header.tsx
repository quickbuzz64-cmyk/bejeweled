import { Link, useLocation, useNavigate } from 'react-router';
import { ShoppingCart, Heart, Menu, X, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isNavigationLinkActive, mainNavigationLinks } from '../lib/navigation';
import { useAuthSession } from '../lib/auth';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/shop', label: 'Shop', exact: true },
  { to: '/about', label: 'About', exact: true },
  { to: '/contact', label: 'Contact', exact: true },
];

// keep isNavigationLinkActive in scope for any future use
void isNavigationLinkActive;
void mainNavigationLinks;

export function Header() {
  const store = useCartStore();
  const cartCount = store.itemCount();
  const wishlistStore = useWishlistStore();
  const wishlistCount = wishlistStore.itemCount();
  const navigate = useNavigate();

  const prevCountRef = useRef(cartCount);
  const [isPulsing, setIsPulsing] = useState(false);
  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 300);
      prevCountRef.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    void store.loadCart();
    store.initRealtime();
    return () => { store.disposeRealtime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void wishlistStore.loadWishlist();
    wishlistStore.initRealtime();
    return () => { wishlistStore.disposeRealtime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const authSession = useAuthSession();

  const accountDestination =
    authSession === undefined
      ? '/login'
      : authSession?.isAuthenticated
        ? '/dashboard'
        : '/login';

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isNavActive = (link: { to: string; exact: boolean }) =>
    link.exact
      ? location.pathname === link.to
      : location.pathname.startsWith(link.to.split('?')[0]) && link.to !== '/';

  return (
    <>
      {/* ── ANNOUNCEMENT BAR ──────────────────────────────────────── */}
      {announcementVisible && (
        <div
          style={{
            background: '#3B0D4A',
            color: '#FAF7FF',
            fontSize: '0.8125rem',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            padding: '8px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ flex: 1 }} />
          <span style={{ textAlign: 'center' }}>
            Free shipping on orders over PKR 3,000&nbsp;&nbsp;|&nbsp;&nbsp;Use code{' '}
            <strong>SAVE10</strong> for 10% off
          </span>
          <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setAnnouncementVisible(false)}
              aria-label="Dismiss announcement"
              style={{ background: 'none', border: 'none', color: '#FAF7FF', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px', opacity: 0.7 }}
            >&#x2715;</button>
          </span>
        </div>
      )}

      {/* ── MAIN HEADER ───────────────────────────────────────────── */}
      {/*
          Desktop layout (3-column grid):
            [Logo — extreme left]  [Search — centered]  [Actions — extreme right]
          Mobile layout (flex, hamburger on right):
            [Logo — left]  [Cart + Hamburger — right]
      */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #E8D5F5',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(91,30,110,0.06)',
        }}
      >
        {/* Desktop header — 3-column grid */}
        <div
          className="hidden md:grid"
          style={{
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '12px 48px',
            gap: '20px',
          }}
        >
          {/* Col 1 — Logo (extreme left) */}
          <Link to="/" style={{ textDecoration: 'none', justifySelf: 'start' }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.5rem', color: '#3B0D4A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              BEJEWELED
            </span>
          </Link>

          {/* Col 2 — Search (centered) */}
          <form
            onSubmit={handleSearch}
            style={{ display: 'flex', alignItems: 'center', background: '#F3EEF8', borderRadius: '6px', padding: '8px 16px', gap: '8px', width: '420px' }}
          >
            <Search size={16} color="#7A2891" strokeWidth={2} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rings, necklaces, bracelets..."
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', color: '#1A0A24', width: '100%', fontFamily: 'Inter, sans-serif' }}
            />
            <button
              type="submit"
              style={{ background: '#5B1E6E', color: 'white', borderRadius: '3px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}
            >&#10022; AI</button>
          </form>

          {/* Col 3 — Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifySelf: 'end' }}>
            {/* Wishlist */}
            <Link
              to="/wishlist"
              aria-label={`Wishlist (${wishlistCount} items)`}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Heart size={20} color="#5B1E6E" />
              {wishlistCount > 0 && (
                <span style={{ position: 'absolute', top: -7, right: -7, background: '#C9A84C', color: '#1A0A24', borderRadius: '9999px', width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" aria-label={`Shopping cart (${cartCount} items)`} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={20} color="#5B1E6E" />
              {cartCount > 0 && (
                <span
                  className={`transition-all duration-200 ${isPulsing ? 'scale-125' : 'scale-100'}`}
                  style={{ position: 'absolute', top: -7, right: -7, background: '#C9A84C', color: '#1A0A24', borderRadius: '9999px', width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {authSession !== undefined && (
              <>
                <Link
                  to={accountDestination}
                  style={{ fontSize: '0.875rem', color: '#3B0D4A', fontWeight: 500, textDecoration: 'none', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' as const }}
                >
                  {authSession?.isAuthenticated ? 'Dashboard' : 'Sign In'}
                </Link>

                {!authSession?.isAuthenticated && (
                  <Link
                    to="/register"
                    style={{ background: '#5B1E6E', color: 'white', borderRadius: '3px', padding: '8px 20px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif', border: 'none', whiteSpace: 'nowrap' as const }}
                  >Register</Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile header — flex layout */}
        <div
          className="flex md:hidden"
          style={{ alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', gap: '12px' }}
        >
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.25rem', color: '#3B0D4A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              BEJEWELED
            </span>
          </Link>

          {/* Mobile right: cart + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/cart" aria-label={`Shopping cart (${cartCount} items)`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ShoppingCart size={20} color="#5B1E6E" />
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: -7, right: -7, background: '#C9A84C', color: '#1A0A24', borderRadius: '9999px', width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#3B0D4A', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* ── CATEGORY NAV — desktop ────────────────────────────────── */}
      <nav
        className="hidden md:flex"
        style={{ background: '#3B0D4A', alignItems: 'center', justifyContent: 'center', padding: '0 48px', position: 'sticky', top: 65, zIndex: 99 }}
        aria-label="Primary navigation"
      >
        {NAV_LINKS.map((item) => {
          const active = isNavActive(item);
          return (
            <Link
              key={item.label}
              to={item.to}
              style={{
                color: active ? '#C9A84C' : 'rgba(250,247,255,0.8)',
                padding: '13px 22px',
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.06em',
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
                transition: 'color 0.15s',
                display: 'block',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = '#FAF7FF'; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = 'rgba(250,247,255,0.8)'; } }}
            >{item.label}</Link>
          );
        })}
      </nav>

      {/* ── MOBILE OVERLAY ────────────────────────────────────────── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── MOBILE SIDEBAR ────────────────────────────────────────── */}
      <aside
        id="mobile-navigation"
        className={`fixed top-0 left-0 h-full w-72 z-50 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#1A0A24' }}
        aria-label="Mobile navigation"
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.25rem', color: '#FAF7FF', letterSpacing: '0.08em' }}>BEJEWELED</span>
          <button onClick={() => setIsSidebarOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FAF7FF', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', padding: '8px 14px', gap: '8px' }}>
            <Search size={14} color="#C9A84C" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jewelry..."
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', color: '#FAF7FF', width: '100%', fontFamily: 'Inter, sans-serif' }}
            />
          </form>
        </div>

        <nav style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.7rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '12px' }}>Navigation</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {NAV_LINKS.map((item) => {
              const active = isNavActive(item);
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '3px', color: active ? '#C9A84C' : '#FAF7FF', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: active ? 600 : 400, background: active ? 'rgba(201,168,76,0.12)' : 'transparent', letterSpacing: '0.02em', borderLeft: active ? '2px solid #C9A84C' : '2px solid transparent', transition: 'background 0.15s' }}
                  >{item.label}</Link>
                </li>
              );
            })}
          </ul>

          <p style={{ fontSize: '0.7rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '12px' }}>Account</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <li><Link to="/wishlist" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '3px', color: '#FAF7FF', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.02em' }}><Heart size={16} style={{ color: '#C9A84C', flexShrink: 0 }} /> Wishlist {wishlistCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#C9A84C', fontWeight: 600 }}>({wishlistCount})</span>}</Link></li>
            <li><Link to="/cart" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '3px', color: '#FAF7FF', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.02em' }}><ShoppingCart size={16} style={{ color: '#C9A84C', flexShrink: 0 }} /> Cart {cartCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#C9A84C', fontWeight: 600 }}>({cartCount})</span>}</Link></li>
            <li><Link to={accountDestination} onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '3px', color: '#FAF7FF', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.02em' }}><User size={16} style={{ color: '#C9A84C', flexShrink: 0 }} /> {authSession?.isAuthenticated ? 'Dashboard' : 'Sign In'}</Link></li>
          </ul>

          {!authSession?.isAuthenticated && (
            <Link to="/register" onClick={() => setIsSidebarOpen(false)} style={{ display: 'block', textAlign: 'center', background: '#5B1E6E', color: 'white', borderRadius: '3px', padding: '12px 24px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em' }}>
              Create Account
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
