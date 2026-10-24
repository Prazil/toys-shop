import React, { useState } from 'react';

export default function PolicyPages({ initialTab = 'privacy' }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div style={{ padding: '60px 20px 90px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '40px'
        }}>
          <button
            onClick={() => setTab('privacy')}
            className={`btn btn-sm ${tab === 'privacy' ? 'btn-primary' : 'btn-outline'}`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setTab('terms')}
            className={`btn btn-sm ${tab === 'terms' ? 'btn-primary' : 'btn-outline'}`}
          >
            Terms &amp; Conditions
          </button>
          <button
            onClick={() => setTab('refund')}
            className={`btn btn-sm ${tab === 'refund' ? 'btn-primary' : 'btn-outline'}`}
          >
            Refund &amp; Cancellation
          </button>
        </div>

        {/* Content Box */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px 35px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          lineHeight: '1.8',
          color: '#334155',
          fontSize: '15px'
        }}>
          
          {tab === 'privacy' && (
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '16px', color: '#1E293B' }}>Privacy Policy</h1>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>Last updated: October 2026</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>1. Information We Collect</h3>
              <p>When you place an order at Giggle &amp; Bloom Kids Gift Shop, we collect essential delivery details: your full name, shipping address, mobile phone number, and email address. We do not store sensitive credit card or netbanking passwords.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>2. How We Use Your Data</h3>
              <p>Your details are used solely to process, pack, and ship your gifts, send SMS and email dispatch notifications, sync order records securely to Google Sheets, and provide prompt customer support.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>3. Data Protection</h3>
              <p>We implement standard cryptographic HTTPS security and strict server authentication to safeguard your information. We never sell, lease, or distribute your personal data to third-party marketing companies.</p>
            </div>
          )}

          {tab === 'terms' && (
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '16px', color: '#1E293B' }}>Terms &amp; Conditions</h1>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>Last updated: October 2026</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>1. Store Orders &amp; Online Payment</h3>
              <p>All purchases made on Giggle &amp; Bloom are online only. Payment must be confirmed via authentic UPI (Merchant ID: <strong>prazilss4@oksbi</strong>) or verified payment gateway. Orders are accepted subject to product availability and stock validation.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>2. Pricing &amp; Products</h3>
              <p>Prices are listed in Indian Rupees (₹ INR) inclusive of applicable taxes. In the event of a technical pricing error, we reserve the right to contact the buyer prior to dispatch.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>3. Delivery Timelines</h3>
              <p>Standard delivery is completed within 3 to 5 business days across major cities in India. Remote locations may take additional transit time.</p>
            </div>
          )}

          {tab === 'refund' && (
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '16px', color: '#1E293B' }}>Refund &amp; Cancellation Policy</h1>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>Last updated: October 2026</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>1. Order Cancellation</h3>
              <p>You may request cancellation of an order before it is packed or shipped by emailing <a href="mailto:hello@giggleandbloom.com" style={{ color: 'var(--primary)', fontWeight: '700' }}>hello@giggleandbloom.com</a> with your Order ID. Once an order is shipped, cancellation is not possible.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>2. Damaged or Defective Items</h3>
              <p>We inspect every toy and gift before packing. However, in the unlikely event an item arrives damaged in transit, please share an unboxing photo or video within 48 hours of delivery for an immediate free replacement or full refund.</p>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginTop: '20px', marginBottom: '8px' }}>3. Refund Timeline</h3>
              <p>Approved refunds are credited directly back to the original source UPI account or bank account within 3 to 5 business days.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
