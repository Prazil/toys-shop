import React from 'react';
import { Package, ShoppingCart, Tag, CreditCard, BarChart2, Settings, LogOut, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout({ activeTab = 'products', onTabChange, onNavigate, children }) {
  const { admin, logout } = useAuth();

  const navTabs = [
    { id: 'products', label: 'Product Management', icon: Package, default: true },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleLogout = async () => {
    await logout();
    onNavigate('/admin/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Admin Bar */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 500
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF6B8B 0%, #FFD166 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              🎁
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '800', color: '#1E293B', lineHeight: '1.2' }}>
                Admin Dashboard
              </div>
              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                Default: Product Management
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => onNavigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <span>View Store</span>
              <ExternalLink size={14} />
            </button>

            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Logged in as: <strong>{admin?.username || 'admin'}</strong>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          marginTop: '12px',
          paddingTop: '6px',
          borderTop: '1px solid #F1F5F9'
        }}>
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  fontFamily: 'var(--font-heading)',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.default && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '50px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#FFE4E6',
                    color: isActive ? '#FFFFFF' : 'var(--primary)'
                  }}>
                    DEFAULT
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '30px 24px' }}>
        <div className="container" style={{ maxWidth: '1300px' }}>
          {children}
        </div>
      </main>

    </div>
  );
}
