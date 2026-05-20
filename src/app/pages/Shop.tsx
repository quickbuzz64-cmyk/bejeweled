import { Heart, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton';
import { showInfoToast, showSuccessToast, showErrorToast } from '../lib/notifications';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { PageSeo } from '../components/PageSeo';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80';

export default function Shop() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, error, loading } = useProducts();
  const wishlistStore = useWishlistStore();
  const cartStore = useCartStore();

  const handleWishlist = async (productId: string, productName: string) => {
    try {
      if (wishlistStore.isInWishlist(productId)) {
        showInfoToast('Already in wishlist', `${productName} is already saved.`);
        return;
      }
      await wishlistStore.addItem(productId);
      showSuccessToast('Saved to wishlist', `${productName} has been added to your wishlist.`);
    } catch (error) {
      showErrorToast('Wishlist error', error instanceof Error ? error.message : 'Unable to add to wishlist.');
    }
  };

  const handleAddToCart = async (productId: string, productName: string, price: number, image: string, stock: number) => {
    try {
      await cartStore.addItem(productId, 1, { name: productName, price, image, stock });
      showSuccessToast('Added to cart', `${productName} is ready for checkout.`);
    } catch (error) {
      showErrorToast('Cart error', error instanceof Error ? error.message : 'Unable to add item to cart.');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const outOfStock = (stock: number) => stock <= 0;

  return (
    <div style={{ backgroundColor: '#FAF7FF', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <PageSeo title="Shop" />
      <Header />

      <main>
        {/* ── Page header ────────────────────────────────────────── */}
        <section style={{ background: 'white', padding: '48px 48px 40px', borderBottom: '1px solid #E8D5F5' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
              <div>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7A2891', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>BEJEWELED</p>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 600, color: '#1A0A24', margin: 0, lineHeight: 1.15 }}>
                  The Collection
                </h1>
                <p style={{ color: '#6B4F7A', fontSize: '0.95rem', lineHeight: 1.7, marginTop: '10px', marginBottom: 0, maxWidth: 540 }}>
                  Discover our curated selection of fine jewelry — each piece chosen for its craftsmanship, elegance, and timeless appeal.
                </p>
              </div>
              <p style={{ color: '#9B8FAA', fontSize: '0.825rem', margin: 0, alignSelf: 'flex-end' }}>
                {loading ? '—' : `${filteredProducts.length} piece${filteredProducts.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Search */}
            <div style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FAF7FF', border: '1px solid #E8D5F5', borderRadius: '6px', padding: '10px 16px' }}>
                <Search size={16} color="#7A2891" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pieces, styles, metals…"
                  aria-label="Search collection"
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', color: '#1A0A24', width: '100%', fontFamily: 'Inter, sans-serif' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8FAA', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Product grid ───────────────────────────────────────── */}
        <section style={{ padding: '48px 48px 80px' }} aria-label="Product collection">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {loading ? (
              <ProductGridSkeleton count={8} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            ) : error ? (
              <div style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '8px', padding: '60px 40px', textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#1A0A24', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>Unable to load collection</p>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{error}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
                {filteredProducts.map((product) => (
                  <ShopProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={wishlistStore.isInWishlist(product.id)}
                    outOfStock={outOfStock(product.stock)}
                    onWishlist={handleWishlist}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '8px', padding: '80px 40px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '16px', marginTop: 0 }}>◇</p>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#1A0A24', fontWeight: 600, marginBottom: '10px', marginTop: 0 }}>No pieces found</p>
                <p style={{ color: '#6B4F7A', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '24px', marginTop: 0 }}>
                  Refine your search or explore the full collection below.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: '#5B1E6E', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  View All Pieces
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ── Shop product card ─────────────────────────────────────────────────────────

type ShopProductCardProps = {
  product: { id: string; name: string; price: number; formattedPrice: string; image: string; category: string | null; stock: number; isFeatured: boolean };
  isWishlisted: boolean;
  outOfStock: boolean;
  onWishlist: (id: string, name: string) => void;
  onAddToCart: (id: string, name: string, price: number, image: string, stock: number) => void;
};

function ShopProductCard({ product, isWishlisted, outOfStock, onWishlist, onAddToCart }: ShopProductCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${hovered ? '#C9A84C' : '#E8D5F5'}`,
        boxShadow: hovered ? '0 8px 28px rgba(91,30,110,0.12)' : '0 1px 6px rgba(91,30,110,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#F3EEF8' }}>
        <Link to={`/product/${product.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img
            src={product.image || FALLBACK_IMG}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
          />
        </Link>

        {/* Wishlist button */}
        <button
          onClick={() => onWishlist(product.id, product.name)}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '3px', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
        >
          <Heart size={15} fill={isWishlisted ? '#5B1E6E' : 'none'} color={isWishlisted ? '#5B1E6E' : '#9B8FAA'} />
        </button>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,10,36,0.65)', padding: '6px', textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px' }}>
        {product.category && (
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7A2891', marginBottom: '5px', marginTop: 0, fontWeight: 600 }}>{product.category}</p>
        )}
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.975rem', fontWeight: 500, color: '#1A0A24', lineHeight: 1.35, marginBottom: '8px', marginTop: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{product.name}</h2>
        </Link>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#3B0D4A', marginBottom: '14px', marginTop: 0 }}>{product.formattedPrice}</p>
        <button
          type="button"
          onClick={() => !outOfStock && onAddToCart(product.id, product.name, product.price, product.image, product.stock)}
          disabled={outOfStock}
          style={{ width: '100%', padding: '10px', background: outOfStock ? '#F3EEF8' : '#5B1E6E', color: outOfStock ? '#9B8FAA' : 'white', border: outOfStock ? '1px solid #E8D5F5' : 'none', borderRadius: '4px', fontSize: '0.825rem', fontWeight: 600, cursor: outOfStock ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em', transition: 'background 0.2s' }}
          onMouseEnter={(e) => { if (!outOfStock) e.currentTarget.style.background = '#3B0D4A'; }}
          onMouseLeave={(e) => { if (!outOfStock) e.currentTarget.style.background = '#5B1E6E'; }}
          aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        >
          {outOfStock ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
