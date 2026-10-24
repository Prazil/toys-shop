import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onNavigate }) {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    removeFromCart,
    updateQuantity,
    subtotal,
    discountTotal,
    itemsTotal,
    shippingFee,
    shippingRate,
    freeShippingThreshold,
    grandTotal
  } = useCart();

  if (!isCartOpen) return null;

  const isAllFreeShipping = shippingRate === 0;
  const threshold = freeShippingThreshold || 499;
  const progressPercent = isAllFreeShipping ? 100 : Math.min(100, Math.round((itemsTotal / threshold) * 100));
  const amountNeeded = isAllFreeShipping ? 0 : Math.max(0, threshold - itemsTotal);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.15)',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFF9F5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎁</span>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Your Gift Cart ({cartItems.length})</h3>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            style={{
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-soft)',
              color: '#64748B'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div style={{ padding: '12px 24px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
            <span>{isAllFreeShipping ? '🎉 100% Free Delivery on all gift orders today!' : (amountNeeded === 0 ? '🎉 You unlocked Free Delivery!' : `Add ₹${amountNeeded} more for Free Delivery`)}</span>
            <span>{progressPercent}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: amountNeeded === 0 ? 'var(--accent-mint)' : 'var(--primary)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '50px', marginBottom: '16px' }}>🎈</div>
              <h4 style={{ fontSize: '18px', marginBottom: '8px' }}>Your cart is empty!</h4>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                Explore our cheerful collection of toys, gifts, and surprises!
              </p>
              <button 
                onClick={() => { setIsCartOpen(false); onNavigate('/shop'); }}
                className="btn btn-primary"
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-soft)',
                  backgroundColor: '#FFFFFF'
                }}>
                  <img
                    src={item.main_image || '/placeholder-gift.png'}
                    alt={item.name}
                    style={{
                      width: '74px',
                      height: '74px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC'
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', margin: '0 0 4px', lineHeight: '1.3' }}>{item.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>₹{item.effective_price}</span>
                        {item.discount_price && item.discount_price < item.price && (
                          <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>₹{item.price}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '50px',
                        overflow: 'hidden'
                      }}>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ padding: '4px 10px', color: '#64748B' }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: '700' }}>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ padding: '4px 10px', color: '#64748B' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        style={{ color: '#EF4444', padding: '6px' }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {cartItems.length > 0 && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid var(--border-soft)',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 -4px 15px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', color: '#64748B' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: '600', color: '#1E293B' }}>₹{subtotal}</span>
            </div>
            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', color: '#10B981' }}>
                <span>Discount</span>
                <span style={{ fontWeight: '600' }}>-₹{discountTotal}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px', color: '#64748B' }}>
              <span>Delivery Fee</span>
              <span style={{ fontWeight: '600', color: shippingFee === 0 ? '#10B981' : '#1E293B' }}>
                {shippingFee === 0 ? 'FREE 🎁' : `₹${shippingFee}`}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: '800',
              marginBottom: '18px',
              borderTop: '1px dashed var(--border-soft)',
              paddingTop: '10px'
            }}>
              <span>Total Amount</span>
              <span style={{ color: 'var(--primary)' }}>₹{grandTotal}</span>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                onNavigate('/checkout');
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '15px' }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
