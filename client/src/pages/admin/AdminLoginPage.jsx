import React, { useState } from 'react';
import { Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(username.trim(), password);
    setLoading(false);

    if (res.success) {
      // RULE: LAND DIRECTLY ON PRODUCT MANAGEMENT!
      onNavigate('/admin/products');
    } else {
      setError(res.message || 'Invalid admin credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: 'var(--bg-body)'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '28px',
        padding: '40px 32px',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center'
      }}>
        
        {/* Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #FF6B8B 0%, #FFD166 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 16px',
          boxShadow: '0 8px 20px rgba(255, 94, 126, 0.3)'
        }}>
          🔐
        </div>

        <h2 style={{ fontSize: '26px', color: '#1E293B', marginBottom: '6px' }}>
          Admin Portal
        </h2>
        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '28px' }}>
          Giggle &amp; Bloom Store Administration
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="input-group">
            <label className="input-label">Username or Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="input-control"
                style={{ paddingLeft: '40px' }}
              />
              <User size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-control"
                style={{ paddingLeft: '40px' }}
              />
              <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '10px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Product Management'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{
          marginTop: '25px',
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: '#F8FAFC',
          fontSize: '12px',
          color: '#64748B'
        }}>
          Default credentials: <strong>admin</strong> / <strong>admin123</strong>
        </div>

        <button
          onClick={() => onNavigate('/')}
          style={{
            marginTop: '20px',
            fontSize: '13px',
            color: '#94A3B8',
            fontWeight: '600'
          }}
        >
          ← Return to Customer Storefront
        </button>

      </div>
    </div>
  );
}
