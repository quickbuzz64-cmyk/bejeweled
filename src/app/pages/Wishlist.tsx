import { Link } from 'react-router';
import { Heart, ShoppingCart, X, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { EmptyState } from '../components/EmptyState';
import { showErrorToast, showSuccessToast } from '../lib/notifications';
import { PageSeo } from '../components/PageSeo';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import { formatPKR } from '../lib/pricing';
import { useEffect } from 'react';

export default function Wishlist() {
  const store = useWishlistStore();
  const cartStore = useCartStore();
  const wishlistItems = store.items;
  const loading = store.isLoading;

  useEffect(() => {
    void store.loadWishlist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveItem = async (itemId: string) => {
    try {
      await store.removeItem(itemId);
      showSuccessToast('Removed', 'Item removed from your wishlist.');
    } catch (err: unknown) {
      showErrorToast('Wishlist error', err instanceof Error ? err.message : 'Failed to remove item.');
    }
  };

  const handleAddToCart = (item: { productId: string; name: string; price: number; image: string }) => {
    cartStore.addItem(item.productId, 1, { name: item.name, price: item.price, image: item.image })
      .then(() => showSuccessToast('Added to cart', `${item.name} moved from your wishlist to cart.`))
      .catch((err: unknown) => {
        showErrorToast('Cart error', err instanceof Error ? err.message : 'Failed to add to cart.');
      });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7FF' }}>
      <PageSeo title="Wishlist" />
      <Header />

      <main className="store-section">
        <div className="store-shell">
          <header className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <Heart className="h-8 w-8" style={{ color: '#C9A84C' }} aria-hidden="true" />
              <h1 className="text-4xl" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>
                My Wishlist
              </h1>
            </div>
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for later
            </p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#5B1E6E' }} />
            </div>
          ) : wishlistItems.length > 0 ? (
            <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="Wishlist items">
              {wishlistItems.map((item) => (
                <article key={item.id} className="relative transition-all" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 6px rgba(91,30,110,0.05)' }}>
                  <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute right-3 top-3 p-1.5 transition-all hover:opacity-70" style={{ backgroundColor: 'transparent', color: '#9B8FAA', border: '1px solid #E8D5F5', borderRadius: '3px' }} aria-label={`Remove ${item.name} from wishlist`} title="Remove from Wishlist">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <Link to={`/product/${item.productId}`} className="mb-4 block" aria-label={`View ${item.name}`}>
                    <img src={item.image} alt={item.name} className="w-full" style={{ aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '3px', border: '1px solid #E8D5F5' }} />
                  </Link>

                  <Link to={`/product/${item.productId}`}>
                    <h2 className="product-title-wrap mb-2 text-lg transition-all hover:opacity-70" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>
                      {item.name}
                    </h2>
                  </Link>

                  <p className="mb-4 text-xl" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 700 }}>
                    {formatPKR(item.price)}
                  </p>

                  <button type="button" onClick={() => handleAddToCart(item)} className="flex w-full items-center justify-center gap-2 px-5 py-3 transition-all" style={{ backgroundColor: '#5B1E6E', color: '#FFFFFF', borderRadius: '3px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.04em', border: 'none' }} aria-label={`Add ${item.name} to cart`}>
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Add to Cart
                  </button>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState
              icon={<Heart className="h-8 w-8" aria-hidden="true" />}
              title="Your wishlist is empty"
              description="Save the pieces you love and return when you're ready. Your favourites will be waiting for you."
              actionLabel="Continue Shopping"
              actionTo="/shop"
              ariaLabel="Empty wishlist"
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}