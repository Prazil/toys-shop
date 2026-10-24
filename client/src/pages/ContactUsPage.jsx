import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function ContactUsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Question',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ padding: '60px 20px 90px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <span className="badge badge-featured" style={{ marginBottom: '12px' }}>We are Here to Help</span>
          <h1 style={{ fontSize: '36px', marginBottom: '10px', color: '#1E293B' }}>
            Get in Touch With Us 💌
          </h1>
          <p style={{ color: '#64748B', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
            Have a question about a gift, need custom birthday hampers, or want order assistance? Send us a message!
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px',
          alignItems: 'start'
        }}>
          
          {/* Contact Details Column */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '35px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#1E293B' }}>Store Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Store Location</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: '600' }}>
                    108 Rainbow Valley, Wonderpark<br />
                    Bangalore, Karnataka - 560001
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#EBF3FF', color: 'var(--secondary)' }}>
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Phone &amp; WhatsApp</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: '600' }}>
                    +91 98765 43210
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Quick reply via WhatsApp available</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#FFF8E7', color: '#B26A00' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Email Support</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: '600' }}>
                    hello@giggleandbloom.com
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#E6FAF4', color: '#038A65' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Customer Care Hours</div>
                  <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: '600' }}>
                    Monday - Saturday: 9:00 AM - 7:00 PM IST
                  </div>
                </div>
              </div>
            </div>

            {/* UPI Info Box */}
            <div style={{
              marginTop: '30px',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: '#FFF9F5',
              border: '1.5px dashed var(--primary-border)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Official Merchant UPI</div>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '800', color: 'var(--primary)' }}>prazilss4@oksbi</div>
            </div>
          </div>

          {/* Form Column */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '35px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                <CheckCircle2 size={54} color="#10B981" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '22px', marginBottom: '10px' }}>Thank You for Reaching Out!</h3>
                <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
                  We have received your message and will respond within 2-4 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn btn-outline"
                  style={{ marginTop: '20px' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#1E293B' }}>Send a Message</h3>

                <div className="input-group">
                  <label className="input-label">Your Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-control"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="input-group">
                    <label className="input-label">Email Address <span className="req">*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-control"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-control"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Inquiry Type</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-control"
                  >
                    <option value="General Question">General Question</option>
                    <option value="Birthday Bulk / Return Gifts">Birthday Bulk / Return Gifts</option>
                    <option value="Order Tracking / Delivery">Order Tracking / Delivery</option>
                    <option value="Custom Gift Hamper">Custom Gift Hamper</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Your Message <span className="req">*</span></label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us how we can help make a child smile..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-control"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                  <Send size={16} />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
