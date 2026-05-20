import { Link } from 'react-router';
import { Heart, Leaf, Sparkles } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { DynamicPageSeo } from '../components/PageSeo';

export default function About() {
  return (
    <div style={{ backgroundColor: '#FAF7FF', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <DynamicPageSeo entityType="page" entityId="about" fallbackTitle="About Us" fallbackDescription="Learn about Bejeweled — curated jewelry, artisan designs, and the story behind our brand." />
      <Header />

      <main>

        {/* ── Our Story — two-column ─────────────────────────────── */}
        <section style={{ background: 'white', padding: '72px 48px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }} className="about-cols">
              {/* Image column */}
              <div style={{ position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80"
                  alt="Model wearing elegant gold jewelry — rings and bracelet"
                  style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block', borderRadius: '4px' }}
                />
                <div style={{ position: 'absolute', bottom: '-18px', right: '-18px', width: '120px', height: '120px', border: '2px solid #C9A84C', borderRadius: '4px', zIndex: 0, pointerEvents: 'none' }} />
              </div>

              {/* Text column */}
              <div>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '12px', marginTop: 0 }}>EST. LAHORE, PAKISTAN</p>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, color: '#1A0A24', margin: '0 0 24px', lineHeight: 1.15 }}>
                  Our Story
                </h1>
                <p style={{ color: '#5B1E6E', fontSize: '1rem', lineHeight: 1.85, marginBottom: '20px', marginTop: 0 }}>
                  Bejeweled was born from a simple belief: that the everyday moments we cherish deserve beautiful, well-made jewelry at honest prices. We set out to build a curated destination where quality rings, necklaces, bracelets, and earrings are sourced from trusted suppliers and brought together in one thoughtful collection.
                </p>
                <p style={{ color: '#5B1E6E', fontSize: '1rem', lineHeight: 1.85, marginBottom: '32px', marginTop: 0 }}>
                  Today, every piece in our store is carefully selected for quality, aesthetics, and everyday wearability. We believe in making great jewelry accessible — sourcing pieces that bring elegance and beauty to your daily look. Every item is chosen to be cherished, not just worn.
                </p>

              </div>
            </div>
          </div>
        </section>

        {/* ── Thin gold rule ─────────────────────────────────────── */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C 40%, #C9A84C 60%, transparent)' }} />

        {/* ── What We Stand For ─────────────────────────────────── */}
        <section style={{ padding: '80px 48px', backgroundColor: '#FAF7FF' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '10px', marginTop: 0 }}>OUR VALUES</p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 600, color: '#1A0A24', margin: 0 }}>
                What We Stand For
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: '#E8D5F5' }} className="values-grid">
              {/* Carefully Selected */}
              <article style={{ background: 'white', padding: '44px 36px' }}>
                <div style={{ width: '44px', height: '44px', border: '1px solid #E8D5F5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Heart size={20} color="#5B1E6E" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', fontWeight: 600, color: '#1A0A24', marginBottom: '12px', marginTop: 0 }}>Carefully Selected</h3>
                <p style={{ color: '#6B4F7A', fontSize: '0.9rem', lineHeight: 1.8, margin: 0 }}>
                  Every piece is hand-picked from trusted suppliers for consistent quality and aesthetic appeal. We curate so you can shop with complete confidence.
                </p>
              </article>

              {/* Sustainable */}
              <article style={{ background: 'white', padding: '44px 36px' }}>
                <div style={{ width: '44px', height: '44px', border: '1px solid #E8D5F5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Leaf size={20} color="#5B1E6E" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', fontWeight: 600, color: '#1A0A24', marginBottom: '12px', marginTop: 0 }}>Responsibly Sourced</h3>
                <p style={{ color: '#6B4F7A', fontSize: '0.9rem', lineHeight: 1.8, margin: 0 }}>
                  We are committed to transparent supply chains and minimising our environmental footprint — from the materials we source to the packaging we use.
                </p>
              </article>

              {/* Aesthetic */}
              <article style={{ background: 'white', padding: '44px 36px' }}>
                <div style={{ width: '44px', height: '44px', border: '1px solid #E8D5F5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Sparkles size={20} color="#5B1E6E" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', fontWeight: 600, color: '#1A0A24', marginBottom: '12px', marginTop: 0 }}>Timeless Design</h3>
                <p style={{ color: '#6B4F7A', fontSize: '0.9rem', lineHeight: 1.8, margin: 0 }}>
                  Beautiful design is not a luxury — it's essential. Our aesthetic philosophy celebrates the quiet elegance of well-made pieces that endure across seasons.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section style={{ background: '#1A0A24', padding: '80px 48px', textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '16px', marginTop: 0 }}>THE BEJEWELED COMMUNITY</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 600, color: '#FFFFFF', marginBottom: '18px', marginTop: 0 }}>
              Jewellery that Tells Your Story
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.975rem', lineHeight: 1.75, marginBottom: '36px', marginTop: 0 }}>
              Discover pieces that transform the everyday into something extraordinary. Crafted for those who appreciate quiet luxury.
            </p>
            <Link
              to="/shop"
              style={{ display: 'inline-block', background: '#C9A84C', color: '#1A0A24', textDecoration: 'none', padding: '14px 40px', borderRadius: '3px', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}
            >
              Explore the Collection
            </Link>
          </div>
        </section>

      </main>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .about-cols { grid-template-columns: 1fr !important; gap: 40px !important; }
          .values-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
