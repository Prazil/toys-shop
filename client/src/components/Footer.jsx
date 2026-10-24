import React from 'react';
import { Heart, ShieldCheck, Truck, Sparkles, RefreshCw, Smartphone } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border-soft)', marginTop: '80px' }}>
      
      {/* Customer Trust Highlights */}
      <div style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid #FFE4E6', padding: '40px 20px' }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Truck size={24} />
            </div>
            <h4 style={{ fontSize: '16px', margin: 0 }}>Free Delivery Above ₹499</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>Safe, sanitized & express packaging to your doorstep.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#EBF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
              <ShieldCheck size={24} />
            </div>
            <h4 style={{ fontSize: '16px', margin: 0 }}>100% Kid-Safe Quality</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>Non-toxic materials, durable & parent-approved.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#E6FAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#038A65' }}>
              <Smartphone size={24} />
            </div>
            <h4 style={{ fontSize: '16px', margin: 0 }}>Instant UPI Payments</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>Pay safely via GPay, PhonePe, Paytm or BHIM UPI.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B26A00' }}>
              <Sparkles size={24} />
            </div>
            <h4 style={{ fontSize: '16px', margin: 0 }}>Big Smiles Guaranteed</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>Every gift is selected to spark wonder and laughter.</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container" style={{ padding: '60px 20px 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px'
        }}>
          {/* Brand Info */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>🎁</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: '700' }}>
                Giggle <span style={{ color: 'var(--primary)' }}>&amp; Bloom</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
              Little Gifts, Big Smiles! Discover cute, fun and memorable gifts for every special moment in your child's life.
            </p>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              📍 108 Rainbow Valley, Bangalore, Karnataka - 560001<br />
              📞 +91 98765 43210<br />
              ✉️ hello@giggleandbloom.com
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '17px', marginBottom: '16px', color: '#1E293B' }}>Explore Gifts</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><a href="/shop" onClick={(e) => { e.preventDefault(); onNavigate('/shop'); }}>All Gifts &amp; Toys</a></li>
              <li><a href="/shop?category=birthday-gifts" onClick={(e) => { e.preventDefault(); onNavigate('/shop?category=birthday-gifts'); }}>Birthday Specials</a></li>
              <li><a href="/shop?category=soft-toys" onClick={(e) => { e.preventDefault(); onNavigate('/shop?category=soft-toys'); }}>Cuddly Soft Toys</a></li>
              <li><a href="/shop?category=educational-gifts" onClick={(e) => { e.preventDefault(); onNavigate('/shop?category=educational-gifts'); }}>Learning &amp; STEM</a></li>
              <li><a href="/shop?category=return-gifts" onClick={(e) => { e.preventDefault(); onNavigate('/shop?category=return-gifts'); }}>Return Gifts</a></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 style={{ fontSize: '17px', marginBottom: '16px', color: '#1E293B' }}>Customer Care</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><a href="/track-order" onClick={(e) => { e.preventDefault(); onNavigate('/track-order'); }}>Track Your Order</a></li>
              <li><a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('/about'); }}>About Us</a></li>
              <li><a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }}>Contact Support</a></li>
              <li><a href="/privacy-policy" onClick={(e) => { e.preventDefault(); onNavigate('/privacy-policy'); }}>Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => { e.preventDefault(); onNavigate('/terms'); }}>Terms &amp; Conditions</a></li>
              <li><a href="/refund-policy" onClick={(e) => { e.preventDefault(); onNavigate('/refund-policy'); }}>Refund / Cancellation Policy</a></li>
            </ul>
          </div>

          {/* Merchant UPI Details */}
          <div>
            <h4 style={{ fontSize: '17px', marginBottom: '16px', color: '#1E293B' }}>Secure Payments</h4>
            <p style={{ fontSize: '13px', marginBottom: '12px' }}>
              We accept direct, 100% verified online UPI payments:
            </p>
            <div style={{
              background: '#F8FAFC',
              border: '1.5px dashed var(--primary-border)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '700' }}>Official Merchant UPI ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>prazilss4@oksbi</div>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              🔒 Server-verified transactions. No fake screenshots accepted.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid #F1F5F9',
          marginTop: '50px',
          paddingTop: '25px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '13px',
          color: '#94A3B8'
        }}>
          <div>
            © 2026 Giggle &amp; Bloom Kids Gift Shop. All rights reserved. Made with <Heart size={14} color="var(--primary)" style={{ display: 'inline', verticalAlign: 'middle' }} /> for little smiles.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href="/admin" onClick={(e) => { e.preventDefault(); onNavigate('/admin'); }} style={{ color: '#64748B', fontWeight: '600' }}>
              🔐 Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
