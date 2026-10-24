import React, { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Download, FileSpreadsheet, Mail, Smartphone,
  CreditCard, Shield, CheckCircle2, AlertCircle, AlertTriangle,
  Eye, Send, Check, X, Info, ExternalLink, HelpCircle, RotateCcw,
  Server, Zap, Globe, Lock, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications', 'email-delivery', 'sms-delivery', 'general', 'sheets'
  const [settings, setSettings] = useState({});
  const [diagnostics, setDiagnostics] = useState(null);
  const [sheetsHealth, setSheetsHealth] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [previewNotification, setPreviewNotification] = useState(null);

  // Test Email state
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  // Test SMS state
  const [testSmsInput, setTestSmsInput] = useState('');
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState(null);

  // Domain Verification state
  const [domainInput, setDomainInput] = useState('giggleandbloom.com');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState(null);

  // Retrying state
  const [retryingId, setRetryingId] = useState(null);

  // Filter state for notification logs
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSettings(),
      fetchDiagnostics(),
      fetchNotificationLogs()
    ]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
        setSheetsHealth(data.google_sheets_health || null);
        if (data.settings?.smtp_from_email) {
          const dom = data.settings.smtp_from_email.split('@')[1];
          if (dom) setDomainInput(dom);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/notifications/diagnostics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      const res = await fetch('/api/notifications/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load notification logs:', err);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Provider Presets for Email
  const applyEmailPreset = (provider) => {
    if (provider === 'brevo') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp-relay.brevo.com',
        smtp_port: '587',
        smtp_secure: 'false',
        smtp_from_name: 'Giggle & Bloom Kids Gift Shop',
        smtp_from_email: prev.smtp_from_email || 'orders@giggleandbloom.com'
      }));
      showToast('Brevo SMTP relay preset applied (smtp-relay.brevo.com:587). Enter your Brevo account email & Master API key.');
    } else if (provider === 'sendgrid') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: '587',
        smtp_secure: 'false',
        smtp_user: 'apikey',
        smtp_from_name: 'Giggle & Bloom Kids Gift Shop',
        smtp_from_email: prev.smtp_from_email || 'orders@giggleandbloom.com'
      }));
      showToast('SendGrid preset applied (smtp.sendgrid.net:587, user: apikey). Enter your SendGrid API key as password.');
    } else if (provider === 'ses') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'email-smtp.us-east-1.amazonaws.com',
        smtp_port: '587',
        smtp_secure: 'false',
        smtp_from_name: 'Giggle & Bloom Kids Gift Shop',
        smtp_from_email: prev.smtp_from_email || 'orders@giggleandbloom.com'
      }));
      showToast('Amazon SES preset applied. Enter your SES SMTP IAM credentials.');
    }
  };

  // Provider Presets for WhatsApp
  const applySmsPreset = (provider) => {
    if (provider === 'twilio_whatsapp') {
      setSettings(prev => ({
        ...prev,
        sms_provider: 'twilio_whatsapp',
        sms_sender_id: 'whatsapp:+14155238886'
      }));
      showToast('Twilio WhatsApp preset applied. Enter Account SID and Auth Token.');
    } else if (provider === 'callmebot') {
      setSettings(prev => ({
        ...prev,
        sms_provider: 'callmebot',
        sms_sender_id: ''
      }));
      showToast('CallMeBot 100% Free WhatsApp preset applied! Enter your API key.');
    } else if (provider === 'ultramsg') {
      setSettings(prev => ({
        ...prev,
        sms_provider: 'ultramsg',
        sms_base_url: 'https://api.ultramsg.com'
      }));
      showToast('UltraMsg preset applied. Enter your Instance ID & Token.');
    } else if (provider === 'direct_wa') {
      setSettings(prev => ({
        ...prev,
        sms_provider: 'direct_wa',
        sms_sender_id: ''
      }));
      showToast('Direct WhatsApp 1-Click Chat links enabled.');
    }
  };

  // Live Domain DNS Verification
  const handleVerifyDomain = async (domainToVerify) => {
    const target = domainToVerify || domainInput;
    if (!target) return;
    setDomainLoading(true);
    setDomainResult(null);

    try {
      const res = await fetch(`/api/notifications/domain/verify?domain=${encodeURIComponent(target)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDomainResult(data);
    } catch (err) {
      setDomainResult({ valid: false, error: 'Failed to contact domain verification API.' });
    } finally {
      setDomainLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();

    // Check for personal gmail as sender
    if (settings.smtp_from_email && settings.smtp_from_email.toLowerCase().includes('prazilss4@gmail.com')) {
      alert('⚠️ Important: Do not use your personal Gmail account (prazilss4@gmail.com) as the business sender. Transactional customer emails must come from a business domain identity (e.g. orders@giggleandbloom.com or orders@mydomain.com).');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings saved successfully!');
        fetchDiagnostics();
      } else {
        showToast(data.message || 'Error saving settings.', true);
      }
    } catch (err) {
      showToast('Error saving settings.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncSheetsNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/settings/admin/sync-sheets-now', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      showToast(data.message || 'Sync triggered!');
      fetchSettings();
    } catch (err) {
      showToast('Sync failed.', true);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/admin/settings/admin/export-csv?token=${token}`, '_blank');
  };

  // SEND TEST EMAIL
  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmailInput || !testEmailInput.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      const res = await fetch('/api/notifications/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: testEmailInput })
      });
      const data = await res.json();
      setTestEmailResult(data);

      if (data.success) {
        showToast('Test email sent successfully! Check inbox / spam.');
      } else {
        showToast('Email failed to send: ' + (data.error || data.message), true);
      }

      fetchDiagnostics();
      fetchNotificationLogs();
    } catch (err) {
      setTestEmailResult({ success: false, message: 'Email failed to send.', error: err.message });
      showToast('Email failed to send: ' + err.message, true);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // SEND TEST SMS
  const handleSendTestSms = async (e) => {
    e.preventDefault();
    if (!testSmsInput || testSmsInput.trim().length < 10) {
      alert('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setTestSmsLoading(true);
    setTestSmsResult(null);

    try {
      const res = await fetch('/api/notifications/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: testSmsInput.trim() })
      });
      const data = await res.json();
      setTestSmsResult(data);

      if (data.success) {
        showToast('WhatsApp message sent successfully!');
      } else {
        showToast('WhatsApp failed: ' + (data.error || data.message), true);
      }

      fetchDiagnostics();
      fetchNotificationLogs();
    } catch (err) {
      setTestSmsResult({ success: false, message: 'WhatsApp failed', error: err.message });
      showToast('WhatsApp failed: ' + err.message, true);
    } finally {
      setTestSmsLoading(false);
    }
  };

  // MANUAL RETRY NOTIFICATION
  const handleRetryNotification = async (id) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/notifications/retry/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Notification #${id} dispatched successfully!`);
      } else {
        showToast(`Retry failed: ${data.error || data.message}`, true);
      }
      fetchNotificationLogs();
      fetchDiagnostics();
    } catch (err) {
      showToast(`Retry failed: ${err.message}`, true);
    } finally {
      setRetryingId(null);
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    if (channelFilter !== 'all' && n.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (searchFilter && searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      const code = (n.order_code || '').toLowerCase();
      const recip = (n.recipient || '').toLowerCase();
      const subj = (n.subject || '').toLowerCase();
      if (!code.includes(term) && !recip.includes(term) && !subj.includes(term)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '6px', fontWeight: '800' }}>
            Store Settings &amp; Notification Control Center
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Automated customer notifications for all 9 order milestones, professional business sender identities, Indian TRAI DLT SMS, and live diagnostics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="btn btn-outline btn-sm"
            title="Refresh diagnostics and notification status"
          >
            <RefreshCw size={14} className={loading ? 'floating-icon' : ''} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          backgroundColor: toastMsg.isError ? '#FEF2F2' : '#F0FDF4',
          color: toastMsg.isError ? '#DC2626' : '#15803D',
          border: `1px solid ${toastMsg.isError ? '#FECACA' : '#BBF7D0'}`,
          padding: '14px 20px',
          borderRadius: '14px',
          marginBottom: '20px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          {toastMsg.isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #E2E8F0',
        marginBottom: '28px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'notifications' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'notifications' ? '#ffffff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Mail size={16} />
          <span>Email &amp; SMS Dashboard</span>
          {diagnostics && (
            <span style={{
              backgroundColor: diagnostics.mode === 'LIVE' ? '#10B981' : '#F59E0B',
              color: '#ffffff',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '50px',
              fontWeight: '800'
            }}>
              {diagnostics.mode === 'LIVE' ? 'LIVE' : 'UNCONFIGURED'}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('email-delivery')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'email-delivery' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'email-delivery' ? '#ffffff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Globe size={16} />
          <span>Email Delivery &amp; Domain Verification</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sms-delivery')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'sms-delivery' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'sms-delivery' ? '#ffffff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <MessageSquare size={16} />
          <span>WhatsApp Notifications &amp; Gateway</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'general' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'general' ? '#ffffff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <CreditCard size={16} />
          <span>Store Profile, Shipping &amp; Delivery OTP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheets')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px 12px 0 0',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'sheets' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'sheets' ? '#ffffff' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Google Sheets 24-Col Sync</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NOTIFICATIONS DASHBOARD (HEALTH, TESTS, AUDIT LOG & RETRY)        */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div>
          {/* Professional Sender Identity Banner */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 24px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B', fontWeight: '800' }}>
                Active Sender Identity (Professional Business Header)
              </div>
              <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: '800', marginTop: '2px' }}>
                Email: <span style={{ color: 'var(--primary)' }}>"Giggle &amp; Bloom Kids Gift Shop" &lt;{settings.smtp_from_email || 'orders@giggleandbloom.com'}&gt;</span>
                <span style={{ margin: '0 12px', color: '#CBD5E1' }}>|</span>
                SMS Header: <span style={{ color: 'var(--secondary)' }}>{settings.sms_sender_id || 'KIDGFT'}</span>
              </div>
            </div>

            <span style={{
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              padding: '6px 14px',
              borderRadius: '50px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={14} /> Personal accounts excluded
            </span>
          </div>

          {/* Missing Environment Variables Warning Banner */}
          {diagnostics && diagnostics.missingVariables && diagnostics.missingVariables.length > 0 && (
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '18px',
              padding: '20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px'
            }}>
              <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px', color: '#92400E', fontSize: '15px', fontWeight: '800' }}>
                  Missing Provider Credentials ({diagnostics.missingVariables.length})
                </h4>
                <p style={{ margin: '0 0 10px', color: '#B45309', fontSize: '13px', lineHeight: '1.5' }}>
                  To guarantee customers actually receive confirmation emails and SMS, the following backend variables require credentials:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {diagnostics.missingVariables.map(v => (
                    <code key={v} style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Service Diagnostic Health Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            
            {/* EMAIL SERVICE CARD */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FFF0F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#1E293B', fontWeight: '800' }}>Email Service (SMTP/API)</h3>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Brevo / SendGrid / SES Transactional</div>
                  </div>
                </div>

                {diagnostics?.smtp?.connected ? (
                  <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={14} /> Connected
                  </span>
                ) : diagnostics?.smtp?.configured ? (
                  <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <X size={14} /> Connection Failed
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={14} /> Not Configured
                  </span>
                )}
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', fontSize: '13px', marginBottom: '18px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Provider Host:</span> <strong>{diagnostics?.smtp?.host || settings.smtp_host || 'smtp-relay.brevo.com'}</strong>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Sender Identity:</span> <strong>{settings.smtp_from_email || 'orders@giggleandbloom.com'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Last Test:</span> {diagnostics?.smtp?.lastTest ? (
                    <strong style={{ color: diagnostics.smtp.lastTest.status === 'SENT' ? '#10B981' : '#EF4444' }}>
                      {diagnostics.smtp.lastTest.status} ({new Date(diagnostics.smtp.lastTest.date).toLocaleTimeString()})
                    </strong>
                  ) : <span style={{ color: '#94A3B8' }}>None yet</span>}
                </div>
                {diagnostics?.smtp?.error && (
                  <div style={{ marginTop: '8px', color: '#DC2626', fontSize: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                    Error: {diagnostics.smtp.error}
                  </div>
                )}
              </div>

              {/* Real Test Email Form */}
              <form onSubmit={handleSendTestEmail}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Send Real Test Email (Nodemailer Outbound):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="Enter customer / admin email..."
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    className="input-control"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={testEmailLoading}
                    className="btn btn-primary btn-sm"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <Send size={14} className={testEmailLoading ? 'floating-icon' : ''} />
                    <span>{testEmailLoading ? 'Sending...' : 'Test Email'}</span>
                  </button>
                </div>
              </form>

              {/* Live Test Email Result Box */}
              {testEmailResult && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  backgroundColor: testEmailResult.success ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${testEmailResult.success ? '#BBF7D0' : '#FECACA'}`,
                  color: testEmailResult.success ? '#15803D' : '#991B1B'
                }}>
                  <div style={{ fontWeight: '800', marginBottom: '4px' }}>
                    {testEmailResult.success ? '✅ Test Email Dispatched Successfully' : '❌ Test Email Failed'}
                  </div>
                  <div>{testEmailResult.message || testEmailResult.error}</div>
                  {testEmailResult.code && <div style={{ fontSize: '11px', marginTop: '4px' }}>Error Code: <code>{testEmailResult.code}</code></div>}
                  {testEmailResult.messageId && <div style={{ fontSize: '11px', marginTop: '4px' }}>Message ID: <code>{testEmailResult.messageId}</code></div>}
                </div>
              )}
            </div>

            {/* SMS SERVICE CARD */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={22} color="#16A34A" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#1E293B', fontWeight: '800' }}>WhatsApp Gateway</h3>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Twilio WhatsApp / CallMeBot / Direct Chat</div>
                  </div>
                </div>

                {diagnostics?.sms?.connected ? (
                  <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={14} /> Connected
                  </span>
                ) : diagnostics?.sms?.configured ? (
                  <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <X size={14} /> Connection Failed
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={14} /> Not Configured
                  </span>
                )}
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', fontSize: '13px', marginBottom: '18px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Provider:</span> <strong>{(diagnostics?.sms?.provider || settings.sms_provider || 'twilio_whatsapp').toUpperCase()}</strong>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Channel:</span> <strong style={{ color: '#16A34A' }}>WHATSAPP</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Last Test:</span> {diagnostics?.sms?.lastTest ? (
                    <strong style={{ color: diagnostics.sms.lastTest.status === 'SENT' ? '#10B981' : '#EF4444' }}>
                      {diagnostics.sms.lastTest.status} ({new Date(diagnostics.sms.lastTest.date).toLocaleTimeString()})
                    </strong>
                  ) : <span style={{ color: '#94A3B8' }}>None yet</span>}
                </div>
                {diagnostics?.sms?.error && (
                  <div style={{ marginTop: '8px', color: '#DC2626', fontSize: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                    Error: {diagnostics.sms.error}
                  </div>
                )}
              </div>

              {/* Real Test WhatsApp Form */}
              <form onSubmit={handleSendTestSms}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Send Real Test WhatsApp (Indian 10-Digit Mobile):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={testSmsInput}
                    onChange={(e) => setTestSmsInput(e.target.value)}
                    className="input-control"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={testSmsLoading}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: 'nowrap', backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                  >
                    <Send size={14} className={testSmsLoading ? 'floating-icon' : ''} />
                    <span>{testSmsLoading ? 'Sending...' : 'Test WhatsApp'}</span>
                  </button>
                </div>
              </form>

              {/* Live Test SMS Result Box */}
              {testSmsResult && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  backgroundColor: testSmsResult.success ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${testSmsResult.success ? '#BBF7D0' : '#FECACA'}`,
                  color: testSmsResult.success ? '#15803D' : '#991B1B'
                }}>
                  <div style={{ fontWeight: '800', marginBottom: '4px' }}>
                    {testSmsResult.success ? '✅ SMS Accepted by Provider' : '❌ SMS Delivery Failed'}
                  </div>
                  <div>{testSmsResult.message || testSmsResult.error}</div>
                  {testSmsResult.http_status && <div style={{ fontSize: '11px', marginTop: '4px' }}>HTTP Status: <strong>{testSmsResult.http_status}</strong></div>}
                  {testSmsResult.error_code && <div style={{ fontSize: '11px', marginTop: '2px' }}>Error Code: <code>{testSmsResult.error_code}</code></div>}
                  {testSmsResult.providerMessageId && <div style={{ fontSize: '11px', marginTop: '2px' }}>Provider Message ID: <code>{testSmsResult.providerMessageId}</code></div>}
                </div>
              )}
            </div>

          </div>

          {/* Delivery Status Legend & Queue Info */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px 24px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1E293B', fontWeight: '800' }}>
                Automatic Notification Events &amp; Idempotency Protection
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                Automatically triggered for all 9 status events. Idempotency Key: <code>ORDER_ID + STATUS + CHANNEL</code>. Automatic retry up to 3 attempts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>
                ⏳ QUEUED ({diagnostics?.stats?.queued || 0})
              </span>
              <span style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>
                🚀 SENT ({diagnostics?.stats?.sent || 0})
              </span>
              <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>
                ✅ DELIVERED ({diagnostics?.stats?.delivered || 0})
              </span>
              <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>
                ❌ FAILED ({diagnostics?.stats?.failed || 0})
              </span>
            </div>
          </div>

          {/* NOTIFICATION AUDIT LOG TABLE */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: '#1E293B', margin: '0 0 4px', fontWeight: '800' }}>
                  Notification Dispatch Audit Log ({filteredNotifications.length})
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Every outbound email and SMS attempt is recorded with provider message ID and exact server responses.
                </div>
              </div>

              {/* Log Filters */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Filter Order ID or Email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', width: '180px' }}
                />

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                >
                  <option value="all">All Channels</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="QUEUED">Queued</option>
                  <option value="SENT">Sent</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="FAILED">Failed</option>
                </select>

                <button onClick={fetchNotificationLogs} className="btn btn-outline btn-sm">
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <Mail size={36} color="#CBD5E1" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '15px', fontWeight: '700' }}>No notification logs match your criteria</div>
                <div style={{ fontSize: '13px' }}>As customers place orders or status transitions occur, events are logged here.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-soft)', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 14px' }}>Date &amp; Time</th>
                      <th style={{ padding: '12px 14px' }}>Order ID</th>
                      <th style={{ padding: '12px 14px' }}>Customer</th>
                      <th style={{ padding: '12px 14px' }}>Channel</th>
                      <th style={{ padding: '12px 14px' }}>Event Type</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Provider</th>
                      <th style={{ padding: '12px 14px' }}>Message ID / Error</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotifications.map(n => {
                      const isFailed = n.status === 'FAILED';
                      const isDelivered = n.status === 'DELIVERED';
                      const isSent = n.status === 'SENT';
                      const isQueued = n.status === 'QUEUED';

                      return (
                        <tr key={n.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isFailed ? '#FEF2F2' : 'transparent' }}>
                          <td style={{ padding: '12px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '800', color: '#1E293B', whiteSpace: 'nowrap' }}>
                            {n.order_code || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600' }}>
                            {n.recipient_masked || n.recipient}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              backgroundColor: n.channel === 'EMAIL' ? '#FCE7F3' : '#DCFCE7',
                              color: n.channel === 'EMAIL' ? '#BE185D' : '#15803D'
                            }}>
                              {n.channel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#1E293B', fontWeight: '600' }}>
                            {n.notification_type || 'Update'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: isDelivered ? '#DCFCE7' : isSent ? '#DBEAFE' : isQueued ? '#FEF3C7' : '#FEE2E2',
                              color: isDelivered ? '#166534' : isSent ? '#1E40AF' : isQueued ? '#92400E' : '#991B1B'
                            }}>
                              {isDelivered && '✓✓'}
                              {isSent && '✓'}
                              {isQueued && '⏳'}
                              {isFailed && '✕'}
                              {n.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>
                            {n.provider || 'SYSTEM'}
                          </td>
                          <td style={{ padding: '12px 14px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isFailed ? (
                              <span style={{ color: '#DC2626', fontWeight: '600' }} title={n.error_message}>
                                ⚠️ {n.error_message || n.error_code || 'Failed'}
                              </span>
                            ) : (
                              <code style={{ fontSize: '11px', color: '#475569' }}>
                                {n.provider_message_id || 'Accepted'}
                              </code>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setPreviewNotification(n)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#334155',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Eye size={12} /> View
                              </button>

                              {/* RETRY BUTTON FOR FAILED OR QUEUED */}
                              <button
                                type="button"
                                onClick={() => handleRetryNotification(n.id)}
                                disabled={retryingId === n.id}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: `1px solid ${isFailed ? '#FECACA' : '#CBD5E1'}`,
                                  backgroundColor: isFailed ? '#FEE2E2' : '#F8FAFC',
                                  color: isFailed ? '#DC2626' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Retry sending notification immediately"
                              >
                                <RotateCcw size={12} className={retryingId === n.id ? 'floating-icon' : ''} />
                                <span>{retryingId === n.id ? 'Retrying...' : 'Retry'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMAIL DELIVERY & DOMAIN VERIFICATION (BREVO, SENDGRID, SES)       */}
      {/* ========================================================================= */}
      {activeTab === 'email-delivery' && (
        <div>
          {/* Domain & SPF / DMARC Live DNS Check Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Globe size={22} color="var(--primary)" />
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1E293B', fontWeight: '800' }}>
                  Business Domain &amp; Sender Identity Verification
                </h3>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Verify that your business sender domain is active and has SPF and DMARC DNS records configured.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '600px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Enter domain (e.g. giggleandbloom.com or kidsgiftshop.com)..."
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="input-control"
                style={{ flex: 1, padding: '10px 14px' }}
              />
              <button
                type="button"
                onClick={() => handleVerifyDomain(domainInput)}
                disabled={domainLoading}
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                <RefreshCw size={14} className={domainLoading ? 'floating-icon' : ''} />
                <span>{domainLoading ? 'Checking DNS...' : 'Verify Domain DNS'}</span>
              </button>
            </div>

            {domainResult && (
              <div style={{
                backgroundColor: domainResult.valid ? '#F8FAFC' : '#FEF2F2',
                border: `1px solid ${domainResult.valid ? '#E2E8F0' : '#FECACA'}`,
                borderRadius: '16px',
                padding: '18px',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                {domainResult.isBusinessDomain === false ? (
                  <div style={{ color: '#DC2626' }}>
                    <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
                      🚫 Personal Public Webmail Disallowed
                    </div>
                    <div>{domainResult.error}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        SPF Record: {domainResult.hasSpf ? <Check size={16} color="#16A34A" /> : <X size={16} color="#DC2626" />}
                        <span style={{ color: domainResult.hasSpf ? '#16A34A' : '#DC2626' }}>{domainResult.hasSpf ? 'Found' : 'Missing'}</span>
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        DMARC Policy: {domainResult.hasDmarc ? <Check size={16} color="#16A34A" /> : <X size={16} color="#DC2626" />}
                        <span style={{ color: domainResult.hasDmarc ? '#16A34A' : '#DC2626' }}>{domainResult.hasDmarc ? 'Found' : 'Missing'}</span>
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        MX Records: {domainResult.hasMx ? <Check size={16} color="#16A34A" /> : <X size={16} color="#DC2626" />}
                        <span style={{ color: domainResult.hasMx ? '#16A34A' : '#DC2626' }}>{domainResult.hasMx ? 'Active' : 'Missing'}</span>
                      </span>
                    </div>

                    {domainResult.spfRecord && (
                      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <strong>SPF TXT:</strong> <code>{domainResult.spfRecord}</code>
                      </div>
                    )}
                    {domainResult.dmarcRecord && (
                      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <strong>DMARC TXT:</strong> <code>{domainResult.dmarcRecord}</code>
                      </div>
                    )}
                    <div style={{ color: '#64748B', fontSize: '12px', marginTop: '6px' }}>
                      {domainResult.message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Delivery Provider & SMTP Credentials Form */}
          <form onSubmit={handleSaveSettings}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '30px',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1E293B', fontWeight: '800' }}>
                  Transactional Email Provider Presets
                </h3>

                {/* Provider Preset Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset('brevo')}
                    className="btn btn-outline btn-sm"
                    title="Pre-fill Brevo (Sendinblue) SMTP settings (300 free emails/day)"
                  >
                    ⚡ Use Brevo Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset('sendgrid')}
                    className="btn btn-outline btn-sm"
                    title="Pre-fill SendGrid SMTP settings"
                  >
                    ⚡ Use SendGrid Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset('ses')}
                    className="btn btn-outline btn-sm"
                    title="Pre-fill Amazon SES settings"
                  >
                    ⚡ Use Amazon SES Preset
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">SMTP Host (e.g. smtp-relay.brevo.com)</label>
                  <input
                    type="text"
                    placeholder="smtp-relay.brevo.com"
                    value={settings.smtp_host || 'smtp-relay.brevo.com'}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    className="input-control"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">SMTP Port (587 or 465)</label>
                  <input
                    type="text"
                    placeholder="587"
                    value={settings.smtp_port || '587'}
                    onChange={(e) => handleChange('smtp_port', e.target.value)}
                    className="input-control"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">SMTP Secure (SSL)</label>
                  <select
                    value={settings.smtp_secure || 'false'}
                    onChange={(e) => handleChange('smtp_secure', e.target.value)}
                    className="input-control"
                  >
                    <option value="false">False (Port 587 STARTTLS - Standard for Brevo/SendGrid)</option>
                    <option value="true">True (Port 465 Direct SSL)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">SMTP Username / Login Key</label>
                  <input
                    type="text"
                    placeholder="e.g. apikey (SendGrid) or login email (Brevo)"
                    value={settings.smtp_user || ''}
                    onChange={(e) => handleChange('smtp_user', e.target.value)}
                    className="input-control"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">SMTP Password / API Key (Backend Only)</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={settings.smtp_password || ''}
                    onChange={(e) => handleChange('smtp_password', e.target.value)}
                    className="input-control"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Business Sender Name</label>
                  <input
                    type="text"
                    placeholder="Giggle &amp; Bloom Kids Gift Shop"
                    value={settings.smtp_from_name || 'Giggle & Bloom Kids Gift Shop'}
                    onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                    className="input-control"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">
                    Professional Sender Email Address (Do NOT use personal Gmail)
                  </label>
                  <input
                    type="email"
                    placeholder="orders@giggleandbloom.com"
                    value={settings.smtp_from_email || 'orders@giggleandbloom.com'}
                    onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                    className="input-control"
                  />
                  {settings.smtp_from_email && settings.smtp_from_email.includes('@gmail.com') && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '6px', fontWeight: '700' }}>
                      ⚠️ Personal Gmail (@gmail.com) is prohibited as the business transactional sender. Please enter a business domain address (e.g. orders@giggleandbloom.com).
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
              >
                <Save size={18} />
                <span>{saving ? 'Saving...' : 'Save Email Delivery Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INDIAN SMS GATEWAY & TRAI DLT SETTINGS                             */}
      {/* ========================================================================= */}
      {activeTab === 'sms-delivery' && (
        <form onSubmit={handleSaveSettings}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1E293B', fontWeight: '800' }}>
                  WhatsApp Customer Notification Gateway
                </h3>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Deliver rich WhatsApp messages with order items, addresses, emojis, and tracking links directly to customer phones.
                </div>
              </div>

              {/* Provider Preset Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applySmsPreset('twilio_whatsapp')}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: '#16A34A', color: '#16A34A' }}
                  title="Twilio WhatsApp Sandbox ($15.50 Free Credits)"
                >
                  ⚡ Twilio WhatsApp (Free Trial)
                </button>
                <button
                  type="button"
                  onClick={() => applySmsPreset('callmebot')}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: '#25D366', color: '#25D366' }}
                  title="CallMeBot 100% Free Forever"
                >
                  ⚡ CallMeBot (100% Free Forever)
                </button>
                <button
                  type="button"
                  onClick={() => applySmsPreset('ultramsg')}
                  className="btn btn-outline btn-sm"
                  title="Scan WhatsApp QR code"
                >
                  ⚡ UltraMsg (Scan QR)
                </button>
                <button
                  type="button"
                  onClick={() => applySmsPreset('direct_wa')}
                  className="btn btn-outline btn-sm"
                  title="Direct 1-Click wa.me Chat Links"
                >
                  ⚡ Direct 1-Click WhatsApp
                </button>
              </div>
            </div>

            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#166534' }}>
              <strong>💬 WhatsApp Provider Options:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                <li><strong>Twilio WhatsApp:</strong> Uses Twilio sandbox (<code>whatsapp:+14155238886</code>) with your <strong>$15.50 free trial credits</strong>. Delivers to verified customer numbers.</li>
                <li><strong>CallMeBot:</strong> <strong>100% Free Forever</strong>. Send "I allow callmebot to send me messages" to <code>+34 911 06 43 03</code> on WhatsApp to get your API key in seconds!</li>
                <li><strong>Direct 1-Click WhatsApp (wa.me):</strong> Zero configuration required! Generates direct pre-filled WhatsApp links for instant sending.</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">WhatsApp Provider</label>
                <select
                  value={settings.sms_provider || 'twilio_whatsapp'}
                  onChange={(e) => handleChange('sms_provider', e.target.value)}
                  className="input-control"
                >
                  <option value="twilio_whatsapp">Twilio WhatsApp ($15.50 Free Credits)</option>
                  <option value="callmebot">CallMeBot WhatsApp (100% Free Forever)</option>
                  <option value="ultramsg">UltraMsg (Scan QR Code)</option>
                  <option value="direct_wa">Direct 1-Click WhatsApp (wa.me)</option>
                  <option value="generic">Custom WhatsApp Webhook</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">WhatsApp API Key / Token / Twilio Account SID</label>
                <input
                  type="password"
                  placeholder="Enter API key or Twilio Account SID..."
                  value={settings.sms_api_key || ''}
                  onChange={(e) => handleChange('sms_api_key', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Twilio Auth Token (Twilio only)</label>
                <input
                  type="password"
                  placeholder="Twilio Auth Token..."
                  value={settings.sms_api_secret || ''}
                  onChange={(e) => handleChange('sms_api_secret', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">WhatsApp From Number / Sender (e.g. whatsapp:+14155238886)</label>
                <input
                  type="text"
                  placeholder="whatsapp:+14155238886"
                  value={settings.sms_sender_id || 'whatsapp:+14155238886'}
                  onChange={(e) => handleChange('sms_sender_id', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Business Sender ID / Header (e.g. KIDGFT)</label>
                <input
                  type="text"
                  placeholder="KIDGFT"
                  maxLength={6}
                  value={settings.sms_sender_id || 'KIDGFT'}
                  onChange={(e) => handleChange('sms_sender_id', e.target.value.toUpperCase())}
                  className="input-control"
                  style={{ textTransform: 'uppercase', fontWeight: '700' }}
                />
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Must be 6 alphabetic characters registered on Indian DLT portal. Never a personal phone number.
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Approved DLT Template ID (Optional for Quick route)</label>
                <input
                  type="text"
                  placeholder="Leave blank to use Quick SMS route"
                  value={settings.sms_template_id || ''}
                  onChange={(e) => handleChange('sms_template_id', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Provider Base URL</label>
                <input
                  type="text"
                  placeholder="https://www.fast2sms.com/dev/bulkV2"
                  value={settings.sms_base_url || 'https://www.fast2sms.com/dev/bulkV2'}
                  onChange={(e) => handleChange('sms_base_url', e.target.value)}
                  className="input-control"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-lg"
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save SMS Gateway Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STORE IDENTITY & UPI PROFILE                                       */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '28px'
          }}>
            <h3 style={{ fontSize: '18px', color: '#1E293B', marginBottom: '16px', fontWeight: '800' }}>
              🏪 Store Identity &amp; Active Merchant UPI
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div className="input-group">
                <label className="input-label">Shop Name</label>
                <input
                  type="text"
                  value={settings.shop_name || ''}
                  onChange={(e) => handleChange('shop_name', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Merchant UPI ID (Direct Customer Payments)</label>
                <input
                  type="text"
                  value={settings.upi_merchant_id || 'prazilss4@oksbi'}
                  onChange={(e) => handleChange('upi_merchant_id', e.target.value)}
                  className="input-control"
                  style={{ fontWeight: '800', color: 'var(--primary)' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Store Email</label>
                <input
                  type="email"
                  value={settings.shop_email || 'hello@giggleandbloom.com'}
                  onChange={(e) => handleChange('shop_email', e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Store Phone / WhatsApp</label>
                <input
                  type="text"
                  value={settings.shop_phone || '+91 98765 43210'}
                  onChange={(e) => handleChange('shop_phone', e.target.value)}
                  className="input-control"
                />
              </div>
            </div>

            {/* SHIPPING RATES CONFIGURATION */}
            <div style={{
              borderTop: '2px dashed var(--border-soft)',
              paddingTop: '24px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#1E293B', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚚</span>
                    <span>Shipping &amp; Delivery Rate Rules</span>
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                    Configure whether all orders get Free Shipping or if customers pay a standard delivery fee below a threshold.
                  </p>
                </div>

                {/* Quick Shipping Presets */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('shipping_fee', '0');
                      handleChange('free_shipping_threshold', '0');
                      showToast('Preset: 100% Free Shipping on ALL orders selected!');
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#10B981', color: '#10B981', fontWeight: '700' }}
                  >
                    🎉 100% Free Delivery (All Orders)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange('shipping_fee', '49');
                      handleChange('free_shipping_threshold', '499');
                      showToast('Preset: ₹49 Delivery Fee, Free above ₹499 selected!');
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#6366F1', color: '#6366F1', fontWeight: '700' }}
                  >
                    📦 ₹49 Fee (Free &gt; ₹499)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange('shipping_fee', '79');
                      handleChange('free_shipping_threshold', '999');
                      showToast('Preset: ₹79 Delivery Fee, Free above ₹999 selected!');
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#F59E0B', color: '#F59E0B', fontWeight: '700' }}
                  >
                    🚚 ₹79 Fee (Free &gt; ₹999)
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Standard Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for 100% Free delivery"
                    value={settings.shipping_fee ?? '0'}
                    onChange={(e) => handleChange('shipping_fee', e.target.value)}
                    className="input-control"
                    style={{ fontSize: '15px', fontWeight: '700' }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    {parseFloat(settings.shipping_fee || '0') === 0 
                      ? '✨ Delivery is completely FREE on every order!' 
                      : `Customers pay ₹${settings.shipping_fee} unless cart reaches the free shipping threshold.`}
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Free Shipping Threshold (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 499"
                    value={settings.free_shipping_threshold ?? '499'}
                    onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                    className="input-control"
                    style={{ fontSize: '15px', fontWeight: '700' }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Orders at or above this amount automatically unlock FREE delivery.
                  </div>
                </div>
              </div>
            </div>

            {/* FREE DELIVERY OTP SYSTEM INFO */}
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #FDE68A',
              borderRadius: '16px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '24px', lineHeight: 1 }}>🔐</div>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#92400E', fontWeight: '800' }}>
                    Free Delivery OTP System (Zero Paid SMS Charges!)
                  </h4>
                  <div style={{ fontSize: '13px', color: '#B45309', lineHeight: '1.6' }}>
                    <p style={{ margin: '0 0 8px' }}>
                      To prevent fraud and guarantee packages reach the right customer without paying for costly Indian SMS gateway recharge credits:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      <li><strong>Auto-Generated:</strong> Every new order automatically gets a unique, secure 4-digit Delivery OTP (e.g. <code>4829</code>).</li>
                      <li><strong>100% Free Delivery:</strong> The OTP is sent free to the customer via <strong>WhatsApp</strong>, in their <strong>Confirmation Email</strong>, and displayed on their <strong>Live Order Tracking Page</strong>.</li>
                      <li><strong>Safe Handover:</strong> When you or your courier partner deliver the package, verify the customer's 4-digit OTP in <strong>Admin &gt; Orders</strong> before marking as <em>Delivered</em>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-lg"
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GOOGLE SHEETS ORDER SYNC (24 COLUMNS)                              */}
      {/* ========================================================================= */}
      {activeTab === 'sheets' && (
        <div>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                <FileSpreadsheet size={20} color="#16A34A" />
                <span>Google Sheets Order Sync (24 Columns)</span>
              </h3>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSyncSheetsNow}
                  disabled={syncing}
                  className="btn btn-outline btn-sm"
                >
                  <RefreshCw size={14} className={syncing ? 'floating-icon' : ''} />
                  <span>{syncing ? 'Syncing...' : 'Sync Pending Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={14} />
                  <span>Download Orders CSV</span>
                </button>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px' }}>
              Google Sheets sync is completely decoupled from Email and SMS. Each order is formatted as 1 row with 24 columns, updating in place when status changes without creating duplicate rows.
            </p>

            <form onSubmit={handleSaveSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Google Apps Script Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={settings.google_sheets_url || settings.google_sheets_webhook_url || ''}
                    onChange={(e) => {
                      handleChange('google_sheets_url', e.target.value);
                      handleChange('google_sheets_webhook_url', e.target.value);
                    }}
                    className="input-control"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Automated Webhook Sync</label>
                  <select
                    value={settings.google_sheets_enabled || 'false'}
                    onChange={(e) => handleChange('google_sheets_enabled', e.target.value)}
                    className="input-control"
                  >
                    <option value="false">Queue locally for CSV Export / Manual Sync</option>
                    <option value="true">Live Real-Time Webhook Dispatch</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                >
                  <Save size={14} />
                  <span>Save Sheets Settings</span>
                </button>
              </div>
            </form>

            {/* Sync Queue Health */}
            {sheetsHealth && (
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                fontSize: '13px',
                marginTop: '20px',
                border: '1px solid #E2E8F0'
              }}>
                <div>Pending in Queue: <strong>{sheetsHealth.pending}</strong></div>
                <div>Successfully Dispatched: <strong style={{ color: '#10B981' }}>{sheetsHealth.success}</strong></div>
                <div>Failed Retries: <strong style={{ color: '#EF4444' }}>{sheetsHealth.failed}</strong></div>
                {sheetsHealth.latest?.error_message && (
                  <div style={{ width: '100%', color: '#64748B', fontSize: '12px' }}>
                    Latest Note: {sheetsHealth.latest.error_message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATION PREVIEW MODAL                                                */}
      {/* ========================================================================= */}
      {previewNotification && (
        <div className="modal-backdrop" onClick={() => setPreviewNotification(null)}>
          <div className="modal-container" style={{ maxWidth: '680px', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: '0 0 4px', fontWeight: '800' }}>
                  {previewNotification.channel} Notification Preview
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Order: <strong>#{previewNotification.order_code}</strong> • To: <strong>{previewNotification.recipient}</strong>
                </div>
              </div>
              <button onClick={() => setPreviewNotification(null)} className="btn btn-ghost">✕</button>
            </div>

            {/* Status and Provider Info */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
              <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
                Provider: <strong>{previewNotification.provider || 'SYSTEM'}</strong>
              </span>
              <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
                Status: <strong>{previewNotification.status}</strong>
              </span>
              <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
                Attempts: <strong>{previewNotification.attempt_count || 1}</strong>
              </span>
              {previewNotification.provider_message_id && (
                <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
                  Msg ID: <code>{previewNotification.provider_message_id}</code>
                </span>
              )}
            </div>

            {previewNotification.channel === 'EMAIL' ? (
              <div>
                <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>
                  Subject: {previewNotification.subject}
                </div>
                <div
                  style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px' }}
                  dangerouslySetInnerHTML={{ __html: previewNotification.html_body || previewNotification.message_body }}
                />
              </div>
            ) : (
              <div>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', color: '#1E293B', whiteSpace: 'pre-wrap' }}>
                  {previewNotification.message_body}
                </div>
              </div>
            )}

            {previewNotification.error_message && (
              <div style={{ marginTop: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', color: '#DC2626', fontSize: '12px' }}>
                <strong>Error Details:</strong> {previewNotification.error_message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleRetryNotification(previewNotification.id);
                  setPreviewNotification(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                <RotateCcw size={14} />
                <span>Retry Delivery</span>
              </button>
              <button onClick={() => setPreviewNotification(null)} className="btn btn-primary btn-sm">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
