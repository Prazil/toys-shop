import React, { useState } from 'react';
import { Search, CheckCircle2, Circle, Truck, Package, Clock, AlertCircle, ExternalLink, MapPin } from 'lucide-react';

export default function OrderTrackingPage({ onNavigate }) {
  const [orderId, setOrderId] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState('');

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!orderId.trim() || !contact.trim()) {
      setError('Please enter both Order ID and Phone Number or Email.');
      return;
    }

    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId.trim(),
          contact: contact.trim()
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        setTrackingData(data.order);
      } else {
        setError(data.message || 'No matching order found. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection error while tracking order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px 20px 90px', backgroundColor: 'var(--bg-body)', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🚚</div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Track Your Gift Order</h1>
          <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '480px', margin: '0 auto' }}>
            Follow your package's joyful journey right to your doorstep in real-time!
          </p>
        </div>

        {/* Tracking Search Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '30px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '40px'
        }}>
          <form onSubmit={handleTrackSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Order ID <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. GS-2026-000001"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="input-control"
                  style={{ textTransform: 'uppercase', fontWeight: '700' }}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Phone or Email <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210 or email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input-control"
                />
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: '#B91C1C',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              <Search size={18} />
              <span>{loading ? 'Searching Order...' : 'Track Order Status'}</span>
            </button>
          </form>
        </div>

        {/* Tracking Result View */}
        {trackingData && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '35px 30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-md)'
          }}>
            {/* Top Info */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-soft)',
              marginBottom: '30px'
            }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700' }}>Order ID</span>
                <h3 style={{ fontSize: '22px', margin: 0, color: '#1E293B' }}>{trackingData.order_id}</h3>
              </div>

              <div style={{
                backgroundColor: trackingData.is_cancelled ? '#FEE2E2' : 'var(--primary-light)',
                color: trackingData.is_cancelled ? '#EF4444' : 'var(--primary)',
                padding: '8px 18px',
                borderRadius: '50px',
                fontWeight: '800',
                fontSize: '14px'
              }}>
                Current Status: {trackingData.order_status}
              </div>
            </div>

            {/* Free Secure Delivery OTP Card */}
            {trackingData.delivery_otp && (
              <div style={{
                backgroundColor: '#FFFBEB',
                border: '2px dashed #F59E0B',
                borderRadius: '18px',
                padding: '16px 20px',
                marginBottom: '26px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px'
                  }}>
                    🔐
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>Delivery Verification OTP</span>
                      <span style={{ backgroundColor: '#10B981', color: '#FFFFFF', padding: '1px 6px', borderRadius: '50px', fontSize: '9px', fontWeight: '800' }}>FREE</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#B45309' }}>Share with delivery executive only after physical receipt of parcel</div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #FDE68A',
                  borderRadius: '12px',
                  padding: '8px 18px',
                  fontSize: '24px',
                  fontWeight: '900',
                  letterSpacing: '5px',
                  color: '#D97706',
                  fontFamily: 'monospace'
                }}>
                  {trackingData.delivery_otp}
                </div>
              </div>
            )}

            {/* Courier Details (if Shipped) */}
            {trackingData.tracking_number && (
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: '700', marginBottom: '4px' }}>
                    🚚 Courier: {trackingData.courier_name || 'Express Courier'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803D' }}>
                    Tracking No: <strong style={{ letterSpacing: '0.5px' }}>{trackingData.tracking_number}</strong>
                  </div>
                </div>

                {trackingData.tracking_url && (
                  <a
                    href={trackingData.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#16A34A', boxShadow: 'none' }}
                  >
                    <span>Track on Courier Site</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            {/* Step-by-Step 8 Milestones Timeline */}
            <div style={{ marginBottom: '35px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Delivery Progress</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                {trackingData.timeline?.map((step, idx) => {
                  const isDone = step.is_completed;
                  const isCurrent = step.is_current;

                  return (
                    <div key={step.key} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: idx === trackingData.timeline.length - 1 ? 0 : '24px' }}>
                      {/* Connecting Line */}
                      {idx !== trackingData.timeline.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '26px',
                          left: '13px',
                          width: '2px',
                          bottom: '0',
                          backgroundColor: isDone ? 'var(--accent-mint)' : '#E2E8F0',
                          zIndex: 1
                        }} />
                      )}

                      {/* Icon */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isDone ? 'var(--accent-mint)' : isCurrent ? 'var(--primary)' : '#F1F5F9',
                        color: isDone || isCurrent ? '#FFFFFF' : '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none',
                        flexShrink: 0
                      }}>
                        {isDone ? <CheckCircle2 size={18} /> : isCurrent ? <Clock size={16} /> : <Circle size={10} />}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: isCurrent || isDone ? '700' : '500',
                          color: isCurrent ? 'var(--primary)' : isDone ? '#1E293B' : '#94A3B8',
                          lineHeight: '1.2'
                        }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Destination Address & Items */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
              borderTop: '1px solid var(--border-soft)',
              paddingTop: '24px'
            }}>
              <div>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>
                  Delivery Destination
                </h4>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                  <strong>{trackingData.customer_name}</strong><br />
                  {trackingData.house_no}, {trackingData.street}, {trackingData.area}<br />
                  {trackingData.city}, {trackingData.district}, {trackingData.state} - <strong>{trackingData.pincode}</strong>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748B', marginBottom: '8px' }}>
                  Gifts in this Order ({trackingData.items?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#334155' }}>
                  {trackingData.items?.map(it => (
                    <div key={it.id}>
                      • {it.product_name} (Qty: {it.quantity})
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
