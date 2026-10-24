import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Truck, ShoppingBag, Sparkles, MapPin, Calendar, CreditCard } from 'lucide-react';
import { fireConfetti } from '../utils/confetti';

export default function OrderConfirmationPage({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fire festive celebration confetti!
    fireConfetti();

    async function loadOrder() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Error fetching order confirmation:', err);
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', maxWidth: '700px' }}>
        <div style={{ height: '500px' }} className="skeleton" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Order Not Found</h2>
        <p>Could not load confirmation for #{orderId}</p>
        <button onClick={() => onNavigate('/')} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Back to Home
        </button>
      </div>
    );
  }

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 3);
  const formattedEstDate = estimatedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div style={{ padding: '50px 20px 90px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container" style={{ maxWidth: '780px' }}>
        
        {/* Success Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '30px',
          padding: '45px 35px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center'
        }}>
          
          {/* Confetti celebration icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-mint-light)',
            color: '#038A65',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '38px',
            boxShadow: '0 8px 25px rgba(6, 214, 160, 0.25)'
          }}>
            🎉
          </div>

          <h1 style={{ fontSize: '32px', color: '#1E293B', marginBottom: '10px' }}>
            Order Placed Successfully! 🎉
          </h1>

          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '520px', margin: '0 auto 24px' }}>
            Your order confirmation has been sent to your email (<strong>{order.customer_email}</strong>) and mobile number (<strong>{order.customer_phone}</strong>).
          </p>

          <div style={{
            display: 'inline-block',
            backgroundColor: '#FFF9F5',
            border: '1.5px dashed var(--primary-border)',
            borderRadius: '16px',
            padding: '12px 24px',
            marginBottom: '32px'
          }}>
            <span style={{ fontSize: '13px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>Order Reference ID: </span>
            <strong style={{ fontSize: '18px', color: 'var(--primary)', letterSpacing: '0.5px' }}>{order.order_id}</strong>
          </div>

          {/* Key Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            textAlign: 'left',
            marginBottom: '35px'
          }}>
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>
                <Calendar size={14} color="var(--primary)" />
                <span>Estimated Delivery</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B' }}>
                {order.estimated_delivery || `${formattedEstDate} (Express)`}
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>
                <CreditCard size={14} color="var(--secondary)" />
                <span>Payment Status</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: order.payment_status === 'Verified' ? '#10B981' : '#F59E0B' }}>
                {order.payment_status === 'Verified' ? '✓ Verified Online' : 'Verification In Progress'}
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>
                <Truck size={14} color="var(--accent-mint)" />
                <span>Order Status</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B' }}>
                {order.order_status}
              </div>
            </div>
          </div>

          {/* Ordered Gifts List */}
          <div style={{ textAlign: 'left', borderTop: '1px solid var(--border-soft)', paddingTop: '24px', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Ordered Gifts ({order.items?.length || 0})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(order.items || []).map(it => (
                <div key={it.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '14px',
                  border: '1px solid #F1E5E0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={it.product_image || '/placeholder-gift.png'}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1E293B' }}>{it.product_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Qty: {it.quantity} × ₹{it.price_at_purchase}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#1E293B' }}>
                    ₹{it.total_price}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Paid */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderTop: '1.5px dashed var(--border-soft)',
              marginTop: '16px'
            }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#475569' }}>Total Paid via UPI:</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                ₹{order.total_amount}
              </span>
            </div>
          </div>

          {/* Delivery Address Box */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '18px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '35px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
              <MapPin size={16} color="var(--primary)" />
              <span>Delivery Destination</span>
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
              <strong>{order.customer_name}</strong><br />
              {order.house_no}, {order.street}, {order.area}<br />
              {order.city}, {order.district}, {order.state} - <strong>{order.pincode}</strong><br />
              Mobile: <strong>{order.customer_phone}</strong>
              {order.landmark && <div>Landmark: <em>{order.landmark}</em></div>}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate('/track-order')}
              className="btn btn-primary btn-lg"
              style={{ minWidth: '200px' }}
            >
              <Truck size={18} />
              <span>Track Order</span>
            </button>

            <button
              onClick={() => onNavigate('/shop')}
              className="btn btn-outline btn-lg"
              style={{ minWidth: '200px' }}
            >
              <ShoppingBag size={18} />
              <span>Continue Shopping</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
