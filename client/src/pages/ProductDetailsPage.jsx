import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowLeft, Plus, Minus, ShieldCheck, Truck, Sparkles, Heart, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductDetailsPage({ productId, onNavigate }) {
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
          setSelectedImage(data.product.main_image);
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 20px' }}>
        <div style={{ height: '450px', maxWidth: '900px', margin: '0 auto' }} className="skeleton" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '50px', marginBottom: '16px' }}>🔍</div>
        <h2>Gift Not Found</h2>
        <p style={{ marginBottom: '24px' }}>This gift may be archived or unavailable.</p>
        <button onClick={() => onNavigate('/shop')} className="btn btn-primary">
          Browse All Gifts
        </button>
      </div>
    );
  }

  const isSoldOut = product.status === 'Sold Out' || product.stock_quantity <= 0;
  const currentPrice = product.discount_price && product.discount_price < product.price
    ? product.discount_price
    : product.price;
  const discountPercent = product.discount_percentage || (
    product.discount_price && product.discount_price < product.price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : 0
  );

  const images = product.images && product.images.length > 0 ? product.images : [product.main_image];

  const handleAddToCart = () => {
    if (!isSoldOut) {
      addToCart(product, quantity);
    }
  };

  const handleBuyNow = () => {
    if (!isSoldOut) {
      addToCart(product, quantity);
      setIsCartOpen(false);
      onNavigate('/checkout');
    }
  };

  return (
    <div style={{ padding: '40px 20px 80px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container">
        
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/shop')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            fontWeight: '600',
            fontSize: '14px',
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Gifts</span>
        </button>

        {/* Product Details Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '50px',
          backgroundColor: '#FFFFFF',
          borderRadius: '30px',
          padding: '40px 30px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          
          {/* Gallery Column */}
          <div>
            <div style={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              backgroundColor: '#FFF9F5',
              border: '1px solid var(--border-soft)',
              marginBottom: '16px'
            }}>
              <img
                src={selectedImage || product.main_image}
                alt={product.name}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {/* Badges */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {isSoldOut && <span className="badge badge-soldout">Sold Out</span>}
                {!isSoldOut && product.is_new_arrival === 1 && <span className="badge badge-new">✨ New Arrival</span>}
                {!isSoldOut && product.is_bestseller === 1 && <span className="badge badge-bestseller">🔥 Bestseller</span>}
                {!isSoldOut && discountPercent > 0 && <span className="badge badge-discount">{discountPercent}% OFF</span>}
              </div>
            </div>

            {/* Thumbnail previews */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedImage === imgUrl ? 'var(--primary)' : 'var(--border-soft)',
                      flexShrink: 0
                    }}
                  >
                    <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              {product.category_name}
            </div>

            <h1 style={{ fontSize: '28px', lineHeight: '1.25', marginBottom: '14px', color: '#1E293B' }}>
              {product.name}
            </h1>

            {/* SKU and Stock status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', fontSize: '13px' }}>
              <span style={{ color: '#94A3B8' }}>SKU: <strong>{product.sku || product.product_id}</strong></span>
              <span>•</span>
              <span style={{ fontWeight: '700', color: isSoldOut ? '#EF4444' : '#10B981' }}>
                {isSoldOut ? '● Sold Out' : `● In Stock (${product.stock_quantity} available)`}
              </span>
            </div>

            {/* Price Box */}
            <div style={{
              backgroundColor: '#FFF9F5',
              border: '1px solid #FFE4E6',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>
                ₹{currentPrice}
              </span>
              {discountPercent > 0 && (
                <>
                  <span style={{ fontSize: '18px', color: '#94A3B8', textDecoration: 'line-through' }}>
                    ₹{product.price}
                  </span>
                  <span className="badge badge-discount" style={{ fontSize: '13px' }}>
                    Save {discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ fontSize: '15px', textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>About this gift:</h4>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-line' }}>
                {product.description || 'Delightful kids gift handcrafted to bring joyful memories and bright smiles.'}
              </p>
            </div>

            {/* Quantity Selector & Purchase Buttons */}
            {!isSoldOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Quantity:</span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1.5px solid var(--border-soft)',
                    borderRadius: '50px',
                    padding: '4px'
                  }}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ padding: '6px 14px', color: '#64748B' }}
                    >
                      <Minus size={15} />
                    </button>
                    <span style={{ padding: '0 12px', fontSize: '15px', fontWeight: '800' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      style={{ padding: '6px 14px', color: '#64748B' }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAddToCart}
                    className="btn btn-outline btn-lg"
                    style={{ flex: '1 1 180px' }}
                  >
                    <ShoppingBag size={18} />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleBuyNow}
                    className="btn btn-primary btn-lg"
                    style={{ flex: '1 1 180px' }}
                  >
                    <Sparkles size={18} />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: 'auto',
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textAlign: 'center'
              }}>
                <div style={{ color: '#EF4444', fontWeight: '800', fontSize: '16px', marginBottom: '6px' }}>
                  Currently Sold Out
                </div>
                <p style={{ fontSize: '13px', margin: 0, color: '#64748B' }}>
                  This product has been claimed by other happy kids! Check back soon for restocking.
                </p>
              </div>
            )}

            {/* Badges of trust */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-soft)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                <Truck size={16} color="var(--primary)" />
                <span>Express Delivery</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                <ShieldCheck size={16} color="var(--secondary)" />
                <span>Kid-Safe Materials</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
                <Package size={16} color="var(--accent-mint)" />
                <span>Gift Box Packaging</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
