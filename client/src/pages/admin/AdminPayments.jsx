import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Search, Clock, DollarSign, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminPayments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null); // payment object
  const [auditNote, setAuditNote] = useState('Verified against SBI UPI Merchant app (prazilss4@oksbi)');
  const [isVerifying, setIsVerifying] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/admin/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyModal) return;

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/payments/admin/verify/${verifyModal.order_code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ audit_notes: auditNote })
      });

      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setVerifyModal(null);
        fetchPayments();
      } else {
        alert(data.message || 'Verification failed');
      }
    } catch (err) {
      alert('Error verifying payment');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '4px' }}>Payment Verification &amp; Audit</h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
          Verify incoming UPI transactions against merchant ID: <strong>prazilss4@oksbi</strong> and gateway logs.
        </p>
      </div>

      {notification && (
        <div style={{ backgroundColor: '#E6FAF4', color: '#038A65', border: '1px solid #A7F3D0', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontWeight: '700' }}>
          ✨ {notification}
        </div>
      )}

      {/* Info Warning */}
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        fontSize: '13px',
        color: '#1E40AF',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ShieldCheck size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong>Server-Side Verification Engine:</strong> Never trust user-entered transaction references blindly.
          Verify the 12-digit UTR against your SBI UPI merchant statement before confirming verification.
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#64748B' }}>Loading payment logs...</div>
        </div>
      ) : payments.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '60px 20px', textAlign: 'center', border: '2px dashed var(--border-soft)' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>💳</div>
          <h3 style={{ fontSize: '18px', color: '#1E293B' }}>No payment records yet</h3>
          <p style={{ fontSize: '14px', color: '#64748B' }}>When customers initiate checkout, transactions will appear here.</p>
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
                <tr style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid var(--border-soft)', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 20px' }}>Order</th>
                  <th style={{ padding: '16px 14px' }}>Amount</th>
                  <th style={{ padding: '16px 14px' }}>Method</th>
                  <th style={{ padding: '16px 14px' }}>UPI Reference (UTR)</th>
                  <th style={{ padding: '16px 14px' }}>Status</th>
                  <th style={{ padding: '16px 14px' }}>Date</th>
                  <th style={{ padding: '16px 14px' }}>Verification Audit</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => {
                  const isVerified = pay.payment_status === 'Verified';
                  return (
                    <tr key={pay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--primary)' }}>
                        {pay.order_code}
                      </td>

                      <td style={{ padding: '14px 14px', fontWeight: '800', color: '#1E293B' }}>
                        ₹{pay.amount}
                      </td>

                      <td style={{ padding: '14px 14px', color: '#475569' }}>
                        {pay.payment_method}
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        {pay.transaction_reference ? (
                          <code style={{ backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>
                            {pay.transaction_reference}
                          </code>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Awaiting UTR</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 14px' }}>
                        <span className={`badge ${isVerified ? 'badge-new' : 'badge-bestseller'}`}>
                          {pay.payment_status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '12px', color: '#64748B' }}>
                        {new Date(pay.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td style={{ padding: '14px 14px', fontSize: '12px', color: '#475569', maxWidth: '200px' }}>
                        {pay.gateway_reference || (isVerified ? 'Verified' : 'Pending Verification')}
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {!isVerified ? (
                          <button
                            onClick={() => setVerifyModal(pay)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Verify Payment</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Verification Modal */}
      {verifyModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '480px', padding: '30px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', margin: 0, color: '#1E293B' }}>
                Verify UPI Payment
              </h3>
              <button onClick={() => setVerifyModal(null)} style={{ padding: '6px', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '16px', marginBottom: '20px', fontSize: '13px' }}>
              <div>Order ID: <strong>{verifyModal.order_code}</strong></div>
              <div>Amount to Verify: <strong style={{ color: 'var(--primary)', fontSize: '16px' }}>₹{verifyModal.amount}</strong></div>
              <div>Customer Submitted UTR: <strong>{verifyModal.transaction_reference || 'None'}</strong></div>
              <div>Merchant Account: <strong>prazilss4@oksbi</strong></div>
            </div>

            <form onSubmit={handleVerifySubmit}>
              <div className="input-group">
                <label className="input-label">Audit Note / Verification Proof Reference <span className="req">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  className="input-control"
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>
                ⚡ Confirming this will:
                <br />• Update Payment &amp; Order status to <strong>Payment Verified</strong>
                <br />• Dispatch Payment Confirmation Email &amp; SMS
                <br />• Sync order row to Google Sheets
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setVerifyModal(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={isVerifying} className="btn btn-primary btn-sm">
                  {isVerifying ? 'Verifying...' : 'Confirm Payment Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
