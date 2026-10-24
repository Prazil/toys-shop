import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Lock, Check, Copy, ExternalLink, QrCode, Smartphone, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CheckoutPage({ onNavigate }) {
  const { cartItems, subtotal, discountTotal, itemsTotal, shippingFee, grandTotal, clearCart } = useCart();

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    house_no: '',
    street: '',
    area: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
    order_notes: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Modal State
  const [activeOrder, setActiveOrder] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  if (cartItems.length === 0 && !activeOrder) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🛒</div>
        <h2>Your Cart is Empty</h2>
        <p style={{ color: '#64748B', marginBottom: '24px' }}>Add some cheerful gifts before checking out!</p>
        <button onClick={() => onNavigate('/shop')} className="btn btn-primary">
          Browse Gifts
        </button>
      </div>
    );
  }

  const validate = () => {
    const errors = {};
    if (!formData.customer_name.trim()) errors.customer_name = 'Full name is required';
    if (!formData.customer_phone.trim()) {
      errors.customer_phone = 'Mobile number is required';
    } else if (!/^(91)?[6-9]\d{9}$/.test(formData.customer_phone.replace(/[\s\-\+]/g, ''))) {
      errors.customer_phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!formData.customer_email.trim()) {
      errors.customer_email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email.trim())) {
      errors.customer_email = 'Enter a valid email address';
    }
    if (!formData.house_no.trim()) errors.house_no = 'House / Door number is required';
    if (!formData.street.trim()) errors.street = 'Street is required';
    if (!formData.area.trim()) errors.area = 'Area / Locality is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.district.trim()) errors.district = 'District is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.pincode.trim()) {
      errors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit PIN code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

    try {
      const payload = {
        ...formData,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity
        }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.order) {
        setActiveOrder(data.order);
        clearCart();
      } else {
        setPaymentError(data.message || 'Failed to place order.');
      }
    } catch (err) {
      setPaymentError('Connection error while placing order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('prazilss4@oksbi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      setPaymentError('Please enter a valid 12-digit UPI transaction reference (UTR) from your payment app.');
      return;
    }

    setUtrSubmitting(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/payments/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: activeOrder.order_id,
          utr_number: utrNumber.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        // Navigate to Order Confirmation
        onNavigate(`/order-confirmation/${activeOrder.order_id}`);
      } else {
        setPaymentError(data.message || 'Failed to record transaction reference.');
      }
    } catch (err) {
      setPaymentError('Error recording reference. Please try again.');
    } finally {
      setUtrSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px 80px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container">
        
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '6px' }}>Checkout &amp; Online Payment</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>
            🔒 100% Secure Online Payment via UPI • No Cash on Delivery
          </p>
        </div>

        {paymentError && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '14px 20px',
            borderRadius: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <AlertCircle size={18} />
            <span>{paymentError}</span>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          alignItems: 'start'
        }}>
          
          {/* Left Form: Delivery Address */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span> Delivery Information
            </h3>

            <form onSubmit={handlePlaceOrder}>
              <div className="input-group">
                <label className="input-label">Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="e.g. Priya Sharma"
                  className="input-control"
                />
                {formErrors.customer_name && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.customer_name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Mobile Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                    className="input-control"
                  />
                  {formErrors.customer_phone && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.customer_phone}</span>}
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address <span className="req">*</span></label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="input-control"
                  />
                  {formErrors.customer_email && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.customer_email}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">House / Flat / Door No <span className="req">*</span></label>
                  <input
                    type="text"
                    name="house_no"
                    value={formData.house_no}
                    onChange={handleChange}
                    placeholder="e.g. 402, Sunshine Apts"
                    className="input-control"
                  />
                  {formErrors.house_no && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.house_no}</span>}
                </div>

                <div className="input-group">
                  <label className="input-label">Street / Road <span className="req">*</span></label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="e.g. 5th Main Road"
                    className="input-control"
                  />
                  {formErrors.street && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.street}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Area / Locality <span className="req">*</span></label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    placeholder="e.g. Indiranagar"
                    className="input-control"
                  />
                  {formErrors.area && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.area}</span>}
                </div>

                <div className="input-group">
                  <label className="input-label">City <span className="req">*</span></label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Bangalore"
                    className="input-control"
                  />
                  {formErrors.city && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.city}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="input-group">
                  <label className="input-label">District <span className="req">*</span></label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="District"
                    className="input-control"
                  />
                  {formErrors.district && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.district}</span>}
                </div>

                <div className="input-group">
                  <label className="input-label">State <span className="req">*</span></label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Karnataka"
                    className="input-control"
                  />
                  {formErrors.state && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.state}</span>}
                </div>

                <div className="input-group">
                  <label className="input-label">PIN Code <span className="req">*</span></label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="6 digits"
                    maxLength={6}
                    className="input-control"
                  />
                  {formErrors.pincode && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.pincode}</span>}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="e.g. Near Wonderpark Gate 2"
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Order Notes / Gift Message (Optional)</label>
                <textarea
                  name="order_notes"
                  value={formData.order_notes}
                  onChange={handleChange}
                  placeholder="e.g. Happy 5th Birthday Aarav! Please pack with pink ribbon."
                  className="input-control"
                  rows={2}
                />
              </div>

              <div style={{
                backgroundColor: '#FFF9F5',
                border: '1px solid #FFE4E6',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '13px',
                color: '#64748B'
              }}>
                <div style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                  💳 Online Payment Only (UPI)
                </div>
                Cash on delivery is not offered. After clicking below, you will see our verified Merchant UPI ID (<strong>prazilss4@oksbi</strong>) and instant QR code.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', padding: '16px' }}
              >
                <Lock size={18} />
                <span>{isSubmitting ? 'Securing Order...' : `Proceed to Pay ₹${grandTotal}`}</span>
              </button>
            </form>
          </div>

          {/* Right Summary Column */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={20} color="var(--primary)" />
              <span>Order Summary</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px', maxHeight: '350px', overflowY: 'auto' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={item.main_image}
                    alt={item.name}
                    style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B', lineHeight: '1.2' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Qty: {item.quantity} × ₹{item.effective_price}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                    ₹{item.effective_price * item.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: '600', color: '#1E293B' }}>₹{subtotal}</span>
              </div>
              {discountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                  <span>Discount</span>
                  <span style={{ fontWeight: '600' }}>-₹{discountTotal}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Delivery</span>
                <span style={{ fontWeight: '600', color: shippingFee === 0 ? '#10B981' : '#1E293B' }}>
                  {shippingFee === 0 ? 'FREE 🎁' : `₹${shippingFee}`}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '20px',
                fontWeight: '800',
                color: 'var(--primary)',
                borderTop: '1.5px dashed var(--border-soft)',
                paddingTop: '12px',
                marginTop: '6px'
              }}>
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: '#F8FAFC',
              fontSize: '12px',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div>🔒 All payments processed through verified UPI rail</div>
              <div>✨ Orders recorded in real-time with Google Sheets sync</div>
              <div>📦 Dispatched within 24 hours of payment verification</div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================
          ONLINE UPI PAYMENT MODAL (Shown after Order Created)
          ======================================================== */}
      {activeOrder && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px', padding: '32px 28px' }}>
            
            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '28px'
              }}>
                📲
              </div>
              <h2 style={{ fontSize: '24px', margin: '0 0 6px', color: '#1E293B' }}>
                Complete Your UPI Payment
              </h2>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Order ID: <strong style={{ color: '#1E293B' }}>{activeOrder.order_id}</strong>
              </div>
            </div>

            {/* Amount to pay */}
            <div style={{
              backgroundColor: '#FFF9F5',
              border: '2px solid var(--primary-border)',
              borderRadius: '18px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#64748B' }}>Total Amount to Pay</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '34px', fontWeight: '800', color: 'var(--primary)' }}>
                ₹{activeOrder.total_amount}
              </div>
            </div>

            {/* Merchant UPI Details with Copy */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '14px 18px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700' }}>Merchant UPI ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>prazilss4@oksbi</div>
              </div>
              <button
                onClick={handleCopyUpi}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '50px',
                  backgroundColor: copiedUpi ? '#10B981' : 'var(--primary)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  transition: 'all 0.2s'
                }}
              >
                {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
              </button>
            </div>

            {/* Dynamic UPI QR Code */}
            <div style={{
              textAlign: 'center',
              padding: '16px',
              borderRadius: '18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-soft)',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#334155' }}>
                Scan with Any UPI App (GPay, PhonePe, Paytm)
              </div>
              <div style={{ display: 'inline-block', padding: '10px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeOrder.upi_payment_url || `upi://pay?pa=prazilss4@oksbi&am=${activeOrder.total_amount}&tn=${activeOrder.order_id}&cu=INR`)}`}
                  alt="UPI QR Code"
                  style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                />
              </div>
            </div>

            {/* UTR Reference Submission Form */}
            <form onSubmit={handleSubmitUtr} style={{ borderTop: '1px solid #F1F5F9', paddingTop: '18px' }}>
              <div className="input-group">
                <label className="input-label" style={{ color: '#0F172A' }}>
                  Enter 12-Digit UPI Reference Number (UTR) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 428938174921"
                  className="input-control"
                  style={{ letterSpacing: '1px', fontWeight: '700', fontSize: '16px' }}
                />
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Find the 12-digit UTR in your GPay / PhonePe / Paytm payment receipt.
                </div>
              </div>

              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#1E40AF',
                marginBottom: '16px'
              }}>
                🛡️ <strong>Server Verification:</strong> Payments are verified server-side with our banking integration. False submissions are automatically rejected.
              </div>

              <button
                type="submit"
                disabled={utrSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              >
                <span>{utrSubmitting ? 'Verifying Reference...' : 'Submit Transaction Reference'}</span>
                <ArrowRight size={18} />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
