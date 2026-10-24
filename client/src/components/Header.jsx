import React, { useState } from 'react';
import { ShoppingBag, Search, Sparkles, Menu, X, Gift, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Header({ currentPath, onNavigate }) {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Shop All Gifts', path: '/shop' },
    { label: 'Track Order', path: '/track-order' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 900, background: '#FFFFFF', boxShadow: '0 4px 20px rgba(255, 107, 139, 0.08)' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #FF5E7E 0%, #FF8E53 50%, #4D96FF 100%)',
        color: '#FFFFFF',
        padding: '7px 15px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <Sparkles size={14} />
        <span>Free Express Delivery on orders above ₹499! • 100% Joy Guaranteed 🎈</span>
        <Sparkles size={14} />
      </div>

      {/* Main Nav Bar */}
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: '20px' }}>
        
        {/* Logo */}
        <div 
          onClick={() => onNavigate('/')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FF6B8B 0%, #FFD166 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 6px 15px rgba(255, 94, 126, 0.35)',
            fontSize: '22px'
          }}>
            🎁
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '22px',
              fontWeight: '700',
              color: '#1E293B',
              letterSpacing: '-0.5px',
              lineHeight: '1.1'
            }}>
              Giggle <span style={{ color: 'var(--primary)' }}>&amp; Bloom</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Kids Gift Shop
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }} className="desktop-only">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => { e.preventDefault(); onNavigate(item.path); }}
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '15px',
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? 'var(--primary)' : '#475569',
                  transition: 'color 0.2s',
                  position: 'relative',
                  padding: '6px 2px'
                }}
              >
                {item.label}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--primary)'
                  }} />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Section: Search & Cart & Admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="desktop-only" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search cute gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '9px 16px 9px 38px',
                borderRadius: '50px',
                border: '1.5px solid var(--border-soft)',
                fontSize: '13px',
                width: '190px',
                outline: 'none',
                transition: 'all 0.2s',
                backgroundColor: '#F8FAFC'
              }}
              onFocus={(e) => { e.target.style.width = '240px'; e.target.style.borderColor = 'var(--primary)'; }}
              onBlur={(e) => { e.target.style.width = '190px'; e.target.style.borderColor = 'var(--border-soft)'; }}
            />
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
          </form>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '50px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              fontWeight: '700',
              fontSize: '14px',
              border: '1px solid var(--primary-border)',
              transition: 'var(--transition-bounce)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ShoppingBag size={18} />
            <span className="desktop-only">Cart</span>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '800',
                boxShadow: '0 2px 6px rgba(255, 94, 126, 0.4)'
              }}>
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-only"
            style={{ padding: '8px', color: '#1E293B' }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--border-soft)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '40px' }}
            />
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          </form>

          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => { e.preventDefault(); onNavigate(item.path); setMobileMenuOpen(false); }}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '17px',
                fontWeight: '600',
                color: currentPath === item.path ? 'var(--primary)' : '#1E293B',
                padding: '8px 0',
                borderBottom: '1px solid #F1F5F9'
              }}
            >
              {item.label}
            </a>
          ))}

          <a
            href="/admin"
            onClick={(e) => { e.preventDefault(); onNavigate('/admin'); setMobileMenuOpen(false); }}
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#64748B',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔐 Admin Dashboard
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 861px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </header>
  );
}
