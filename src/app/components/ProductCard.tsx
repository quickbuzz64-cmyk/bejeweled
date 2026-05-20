import { useState } from 'react';
import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import type { ProductCard as ProductCardType } from '../types';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80';

type ProductCardProps = {
  product: ProductCardType;
  onAddToCart?: (id: string, name: string, price: number, image: string, stock: number) => void;
  onWishlist?: (id: string, name: string) => void;
  isWishlisted?: boolean;
};

export function ProductCard({ product, onAddToCart, onWishlist, isWishlisted = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #E8D5F5',
        boxShadow: hovered ? '0 12px 32px rgba(91,30,110,0.14)' : '0 2px 12px rgba(91,30,110,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#F3EEF8' }}>
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image || FALLBACK_IMG}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
          />
        </Link>
        {onWishlist && (
          <button
            onClick={() => onWishlist(product.id, product.name)}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{ position: 'absolute', top: 10, right: 10, background: 'white', border: 'none', borderRadius: '9999px', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Heart size={16} fill={isWishlisted ? '#5B1E6E' : 'none'} color={isWishlisted ? '#5B1E6E' : '#9B8FAA'} />
          </button>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {product.category && (
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A2891', marginBottom: '4px', marginTop: 0 }}>{product.category}</p>
        )}
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 500, color: '#1A0A24', lineHeight: 1.3, marginBottom: '6px', marginTop: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{product.name}</h3>
        </Link>
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#5B1E6E', marginBottom: '12px', marginTop: 0 }}>{product.formattedPrice}</p>
        {onAddToCart && (
          <button
            onClick={() => !outOfStock && onAddToCart(product.id, product.name, product.price, product.image, product.stock)}
            disabled={outOfStock}
            style={{ width: '100%', padding: '10px', background: outOfStock ? '#E8D5F5' : '#5B1E6E', color: outOfStock ? '#9B8FAA' : 'white', border: 'none', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: outOfStock ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s' }}
            onMouseEnter={(e) => { if (!outOfStock) e.currentTarget.style.background = '#3B0D4A'; }}
            onMouseLeave={(e) => { if (!outOfStock) e.currentTarget.style.background = '#5B1E6E'; }}
          >
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </article>
  );
}
