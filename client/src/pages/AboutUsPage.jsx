import React from 'react';
import { Heart, Sparkles, Smile, ShieldCheck, Gift, Star, Award } from 'lucide-react';

export default function AboutUsPage({ onNavigate }) {
  return (
    <div style={{ padding: '60px 20px 90px', backgroundColor: 'var(--bg-body)' }}>
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Hero Banner */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <span className="badge badge-featured" style={{ marginBottom: '14px' }}>Our Joyful Story</span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', marginBottom: '16px', color: '#1E293B' }}>
            Little Gifts, Big Smiles! 🎈
          </h1>
          <p style={{ fontSize: '18px', color: '#64748B', lineHeight: '1.7', maxWidth: '650px', margin: '0 auto' }}>
            Welcome to <strong>Giggle &amp; Bloom</strong> — a magical kids gift boutique dedicated to bringing spark, laughter, and wonder to children of all ages.
          </p>
        </div>

        {/* Story Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '30px',
          padding: '40px 35px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '40px'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#1E293B' }}>Why We Started Giggle &amp; Bloom</h2>
          <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#475569', marginBottom: '18px' }}>
            Finding a gift for a child should feel joyful, not stressful. Too often, online gift shops offer generic plastic toys with questionable safety standards or dull packaging. We created Giggle &amp; Bloom to change that.
          </p>
          <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#475569', marginBottom: '24px' }}>
            Every single gift in our store is handpicked for safety, creative value, and durability. Whether it's an ultra-cuddly teddy bear, an exciting STEM puzzle kit, or customized birthday hampers, our goal is to light up a little one’s eyes the second they unwrap their box.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginTop: '30px',
            paddingTop: '25px',
            borderTop: '1px solid var(--border-soft)'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#FFE4E6', color: 'var(--primary)' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', margin: '0 0 4px' }}>100% Non-Toxic &amp; Safe</h4>
                <p style={{ fontSize: '13px', margin: 0, color: '#64748B' }}>Certified materials adhering to strict child safety norms.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#EBF3FF', color: 'var(--secondary)' }}>
                <Gift size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', margin: '0 0 4px' }}>Festive Gift Packaging</h4>
                <p style={{ fontSize: '13px', margin: 0, color: '#64748B' }}>Wrapped with colorful paper, ribbons, and custom note.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: '#FFF8E7', color: '#B26A00' }}>
                <Smile size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', margin: '0 0 4px' }}>Child &amp; Parent Approved</h4>
                <p style={{ fontSize: '13px', margin: 0, color: '#64748B' }}>Designed to withstand energetic play and spark imagination.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => onNavigate('/shop')} className="btn btn-primary btn-lg">
            <span>Explore Our Gift Collection</span>
          </button>
        </div>

      </div>
    </div>
  );
}
