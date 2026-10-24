import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Gift, Star, ShieldCheck, Heart, Truck, Cake, Smile } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function HomePage({ onNavigate }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch categories
        const catRes = await fetch('/api/categories');
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories || []);
        }

        // Fetch products
        const prodRes = await fetch('/api/products?limit=12');
        const prodData = await prodRes.json();
        if (prodData.success) {
          const prods = prodData.products || [];
          setFeaturedProducts(prods.filter(p => p.is_featured === 1 || p.is_bestseller === 1));
          setNewArrivals(prods);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(180deg, #FFF5F7 0%, #FFFDF9 100%)',
        padding: '60px 20px 80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Playful Floating Decorations */}
        <div style={{ position: 'absolute', top: '15%', left: '5%', fontSize: '32px', opacity: 0.6 }} className="floating-icon">🎈</div>
        <div style={{ position: 'absolute', top: '25%', right: '7%', fontSize: '28px', opacity: 0.6 }} className="floating-icon">⭐</div>
        <div style={{ position: 'absolute', bottom: '10%', left: '10%', fontSize: '26px', opacity: 0.5 }} className="floating-icon">✨</div>
        <div style={{ position: 'absolute', bottom: '15%', right: '12%', fontSize: '30px', opacity: 0.5 }} className="floating-icon">🧸</div>

        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          gap: '50px'
        }}>
          {/* Left Text */}
          <div style={{ zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FFE4E6',
              color: 'var(--primary)',
              padding: '8px 18px',
              borderRadius: '50px',
              fontWeight: '700',
              fontSize: '13px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '20px'
            }}>
              <Sparkles size={16} />
              <span>Premium Kids Gift Shop</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 5.5vw, 56px)',
              fontWeight: '700',
              color: '#1E293B',
              lineHeight: '1.15',
              marginBottom: '20px',
              letterSpacing: '-1px'
            }}>
              Little Gifts,<br />
              <span style={{
                background: 'linear-gradient(135deg, #FF5E7E 0%, #FF8E53 50%, #FFBE0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Big Smiles!
              </span>
            </h1>

            <p style={{
              fontSize: '18px',
              color: '#64748B',
              lineHeight: '1.6',
              marginBottom: '32px',
              maxWidth: '500px'
            }}>
              Discover cute, fun and memorable gifts for every special moment. Curated toys, plushies, birthday hampers, and educational wonders.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <button 
                onClick={() => onNavigate('/shop')}
                className="btn btn-primary btn-lg"
              >
                <span>Shop Now</span>
                <ArrowRight size={20} />
              </button>

              <button 
                onClick={() => onNavigate('/track-order')}
                className="btn btn-outline"
                style={{ padding: '16px 26px', fontSize: '16px' }}
              >
                <Truck size={18} />
                <span>Track Order</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{
              display: 'flex',
              gap: '30px',
              marginTop: '40px',
              paddingTop: '30px',
              borderTop: '1px solid rgba(255, 94, 126, 0.15)'
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: '700', color: '#1E293B' }}>100%</div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>Kid-Safe Quality</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: '700', color: 'var(--primary)' }}>₹499+</div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>Free Express Delivery</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: '700', color: 'var(--secondary)' }}>Instant</div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>UPI Payments</div>
              </div>
            </div>
          </div>

          {/* Right Visual Banner */}
          <div style={{ display: 'flex', justifyContent: 'center', zIndex: 2 }}>
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              background: 'linear-gradient(135deg, #FFE8EC 0%, #FFF3D6 50%, #EBF3FF 100%)',
              borderRadius: '36px',
              padding: '40px 30px',
              boxShadow: '0 20px 50px rgba(255, 94, 126, 0.15)',
              border: '2px solid #FFFFFF',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '90px', marginBottom: '15px' }} className="floating-icon">
                🎁
              </div>
              <h3 style={{ fontSize: '24px', color: '#1E293B', marginBottom: '10px' }}>
                Handpicked With Love
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                Every gift is packaged with festive wrapping, confetti cheer, and a personalized smile card!
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '50px',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--primary)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)'
              }}>
                <Sparkles size={16} />
                <span>Verified Online UPI Payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section style={{ padding: '40px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-soft)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', margin: 0 }}>Gift Categories</h2>
              <p style={{ fontSize: '14px', margin: '4px 0 0' }}>Explore gifts tailored by category</p>
            </div>
            <button 
              onClick={() => onNavigate('/shop')}
              style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '16px'
          }}>
            {categories.map((cat, idx) => {
              const icons = ['🧸', '🎀', '🎂', '🎁', '🧩', '🎉', '🎨', '✨', '👜', '📦'];
              const icon = icons[idx % icons.length];
              return (
                <div
                  key={cat.id}
                  onClick={() => onNavigate(`/shop?category=${cat.id}`)}
                  style={{
                    backgroundColor: '#FFF9F5',
                    borderRadius: '18px',
                    padding: '20px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #FFE4E6',
                    transition: 'var(--transition-bounce)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#FFE4E6';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                    {cat.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products / New Arrivals */}
      <section style={{ padding: '70px 20px', backgroundColor: 'var(--bg-body)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
            <span className="badge badge-featured" style={{ marginBottom: '12px' }}>Curated Gifts</span>
            <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Featured Treasures</h2>
            <p style={{ fontSize: '16px' }}>Hand-selected gifts bringing genuine wonder and joy to little hearts.</p>
          </div>

          {loading ? (
            <div className="grid-products">
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ height: '340px' }} className="skeleton" />
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            /* EMPTY PRODUCT STATE (As mandated: no fake products!) */
            <div style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '2px dashed var(--primary-border)',
              padding: '60px 20px',
              textAlign: 'center',
              maxWidth: '650px',
              margin: '0 auto'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎈</div>
              <h3 style={{ fontSize: '24px', color: '#1E293B', marginBottom: '10px' }}>
                No gifts available right now. Check back soon!
              </h3>
              <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '440px', margin: '0 auto 24px' }}>
                Our shopkeepers are curating new toys and surprises. Please check back shortly, or log in to the admin portal to publish gifts.
              </p>
              <button
                onClick={() => onNavigate('/admin')}
                className="btn btn-outline"
                style={{ fontSize: '14px' }}
              >
                🔐 Go to Admin Product Management
              </button>
            </div>
          ) : (
            <div className="grid-products">
              {newArrivals.map(prod => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}

          {newArrivals.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                onClick={() => onNavigate('/shop')}
                className="btn btn-secondary btn-lg"
              >
                <span>Explore Full Gift Collection</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Promotional Banner */}
      <section style={{ padding: '0 20px 70px' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%)',
            borderRadius: '28px',
            padding: '50px 40px',
            color: '#FFFFFF',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '30px',
            boxShadow: '0 20px 40px rgba(255, 94, 126, 0.25)'
          }}>
            <div>
              <div style={{
                display: 'inline-block',
                backgroundColor: 'rgba(255,255,255,0.25)',
                padding: '6px 16px',
                borderRadius: '50px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '14px'
              }}>
                🎉 Birthday Special
              </div>
              <h2 style={{ fontSize: '32px', color: '#FFFFFF', marginBottom: '10px' }}>
                Planning a Birthday or Kids Party?
              </h2>
              <p style={{ fontSize: '16px', color: '#FFE4E6', maxWidth: '550px', margin: 0 }}>
                We curate custom return gift hampers, themed birthday packages, and bulk sets for schools &amp; celebrations!
              </p>
            </div>

            <button
              onClick={() => onNavigate('/contact')}
              className="btn btn-accent btn-lg"
              style={{ color: '#1F2430' }}
            >
              <span>Get Custom Hamper Quote</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
