import React, { useState, useEffect } from 'react';
import { BarChart2, DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        if (resData.success) {
          setData(resData.analytics);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '50px', textAlign: 'center' }}>
        <div style={{ fontWeight: '700', color: '#64748B' }}>Calculating store analytics...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Sales (Verified)', value: `₹${data.totalSales}`, icon: DollarSign, color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'Total Orders', value: data.totalOrders, icon: ShoppingCart, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
    { label: 'Pending Payments', value: data.pendingPayments, icon: Clock, color: '#F59E0B', bg: '#FFF8E7' },
    { label: 'Delivered Orders', value: data.deliveredOrders, icon: CheckCircle2, color: '#10B981', bg: '#E6FAF4' }
  ];

  const orderStatusBreakdown = [
    { label: 'New / Accepted Orders', count: data.newOrders, color: '#3B82F6' },
    { label: 'Processing & Packed', count: data.processingOrders, color: '#8B5CF6' },
    { label: 'Shipped & Out for Delivery', count: data.shippedOrders, color: '#F97316' },
    { label: 'Delivered', count: data.deliveredOrders, color: '#10B981' },
    { label: 'Cancelled', count: data.cancelledOrders, color: '#EF4444' }
  ];

  const productInventoryBreakdown = [
    { label: 'Total Active Products', count: data.totalProducts, color: '#3B82F6' },
    { label: 'Available (In Stock)', count: data.availableProducts, color: '#10B981' },
    { label: 'Sold Out Products', count: data.soldOutProducts, color: '#EF4444' },
    { label: 'Archived Products', count: data.archivedProducts, color: '#64748B' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '4px' }}>Store Analytics</h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
          High-level overview of revenue, order progression, and inventory metrics.
        </p>
      </div>

      {/* 4 Key Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                backgroundColor: c.bg,
                color: c.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                  {c.label}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: '800', color: '#1E293B', marginTop: '2px' }}>
                  {c.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdowns Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {/* Order Lifecycle Breakdown */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '18px', color: '#1E293B', marginBottom: '20px' }}>
            Orders by Lifecycle Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {orderStatusBreakdown.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '16px', color: '#1E293B' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Inventory Breakdown */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '18px', color: '#1E293B', marginBottom: '20px' }}>
            Product Inventory Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {productInventoryBreakdown.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '16px', color: '#1E293B' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
