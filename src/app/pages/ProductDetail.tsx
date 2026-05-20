import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { Heart, Minus, Plus, Star, MessageCircle, Send, ChevronDown } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useProduct } from '../hooks/useProducts';
import { showInfoToast, showSuccessToast, showErrorToast } from '../lib/notifications';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useChatStore } from '../store/chatStore';
import { useAuthSession } from '../lib/auth';
import { getReviewsForProduct, submitReview, getCurrentUserReviewForProduct, type Review } from '../lib/reviews';
import { getSeoMetadata } from '../lib/seo';

// ── Luxury dark palette ──────────────────────────────────────────────────
const C = {
  bg:           '#0B0B0F',
  surface:      '#14141A',
  surfaceHigh:  '#1C1C26',
  gold:         '#C8A24A',
  goldLight:    '#E6C878',
  border:       '#2A2A35',
  ivory:        '#F5F1E8',
  ivoryMuted:   '#A09C94',
  textMuted:    '#6E6C78',
} as const;

function formatReviewDate(date: string) {
  if (!date) {
    return 'Recently added';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recently added';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: product, error, loading } = useProduct(productId);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const openChat = useChatStore((s) => s.openChat);
  const wishlistStore = useWishlistStore();
  const cartStore = useCartStore();
  const authSession = useAuthSession();

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewFormRef = useRef<HTMLDivElement>(null);

  // SEO metadata overrides from seo_metadata table
  const [seoOgTitle, setSeoOgTitle] = useState<string | null>(null);
  const [seoOgDescription, setSeoOgDescription] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImage(0);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    void getSeoMetadata('product', product.id).then((meta) => {
      if (meta?.ogTitle) setSeoOgTitle(meta.ogTitle);
      if (meta?.ogDescription) setSeoOgDescription(meta.ogDescription);
    });
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    setReviewsLoading(true);
    void getReviewsForProduct(product.id).then((data) => {
      setReviews(data);
    }).finally(() => setReviewsLoading(false));

    if (authSession?.isAuthenticated) {
      void getCurrentUserReviewForProduct(product.id).then((existing) => {
        setHasReviewed(existing !== null);
      });
    }
  }, [product?.id, authSession?.isAuthenticated]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showErrorToast('Review', 'Please write your review comment.');
      return;
    }
    setReviewSubmitting(true);
    try {
      await submitReview(product!.id, reviewRating, reviewComment.trim());
      showSuccessToast('Review submitted', 'Thank you for your review!');
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      setHasReviewed(true);
      const updated = await getReviewsForProduct(product!.id);
      setReviews(updated);
    } catch (err) {
      showErrorToast('Review', err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : product?.rating ?? 0;
  const totalReviews = reviews.length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
        <Header />
        <main className="store-section">
          <section className="store-shell grid grid-cols-1 gap-8 lg:grid-cols-2" aria-label="Loading product details" aria-busy="true">
            <div className="aspect-square animate-pulse" style={{ backgroundColor: C.surface }} />
            <div className="space-y-5">
              <div className="h-12 w-3/4 animate-pulse" style={{ backgroundColor: C.surface }} />
              <div className="h-6 w-1/3 animate-pulse" style={{ backgroundColor: C.surfaceHigh }} />
              <div className="h-20 animate-pulse" style={{ backgroundColor: C.surface }} />
              <div className="h-14 animate-pulse" style={{ backgroundColor: C.surfaceHigh }} />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
        <Header />
        <main className="store-section">
          <section className="store-shell px-6 py-10 text-center lg:px-10 lg:py-20" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }} aria-live="polite">
            <h1 className="mb-3 text-3xl" style={{ fontFamily: 'Playfair Display, serif', color: C.ivory, fontWeight: 600 }}>
              Product unavailable
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.8 }}>{error ?? 'This jewelry piece could not be found.'}</p>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = product.metaTitle || `${product.name} | Bejeweled`;
  const seoDescription = product.metaDescription || product.description;
  const seoKeywords = product.metaKeywords || '';
  const seoImage = product.images[0] || '';

  const handleQuantityDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityIncrease = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <link rel="canonical" href={`https://bejeweled.store/product/${productId}`} />
        <meta property="og:url" content={`https://bejeweled.store/product/${productId}`} />
        <meta property="og:title" content={seoOgTitle ?? seoTitle} />
        <meta property="og:description" content={seoOgDescription ?? seoDescription} />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoOgTitle ?? seoTitle} />
        <meta name="twitter:description" content={seoOgDescription ?? seoDescription} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
      </Helmet>
      <Header />

      <main className="store-section">
        <article className="store-shell" itemScope itemType="https://schema.org/Product">

          {/* ── Product Grid: Gallery + Info ───────────────────────── */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">

            {/* ── Left column: vertical thumbnails + main image ──── */}
            <section aria-label="Product images">
              <div className="flex gap-4">

                {/* Vertical thumbnail strip */}
                {product.images.length > 1 && (
                  <div
                    role="list"
                    aria-label="Product image thumbnails"
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, width: '72px', maxHeight: '560px', overflowY: 'auto', paddingRight: '2px' }}
                  >
                    {product.images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(index)}
                        role="listitem"
                        aria-label={`View image ${index + 1} of ${product.name}`}
                        aria-pressed={selectedImage === index}
                        style={{
                          width: '72px',
                          height: '72px',
                          flexShrink: 0,
                          overflow: 'hidden',
                          border: selectedImage === index
                            ? `2px solid ${C.gold}`
                            : `1px solid ${C.border}`,
                          backgroundColor: C.surface,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <img
                          src={image}
                          alt={`${product.name} view ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <figure style={{ flex: 1, margin: 0 }}>
                  <img
                    src={product.images[selectedImage]}
                    alt={`${product.name} — selected view`}
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', backgroundColor: C.surface }}
                    itemProp="image"
                  />
                </figure>
              </div>
            </section>

            {/* ── Right column: info + actions + accordions ─────── */}
            <section aria-labelledby="product-title">
              <div className="space-y-6">

                {/* Title */}
                <h1
                  id="product-title"
                  style={{ fontFamily: 'Playfair Display, serif', color: C.ivory, fontWeight: 700, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1.2, margin: 0 }}
                  itemProp="name"
                >
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-3" itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                  <div className="flex gap-0.5" role="img" aria-label={`${avgRating.toFixed(1)} out of 5 stars`}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={15} style={{ fill: i < Math.round(avgRating) ? C.gold : 'none', color: i < Math.round(avgRating) ? C.gold : C.border }} aria-hidden="true" />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.8125rem', letterSpacing: '0.02em' }}>
                    <meta itemProp="ratingValue" content={avgRating.toFixed(2)} />
                    <meta itemProp="reviewCount" content={totalReviews.toString()} />
                    {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>

                {/* Price */}
                <p
                  style={{ fontFamily: 'Inter, sans-serif', color: C.gold, fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.01em', margin: 0 }}
                  itemProp="offers"
                  itemScope
                  itemType="https://schema.org/Offer"
                >
                  <meta itemProp="price" content={product.price.toString()} />
                  <meta itemProp="priceCurrency" content="PKR" />
                  <meta itemProp="availability" content={product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
                  {product.formattedPrice}
                </p>

                {/* Stock badge */}
                {product.stock > 0 ? (
                  <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.8125rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                    In Stock · {product.stock} available
                  </p>
                ) : (
                  <p style={{ fontFamily: 'Inter, sans-serif', color: '#E07070', fontSize: '0.8125rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                    Out of Stock
                  </p>
                )}

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: C.border }} />

                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" style={{ display: 'block', fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Quantity
                  </label>
                  <div
                    style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${C.border}`, backgroundColor: C.surface }}
                    role="group"
                    aria-label="Quantity selector"
                  >
                    <button
                      type="button"
                      onClick={handleQuantityDecrease}
                      disabled={quantity === 1}
                      style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivoryMuted, background: 'none', border: 'none', cursor: quantity === 1 ? 'not-allowed' : 'pointer', opacity: quantity === 1 ? 0.4 : 1 }}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))}
                      style={{ width: '48px', textAlign: 'center', background: 'none', border: 'none', color: C.ivory, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '1rem', outline: 'none', borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, height: '44px' }}
                      min="1"
                      max={product.stock}
                      inputMode="numeric"
                      aria-label="Product quantity"
                    />
                    <button
                      type="button"
                      onClick={handleQuantityIncrease}
                      disabled={quantity >= product.stock}
                      style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivoryMuted, background: 'none', border: 'none', cursor: quantity >= product.stock ? 'not-allowed' : 'pointer', opacity: quantity >= product.stock ? 0.4 : 1 }}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={product.stock === 0}
                    onClick={async () => {
                      try {
                        await cartStore.addItem(product.id, quantity, { name: product.name, price: product.price, image: product.images[0] ?? '', stock: product.stock });
                        showSuccessToast('Added to cart', `${quantity} × ${product.name} added to your cart.`);
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to add item to cart.';
                        showErrorToast('Cart error', message);
                      }
                    }}
                    style={{ width: '100%', padding: '16px 24px', backgroundColor: C.gold, color: C.bg, border: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', opacity: product.stock === 0 ? 0.5 : 1, transition: 'opacity 0.15s' }}
                    aria-label={`Add ${quantity} ${product.name} to cart`}
                  >
                    Add to Cart
                  </button>

                  <button
                    type="button"
                    onClick={() => openChat(`Tell me more about ${product.name} and help me decide if it's the right jewelry piece for me.`)}
                    style={{ width: '100%', padding: '14px 24px', backgroundColor: 'transparent', color: C.gold, border: `1px solid ${C.gold}`, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    aria-label={`Ask AI about ${product.name}`}
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    Ask AI Assistant
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (wishlistStore.isInWishlist(product.id)) {
                          showInfoToast('Already in wishlist', `${product.name} is already saved to your wishlist.`);
                          return;
                        }
                        await wishlistStore.addItem(product.id);
                        showSuccessToast('Saved to wishlist', `${product.name} has been added to your wishlist.`);
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to add to wishlist.';
                        showErrorToast('Wishlist error', message);
                      }
                    }}
                    style={{ width: '100%', padding: '14px 24px', backgroundColor: 'transparent', color: C.ivoryMuted, border: `1px solid ${C.border}`, fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    aria-label={`Add ${product.name} to wishlist`}
                  >
                    <Heart size={14} style={{ color: C.gold }} aria-hidden="true" />
                    Save to Wishlist
                  </button>
                </div>

                {/* ── Accordion: Description / Care / Shipping ───── */}
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  {[
                    {
                      key: 'description',
                      label: 'Description',
                      content: <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.85, fontSize: '0.9375rem', margin: 0 }} itemProp="description">{product.description}</p>,
                    },
                    {
                      key: 'care',
                      label: 'Care Instructions',
                      content: <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.85, fontSize: '0.9375rem', margin: 0 }}>{product.care || 'Care information coming soon.'}</p>,
                    },
                    {
                      key: 'shipping',
                      label: 'Shipping',
                      content: <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.85, fontSize: '0.9375rem', margin: 0 }}>Our standard shipping takes almost 4 to 5 days to complete, provided there are no national-level delays or unforeseen issues. A shipping fee of PKR 250 will be charged for orders below PKR 3,000. Enjoy FREE shipping on all orders of PKR 3,000 and above.</p>,
                    },
                  ].map(({ key, label, content }) => {
                    const isOpen = openAccordion === key;
                    return (
                      <div key={key} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <button
                          type="button"
                          onClick={() => setOpenAccordion(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          aria-controls={`accordion-${key}`}
                          id={`accordion-${key}-header`}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', color: isOpen ? C.gold : C.ivory }}
                        >
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {label}
                          </span>
                          <ChevronDown
                            size={14}
                            style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: C.gold }}
                            aria-hidden="true"
                          />
                        </button>
                        {isOpen && (
                          <div
                            id={`accordion-${key}`}
                            role="region"
                            aria-labelledby={`accordion-${key}-header`}
                            style={{ paddingBottom: '20px' }}
                          >
                            {content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </section>
          </div>

          {/* ── Reviews — full-width minimal section ──────────────── */}
          <section
            style={{ marginTop: '96px', paddingTop: '64px', borderTop: `1px solid ${C.border}` }}
            aria-labelledby="reviews-heading"
          >
            <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2
                  id="reviews-heading"
                  style={{ fontFamily: 'Playfair Display, serif', color: C.ivory, fontWeight: 700, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', margin: '0 0 6px' }}
                >
                  Customer Reviews
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5" aria-label={`Average ${avgRating.toFixed(1)} out of 5`}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} style={{ fill: s <= Math.round(avgRating) ? C.gold : 'none', color: s <= Math.round(avgRating) ? C.gold : C.border }} aria-hidden="true" />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.8125rem' }}>
                    {avgRating.toFixed(1)} · {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>

              {/* Write review CTA */}
              {authSession?.isAuthenticated ? (
                hasReviewed ? (
                  <span style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.8125rem', letterSpacing: '0.04em' }}>✓ You have reviewed this piece</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm((v) => !v);
                      setTimeout(() => reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                    }}
                    style={{ padding: '12px 24px', backgroundColor: 'transparent', border: `1px solid ${C.gold}`, color: C.gold, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  style={{ padding: '12px 24px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, color: C.ivoryMuted, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Sign In to Review
                </button>
              )}
            </div>

            {/* Review form */}
            {showReviewForm && (
              <div
                ref={reviewFormRef}
                style={{ marginBottom: '48px', padding: '32px', backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              >
                <h3 style={{ fontFamily: 'Playfair Display, serif', color: C.ivory, fontWeight: 600, fontSize: '1.125rem', margin: '0 0 24px' }}>Write Your Review</h3>
                <form onSubmit={(e) => { void handleSubmitReview(e); }} className="space-y-5">
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Your Rating</p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${star} out of 5`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                        >
                          <Star size={22} style={{ fill: star <= (hoverRating || reviewRating) ? C.gold : 'none', color: star <= (hoverRating || reviewRating) ? C.gold : C.border }} />
                        </button>
                      ))}
                      <span style={{ marginLeft: '10px', fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.8125rem' }}>
                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || reviewRating]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="review-comment" style={{ display: 'block', fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Your Review</label>
                    <textarea
                      id="review-comment"
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this piece…"
                      style={{ width: '100%', resize: 'none', padding: '14px', border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.ivory, fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }}
                      maxLength={1000}
                    />
                    <p style={{ marginTop: '4px', textAlign: 'right', fontFamily: 'Inter, sans-serif', color: C.textMuted, fontSize: '0.75rem' }}>{reviewComment.length}/1000</p>
                  </div>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', backgroundColor: C.gold, color: C.bg, border: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: reviewSubmitting ? 'not-allowed' : 'pointer', opacity: reviewSubmitting ? 0.6 : 1 }}
                  >
                    <Send size={13} />
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map((i) => (
                  <div key={i} style={{ padding: '24px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div className="animate-pulse" style={{ height: '14px', width: '120px', backgroundColor: C.surface, marginBottom: '12px' }} />
                    <div className="animate-pulse" style={{ height: '14px', width: '80%', backgroundColor: C.surface }} />
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div>
                {reviews.map((review, idx) => (
                  <article
                    key={review.id}
                    style={{ padding: '28px 0', borderBottom: idx < reviews.length - 1 ? `1px solid ${C.border}` : 'none' }}
                  >
                    <header style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={13} style={{ fill: s <= review.rating ? C.gold : 'none', color: s <= review.rating ? C.gold : C.border }} aria-hidden="true" />
                          ))}
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', color: C.ivory, fontWeight: 600, fontSize: '0.875rem' }}>{review.user_name}</span>
                        <time dateTime={review.created_at} style={{ fontFamily: 'Inter, sans-serif', color: C.textMuted, fontSize: '0.8125rem' }}>{formatReviewDate(review.created_at)}</time>
                      </div>
                    </header>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.75, fontSize: '0.9375rem', margin: 0 }}>{review.comment}</p>

                    {review.admin_reply && (
                      <div style={{ marginTop: '16px', paddingLeft: '16px', borderLeft: `2px solid ${C.gold}` }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: C.gold, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Bejeweled</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: C.ivoryMuted, lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>{review.admin_reply}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'Inter, sans-serif', color: C.textMuted, fontSize: '0.9375rem', padding: '32px 0', borderTop: `1px solid ${C.border}` }}>
                No reviews yet. Be the first to share your experience with this piece.
              </p>
            )}
          </section>

        </article>
      </main>

      <Footer />
    </div>
  );
}