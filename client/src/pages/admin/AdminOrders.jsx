import React, { useState, useEffect } from 'react';
import { Search, Eye, Truck, CheckCircle2, Clock, X, AlertCircle, ExternalLink, Calendar, MapPin, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);

  // Selected Order for Details & Status Update
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [bypassOtp, setBypassOtp] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/admin/list?status=${statusFilter}&search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (ord) => {
    setSelectedOrder(ord);
    setNewStatus(ord.order_status);
    setCourierName(ord.courier_name || '');
    setTrackingNumber(ord.tracking_number || '');
    setTrackingUrl(ord.tracking_url || '');
    setEnteredOtp('');
    setBypassOtp(false);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !newStatus) return;

    // Verify Delivery OTP when status is marked Delivered
    if (newStatus === 'Delivered' && selectedOrder.delivery_otp && !bypassOtp) {
      if (enteredOtp.trim() !== selectedOrder.delivery_otp) {
        alert(`⚠️ Delivery OTP Verification Required!\n\nPlease enter the correct 4-digit Delivery OTP (${selectedOrder.delivery_otp}) provided by customer "${selectedOrder.customer_name}", or check "Bypass OTP" for manual delivery.`);
        return;
      }
    }

    setIsUpdating(true);
    try {
      const payload = {
        order_status: newStatus,
        courier_name: courierName.trim(),
        tracking_number: trackingNumber.trim(),
        tracking_url: trackingUrl.trim(),
        delivery_otp_verified: bypassOtp ? 'BYPASSED' : 'VERIFIED'
      };

      const res = await fetch(`/api/orders/admin/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showNotification(`Order status updated to "${newStatus}". Customer notified via Email & WhatsApp, Google Sheets synced! 🎉`);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert(data.message || 'Failed to update order.');
      }
    } catch (err) {
      alert('Error updating order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const statuses = [
    'all',
    'Payment Pending',
    'Payment Verified',
    'Order Accepted',
    'Processing',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '4px' }}>Order Management</h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
          View customer orders, verify details, and advance orders through the fulfillment pipeline.
        </p>
      </div>

      {notification && (
        <div style={{
          backgroundColor: '#E6FAF4',
          color: '#038A65',
          border: '1px solid #A7F3D0',
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>✨</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Filter Row */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        padding: '16px 20px',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-xs)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '50px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--primary)' : 'var(--border-soft)',
                backgroundColor: statusFilter === st ? 'var(--primary-light)' : '#FFFFFF',
                color: statusFilter === st ? 'var(--primary)' : '#64748B',
                cursor: 'pointer'
              }}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '250px' }}>
          <input
            type="text"
            placeholder="Search order ID, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchOrders(); }}
            className="input-control"
            style={{ paddingLeft: '36px', paddingRight: '12px', paddingBottom: '8px', paddingTop: '8px', fontSize: '13px' }}
          />
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#64748B' }}>Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '60px 20px',
          border: '2px dashed var(--border-soft)',
          textAlign: 'center',
          maxWidth: '550px',
          margin: '20px auto'
        }}>
          <div style={{ fontSize: '46px', marginBottom: '14px' }}>🛍️</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#1E293B' }}>No orders found</h3>
          <p style={{ color: '#64748B', fontSize: '14px' }}>
            New customer purchases will appear here in real-time.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid var(--border-soft)', color: '#64748B', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 20px' }}>Order ID</th>
                  <th style={{ padding: '16px 14px' }}>Customer</th>
                  <th style={{ padding: '16px 14px' }}>Items</th>
                  <th style={{ padding: '16px 14px' }}>Total Amount</th>
                  <th style={{ padding: '16px 14px' }}>Payment Status</th>
                  <th style={{ padding: '16px 14px' }}>Order Status</th>
                  <th style={{ padding: '16px 14px' }}>Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(ord => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--primary)' }}>
                      {ord.order_id}
                    </td>

                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ fontWeight: '700', color: '#1E293B' }}>{ord.customer_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{ord.customer_phone}</div>
                    </td>

                    <td style={{ padding: '14px 14px', color: '#475569' }}>
                      {ord.item_count} gift{ord.item_count === 1 ? '' : 's'}
                    </td>

                    <td style={{ padding: '14px 14px', fontWeight: '800', color: '#1E293B' }}>
                      ₹{ord.total_amount}
                    </td>

                    <td style={{ padding: '14px 14px' }}>
                      <span className={`badge ${ord.payment_status === 'Verified' ? 'badge-new' : 'badge-bestseller'}`}>
                        {ord.payment_status}
                      </span>
                      {ord.payment_ref && (
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          UTR: {ord.payment_ref}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 14px' }}>
                      <span className={`badge ${ord.order_status === 'Delivered' ? 'badge-new' : ord.order_status === 'Cancelled' ? 'badge-soldout' : 'badge-featured'}`}>
                        {ord.order_status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 14px', fontSize: '12px', color: '#64748B' }}>
                      {new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenDetails(ord)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <Eye size={13} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ORDER DETAILS & STATUS ADVANCEMENT MODAL
          ======================================================== */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '680px', padding: '32px 28px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '22px', margin: 0, color: '#1E293B' }}>
                  Order #{selectedOrder.order_id}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '6px', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            {/* Status Update Form */}
            <form onSubmit={handleUpdateStatus} style={{
              backgroundColor: '#FFF9F5',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid var(--primary-border)',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '15px', color: '#1E293B', marginBottom: '12px' }}>
                Update Order Lifecycle Status:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Order Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-control"
                    style={{ fontWeight: '700' }}
                  >
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Payment Verified">Payment Verified</option>
                    <option value="Order Accepted">Order Accepted</option>
                    <option value="Processing">Processing (Picking &amp; Quality Check)</option>
                    <option value="Packed">Packed with Gift Wrap</option>
                    <option value="Shipped">Shipped (Requires Courier &amp; Tracking)</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered (Completed)</option>
                    <option value="Cancelled">Cancelled (Auto-restocks inventory)</option>
                  </select>
                </div>

                {/* If Shipped, collect courier fields */}
                {newStatus === 'Shipped' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #FFE4E6'
                  }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">Courier Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Blue Dart / Delhivery"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="input-control"
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">Tracking Number</label>
                      <input
                        type="text"
                        placeholder="e.g. BD129384910IN"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="input-control"
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                      <label className="input-label">Tracking URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        className="input-control"
                      />
                    </div>
                  </div>
                )}

                {/* OTP Verification for Delivered Status */}
                {newStatus === 'Delivered' && selectedOrder.delivery_otp && (
                  <div style={{
                    backgroundColor: '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    borderRadius: '14px',
                    padding: '16px',
                    marginTop: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '800', color: '#92400E', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔐</span>
                        <span>Customer Delivery OTP Verification:</span>
                      </label>
                      <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700' }}>
                        Generated OTP: <strong style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{selectedOrder.delivery_otp}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        maxLength="4"
                        placeholder="Enter 4-digit OTP"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        disabled={bypassOtp}
                        className="input-control"
                        style={{
                          maxWidth: '180px',
                          letterSpacing: '4px',
                          fontWeight: '800',
                          textAlign: 'center',
                          fontSize: '16px',
                          backgroundColor: '#FFFFFF',
                          borderColor: enteredOtp === selectedOrder.delivery_otp ? '#10B981' : '#F59E0B'
                        }}
                      />
                      {enteredOtp === selectedOrder.delivery_otp && (
                        <span style={{ color: '#10B981', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✓ OTP Verified!
                        </span>
                      )}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#78350F', marginTop: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={bypassOtp}
                        onChange={(e) => setBypassOtp(e.target.checked)}
                      />
                      <span>Bypass OTP (Manual handover without customer phone)</span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{
                marginTop: '14px',
                fontSize: '12px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚡</span>
                <span>Updating will automatically: 1. Send HTML Email • 2. Send WhatsApp Notification • 3. Update Google Sheet row!</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '10px 22px' }}
                >
                  <Send size={14} />
                  <span>{isUpdating ? 'Updating...' : 'Save & Trigger Notifications'}</span>
                </button>
              </div>
            </form>

            {/* Customer & Address Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '20px',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ fontWeight: '800', color: '#1E293B', marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  Customer Details
                </div>
                <div>Name: <strong>{selectedOrder.customer_name}</strong></div>
                <div>Phone: <strong>{selectedOrder.customer_phone}</strong></div>
                <div>Email: <strong>{selectedOrder.customer_email}</strong></div>
                {selectedOrder.delivery_otp && (
                  <div style={{ marginTop: '4px' }}>
                    Delivery OTP: <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px' }}>🔐 {selectedOrder.delivery_otp}</span>
                    <span style={{ marginLeft: '6px', fontSize: '10px', color: '#10B981', fontWeight: '700' }}>(Free to customer)</span>
                  </div>
                )}
                {selectedOrder.payment_ref && <div>UPI Reference: <code style={{ backgroundColor: '#E2E8F0', padding: '2px 4px', borderRadius: '4px' }}>{selectedOrder.payment_ref}</code></div>}
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={`https://wa.me/91${(selectedOrder.customer_phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`🎁 *Giggle & Bloom Kids Gift Shop*\n\nHello *${selectedOrder.customer_name}*, we are reaching out regarding your order *#${selectedOrder.order_id}*.\nStatus: *${selectedOrder.order_status}*\nTotal: ₹${selectedOrder.total_amount}\n\nHow can we help you today?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: '700',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <span>💬 Message Customer on WhatsApp</span>
                  </a>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '800', color: '#1E293B', marginBottom: '6px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  Shipping Address
                </div>
                <div>{selectedOrder.house_no}, {selectedOrder.street}</div>
                <div>{selectedOrder.area}, {selectedOrder.city}</div>
                <div>{selectedOrder.district}, {selectedOrder.state} - <strong>{selectedOrder.pincode}</strong></div>
                {selectedOrder.landmark && <div>Landmark: <em>{selectedOrder.landmark}</em></div>}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748B', marginBottom: '10px' }}>
                Items Ordered ({selectedOrder.items?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {(selectedOrder.items || []).map(it => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-soft)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={it.product_image || '/placeholder-gift.png'} alt="" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{it.product_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Qty: {it.quantity} × ₹{it.price_at_purchase}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>₹{it.total_price}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
