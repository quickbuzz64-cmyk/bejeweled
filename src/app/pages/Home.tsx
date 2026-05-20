import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useProducts } from '../hooks/useProducts';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton';
import { showInfoToast, showSuccessToast, showErrorToast } from '../lib/notifications';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { PageSeo } from '../components/PageSeo';
import type { ProductCard } from '../types';

// ── Hero images (Unsplash, optimised) ────────────────────────────────────────

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1573408301185-9519f94815e4?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=1600&q=80',
];

// ── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: 'Bilal Chaudhry', quote: 'Bought a gold necklace for my wife on our anniversary. She absolutely loved it. The quality is excellent and delivery was faster than expected!', stars: 5, date: '2 days ago' },
  { name: 'Sana Mirza', quote: 'Bejeweled ne do baar khareedi chuki hoon aur dono baar experience bohat acha raha. Jewelry ka kaam bohat zyada refined hai — poore paison se value mili hai.', stars: 5, date: '1 week ago' },
  { name: 'Fatima Noor', quote: 'Eid par bracelet liya tha — unki aankhein khushi se chamak uthi. Packaging bhi bahut mehanati se ki hui thi aur gift wrap ne toh dil jeet liya.', stars: 4, date: '3 weeks ago' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#7A2891', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>
      {children}
    </p>
  );
}

// ── Star display ──────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 24 24" fill={n <= count ? '#C9A84C' : 'none'} stroke="#C9A84C" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: products, error, loading } = useProducts({ featuredOnly: true, limit: 8 });
  const wishlistStore = useWishlistStore();
  const cartStore = useCartStore();
  const navigate = useNavigate();
  void navigate;

  // Hero carousel
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Newsletter
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);

  const handleWishlist = async (productId: string, productName: string) => {
    try {
      if (wishlistStore.isInWishlist(productId)) {
        showInfoToast('Already in wishlist', `${productName} is already saved to your wishlist.`);
        return;
      }
      await wishlistStore.addItem(productId);
      showSuccessToast('Saved to wishlist', `${productName} has been added to your wishlist.`);
    } catch (err) {
      showErrorToast('Wishlist error', err instanceof Error ? err.message : 'Unable to add to wishlist.');
    }
  };

  const handleAddToCart = async (productId: string, productName: string, price: number, image: string, stock: number) => {
    try {
      await cartStore.addItem(productId, 1, { name: productName, price, image, stock });
      showSuccessToast('Added to cart', `${productName} is ready for checkout.`);
    } catch (err) {
      showErrorToast('Cart error', err instanceof Error ? err.message : 'Unable to add item to cart.');
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7FF', minHeight: '100vh' }}>
      <PageSeo title="Home" />
      <Header />

      <main>

        {/* ═══════════════════════════════════════════════════════
            HERO CAROUSEL
        ═══════════════════════════════════════════════════════ */}
        <section
          aria-label="Hero"
          style={{ position: 'relative', overflow: 'hidden', height: '520px' }}
        >
          {/* Slides */}
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: i === heroIdx ? 1 : 0,
                transition: 'opacity 0.9s ease',
                pointerEvents: i === heroIdx ? 'auto' : 'none',
              }}
            >
              <img
                src={src}
                alt="Bejeweled luxury jewelry"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(26,10,36,0.78) 40%, rgba(26,10,36,0.18) 100%)' }} />
            </div>
          ))}

          {/* Hero content */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(24px, 5vw, 80px)', zIndex: 1 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#C9A84C', fontWeight: 600, marginBottom: '16px', marginTop: 0 }}>
              ✦ LUXURY COLLECTION 2026
            </p>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 3.75rem)', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '20px', marginTop: 0, maxWidth: 520 }}>
              Timeless Luxury,<br />Crafted for You
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', color: 'rgba(255,255,255,0.85)', maxWidth: 400, lineHeight: 1.7, marginBottom: '32px', marginTop: 0 }}>
              Discover our exquisite collection of handcrafted jewelry — each piece a testament to elegance, passion, and artistry.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/shop" style={{ background: 'white', color: '#5B1E6E', borderRadius: '2px', padding: '12px 28px', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                Shop Collection
              </Link>
              <Link to="/shop" style={{ background: 'transparent', color: 'white', border: '1.5px solid white', borderRadius: '2px', padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                New Arrivals
              </Link>
            </div>
          </div>

          {/* Prev/Next arrows */}
          <button
            onClick={() => setHeroIdx((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)}
            aria-label="Previous slide"
            style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '3px', width: 44, height: 44, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length)}
            aria-label="Next slide"
            style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '3px', width: 44, height: 44, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight size={22} />
          </button>

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 2 }}>
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{ width: i === heroIdx ? 24 : 8, height: 4, borderRadius: '2px', background: i === heroIdx ? '#C9A84C' : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FEATURED COLLECTION
        ═══════════════════════════════════════════════════════ */}
        <section style={{ background: 'white', padding: '64px 48px' }} aria-labelledby="featured-heading">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <SectionLabel>CURATED FOR YOU</SectionLabel>
                <h2 id="featured-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', fontWeight: 600, color: '#1A0A24', margin: 0 }}>Featured Collection</h2>
              </div>
              <Link to="/shop" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#5B1E6E', textDecoration: 'none', fontWeight: 500 }}>View all &rarr;</Link>
            </div>
            {loading ? (
              <ProductGridSkeleton count={4} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" />
            ) : error ? (
              <p style={{ color: '#5B1E6E', fontFamily: 'Inter, sans-serif' }}>{error}</p>
            ) : (
              <ProductGrid products={products.slice(0, 4)} onWishlist={handleWishlist} onAddToCart={handleAddToCart} isWishlisted={(id) => wishlistStore.isInWishlist(id)} />
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TESTIMONIALS
        ═══════════════════════════════════════════════════════ */}
        <section style={{ background: '#FAF7FF', padding: '64px 48px' }} aria-labelledby="testimonials-heading">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <SectionLabel>HAPPY CLIENTS</SectionLabel>
              <h2 id="testimonials-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', fontWeight: 600, color: '#1A0A24', margin: 0 }}>What Our Customers Say</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {TESTIMONIALS.map((t) => (
                <div key={t.name} style={{ background: 'white', borderRadius: '3px', padding: '28px', border: '1px solid #E8D5F5', boxShadow: '0 2px 16px rgba(91,30,110,0.06)', borderLeft: '3px solid #5B1E6E' }}>
                  <StarRow count={t.stars} />
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#3B0D4A', lineHeight: 1.7, marginBottom: '20px', marginTop: 0, fontStyle: 'italic' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #F0E8F8', paddingTop: '16px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '3px', background: '#5B1E6E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                    <div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#1A0A24', margin: 0 }}>{t.name}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#9B8FAA', margin: 0 }}>{t.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            NEWSLETTER
        ═══════════════════════════════════════════════════════ */}
        <section style={{ background: '#5B1E6E', padding: '72px 48px', textAlign: 'center' }} aria-label="Newsletter signup">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Mail size={32} color="rgba(255,255,255,0.9)" />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', fontWeight: 700, color: 'white', marginBottom: '12px', marginTop: 0 }}>Join the Bejeweled Circle</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: '28px', marginTop: 0 }}>
              Subscribe for early access to new collections, exclusive members-only discounts, and curated styling inspiration.
            </p>
            {newsletterDone ? (
              <p style={{ color: '#C9A84C', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '1rem' }}>Subscribed — welcome to the circle.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNewsletterDone(true);
                  setNewsletterEmail('');
                  setTimeout(() => setNewsletterDone(false), 5000);
                }}
                style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  style={{ background: 'white', border: 'none', borderRadius: '2px', padding: '12px 20px', fontSize: '0.875rem', color: '#1A0A24', width: 280, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                />
                <button
                  type="submit"
                  style={{ background: '#C9A84C', color: '#1A0A24', border: 'none', borderRadius: '2px', padding: '12px 24px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  Subscribe
                </button>
              </form>
            )}
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '16px', marginBottom: 0 }}>No spam, ever. Unsubscribe at any time.</p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

type ProductGridProps = {
  products: ProductCard[];
  onWishlist: (id: string, name: string) => void;
  onAddToCart: (id: string, name: string, price: number, image: string, stock: number) => void;
  isWishlisted: (id: string) => boolean;
};

function ProductGrid({ products, onWishlist, onAddToCart, isWishlisted }: ProductGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
      {products.map((p) => (
        <ProductCardItem
          key={p.id}
          product={p}
          onWishlist={onWishlist}
          onAddToCart={onAddToCart}
          isWishlisted={isWishlisted(p.id)}
        />
      ))}
    </div>
  );
}

type ProductCardItemProps = {
  product: ProductCard;
  onWishlist: (id: string, name: string) => void;
  onAddToCart: (id: string, name: string, price: number, image: string, stock: number) => void;
  isWishlisted: boolean;
};

const PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80';

function ProductCardItem({ product, onWishlist, onAddToCart, isWishlisted }: ProductCardItemProps) {
  const [hovered, setHovered] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '3px',
        overflow: 'hidden',
        border: '1px solid #E8D5F5',
        boxShadow: hovered ? '0 12px 32px rgba(91,30,110,0.14)' : '0 2px 12px rgba(91,30,110,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#F3EEF8' }}>
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image || PRODUCT_FALLBACK}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PRODUCT_FALLBACK; }}
          />
        </Link>
        <button
          onClick={() => onWishlist(product.id, product.name)}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{ position: 'absolute', top: 10, right: 10, background: 'white', border: 'none', borderRadius: '3px', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Heart size={16} fill={isWishlisted ? '#5B1E6E' : 'none'} color={isWishlisted ? '#5B1E6E' : '#9B8FAA'} />
        </button>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {product.category && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A2891', marginBottom: '4px', marginTop: 0 }}>{product.category}</p>
        )}
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 500, color: '#1A0A24', lineHeight: 1.3, marginBottom: '6px', marginTop: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{product.name}</h3>
        </Link>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', fontWeight: 700, color: '#5B1E6E', marginBottom: '12px', marginTop: 0 }}>{product.formattedPrice}</p>
        <button
          onClick={() => !outOfStock && onAddToCart(product.id, product.name, product.price, product.image, product.stock)}
          disabled={outOfStock}
          style={{ width: '100%', padding: '10px', background: outOfStock ? '#E8D5F5' : '#5B1E6E', color: outOfStock ? '#9B8FAA' : 'white', border: 'none', borderRadius: '3px', fontSize: '0.875rem', fontWeight: 600, cursor: outOfStock ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s' }}
          onMouseEnter={(e) => { if (!outOfStock) e.currentTarget.style.background = '#3B0D4A'; }}
          onMouseLeave={(e) => { if (!outOfStock) e.currentTarget.style.background = '#5B1E6E'; }}
        >
          {outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
