import { Link } from 'react-router';
import { useState } from 'react';
import { MapPin, Phone, Mail, Instagram, ArrowRight } from 'lucide-react';

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/blog', label: 'Blog' },
];

const SERVICE_LINKS = [
  { to: '/faq', label: 'FAQ' },
  { to: '/terms', label: 'Shipping Policy' },
  { to: '/terms', label: 'Return Policy' },
  { to: '/track-order', label: 'Track Order' },
  { to: '/contact', label: 'Contact Us' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  return (
    <footer style={{ background: '#1A0A24', fontFamily: 'Inter, sans-serif' }}>

      {/* ── MAIN FOOTER COLUMNS ───────────────────────────────────── */}
      <div style={{ padding: '60px 48px 48px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '48px' }}>

          {/* Col 1 — Brand */}
          <div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.5rem', color: '#FAF7FF', letterSpacing: '0.08em' }}>
              BEJEWELED
            </span>
            <p style={{ color: '#E8D5F5', fontSize: '0.875rem', lineHeight: 1.7, marginTop: '16px', marginBottom: '24px', opacity: 0.8 }}>
              Exquisite jewelry for every occasion — crafted with passion, worn with pride. Each piece tells your unique story.
            </p>
            {/* Social icons — Instagram only (+ WhatsApp handled in Get In Touch) */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{ width: 36, height: 36, borderRadius: '3px', background: '#2D0A3E', color: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#5B1E6E'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2D0A3E'; }}
              >
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Col 2 — Quick Links */}
          <div>
            <h3 style={{ color: '#FAF7FF', fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {QUICK_LINKS.map((link) => (
                <li key={link.to + link.label}>
                  <Link
                    to={link.to}
                    onClick={scrollTop}
                    style={{ color: '#E8D5F5', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.8, transition: 'opacity 0.2s, color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C9A84C'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.color = '#E8D5F5'; }}
                  >{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Customer Service */}
          <div>
            <h3 style={{ color: '#FAF7FF', fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>Customer Service</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SERVICE_LINKS.map((link) => (
                <li key={link.to + link.label}>
                  <Link
                    to={link.to}
                    onClick={scrollTop}
                    style={{ color: '#E8D5F5', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.8, transition: 'opacity 0.2s, color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C9A84C'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.color = '#E8D5F5'; }}
                  >{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Get In Touch */}
          <div>
            <h3 style={{ color: '#FAF7FF', fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>Get In Touch</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#E8D5F5', fontSize: '0.875rem' }}>
              <p style={{ opacity: 0.8, display: 'flex', gap: '10px', alignItems: 'flex-start', margin: 0 }}>
                <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#C9A84C' }} />
                <span>Bahria Town, Commercial Block C, Lahore, Pakistan</span>
              </p>
              <p style={{ opacity: 0.8, display: 'flex', gap: '10px', alignItems: 'center', margin: 0 }}>
                <Phone size={15} style={{ flexShrink: 0, color: '#C9A84C' }} />
                <a href="tel:+923107700470" style={{ color: '#E8D5F5', textDecoration: 'none' }}>+92 310 7700470</a>
              </p>
              <p style={{ opacity: 0.8, display: 'flex', gap: '10px', alignItems: 'center', margin: 0 }}>
                <Mail size={15} style={{ flexShrink: 0, color: '#C9A84C' }} />
                <a href="mailto:hello@bejeweled.store" style={{ color: '#E8D5F5', textDecoration: 'none' }}>hello@bejeweled.store</a>
              </p>
              <p style={{ opacity: 0.8, display: 'flex', gap: '10px', alignItems: 'center', margin: 0 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="#25D366" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                <a href="https://wa.me/923053048318" target="_blank" rel="noopener noreferrer" style={{ color: '#E8D5F5', textDecoration: 'none' }}>WhatsApp Us</a>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── NEWSLETTER STRIP ──────────────────────────────────────── */}
      <div style={{ background: '#2D0A3E', padding: '40px 48px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ color: '#FAF7FF', fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '6px', marginTop: 0 }}>
              Stay in the Loop
            </p>
            <p style={{ color: '#E8D5F5', fontSize: '0.875rem', opacity: 0.8, maxWidth: '400px', lineHeight: 1.6, margin: 0 }}>
              New arrivals, exclusive offers, and jewelry care tips — straight to your inbox.
            </p>
          </div>
          {subscribed ? (
            <p style={{ color: '#C9A84C', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem' }}>Subscribed — welcome to the circle.</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                style={{ background: 'white', border: 'none', borderRadius: '2px', padding: '12px 20px', fontSize: '0.875rem', color: '#1A0A24', width: 240, outline: 'none', fontFamily: 'Inter, sans-serif' }}
              />
              <button
                type="submit"
                style={{ background: '#C9A84C', color: '#1A0A24', border: 'none', borderRadius: '2px', padding: '12px 20px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowRight size={14} />
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR ────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 48px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: '#E8D5F5', fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>&copy; Bejeweled All Rights Reserved</p>
          <span style={{ color: '#E8D5F5', fontSize: '0.8rem', opacity: 0.6 }}>Cash on Delivery Only</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/privacy" style={{ color: '#E8D5F5', textDecoration: 'none', fontSize: '0.8rem', opacity: 0.6 }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#E8D5F5', textDecoration: 'none', fontSize: '0.8rem', opacity: 0.6 }}>Terms of Service</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
