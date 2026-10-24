import React from 'react';
import { ShoppingBag, Sparkles, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onNavigate }) {
  const { addToCart } = useCart();
  const isSoldOut = product.status === 'Sold Out' || product.stock_quantity <= 0;

  const handleCardClick = () => {
    onNavigate(`/product/${product.id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!isSoldOut) {
      addToCart(product, 1);
    }
  };

  const currentPrice = product.discount_price && product.discount_price < product.price
    ? product.discount_price
    : product.price;

  const originalPrice = product.price;
  const discountPercent = product.discount_percentage || (
    product.discount_price && product.discount_price < product.price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : 0
  );

  return (
    <div 
      className="product-card" 
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Product Image */}
      <div className="product-card-img-wrapper">
        <img
          src={product.main_image || '/placeholder-gift.png'}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
        />

        {/* Floating Badges */}
        <div className="product-card-badges">
          {isSoldOut && (
            <span className="badge badge-soldout">Sold Out</span>
          )}
          {!isSoldOut && product.is_new_arrival === 1 && (
            <span className="badge badge-new">✨ New</span>
          )}
          {!isSoldOut && product.is_bestseller === 1 && (
            <span className="badge badge-bestseller">🔥 Bestseller</span>
          )}
          {!isSoldOut && discountPercent > 0 && (
            <span className="badge badge-discount">{discountPercent}% OFF</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="product-card-body">
        <div className="product-card-category">{product.category_name || 'Gift'}</div>
        <h3 className="product-card-title" title={product.name}>{product.name}</h3>

        {/* Price & Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px' }}>
          <div>
            <div className="product-card-price-row" style={{ padding: 0 }}>
              <span className="price-current">₹{currentPrice}</span>
              {discountPercent > 0 && (
                <span className="price-original">₹{originalPrice}</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: isSoldOut ? '#EF4444' : '#10B981', fontWeight: '700', marginTop: '2px' }}>
              {isSoldOut ? 'Out of stock' : `${product.stock_quantity} left in store`}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isSoldOut}
            className={`btn btn-sm ${isSoldOut ? 'btn-disabled' : 'btn-primary'}`}
            style={{ padding: '8px 14px', borderRadius: '50px' }}
            title={isSoldOut ? 'Item is currently sold out' : 'Add to Cart'}
          >
            <ShoppingBag size={15} />
            <span>{isSoldOut ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
