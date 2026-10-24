const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');
const { verifySmtpConnection, sendEmail } = require('../services/emailDeliveryService');
const { verifySmsProvider, sendSMS, handleSmsDeliveryWebhook } = require('../services/smsDeliveryService');
const { verifyWhatsAppProvider, sendWhatsApp, buildWhatsAppMessage, getDirectWhatsAppUrl } = require('../services/whatsappDeliveryService');
const { retryNotification, processNotificationQueue } = require('../services/notificationQueue');
const { getNotificationConfig, normalizeIndianPhone } = require('../services/notificationConfig');

const { verifyDomainDns, isFreeMailDomain } = require('../services/domainVerification');

// ===================================================================
// 1. HEALTH-CHECK & DOMAIN VERIFICATION ENDPOINTS
// ===================================================================

/**
 * GET /api/notifications/domain/verify?domain=...
 * Runs real DNS lookups for SPF and DMARC TXT records.
 */
router.get('/domain/verify', adminAuthMiddleware, async (req, res) => {
  try {
    const domain = req.query.domain || req.query.email || 'giggleandbloom.com';
    const result = await verifyDomainDns(domain);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notifications/email/health
 * Returns:
 *   SMTP configured
 *   SMTP connection successful
 * OR:
 *   SMTP configuration missing
 *   SMTP connection failed
 */
router.get('/email/health', async (req, res) => {
  try {
    const result = await verifySmtpConnection();
    return res.status(result.connected ? 200 : (result.configured ? 502 : 400)).json({
      success: result.connected,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      configured: false,
      connected: false,
      status: 'SMTP connection failed',
      message: `SMTP connection failed: ${err.message}`
    });
  }
});

/**
 * GET /api/notifications/sms/health
 * Returns:
 *   SMS provider connected
 * OR:
 *   SMS configuration missing
 *   SMS provider failed
 */
router.get('/sms/health', async (req, res) => {
  try {
    const result = await verifySmsProvider();
    return res.status(result.connected ? 200 : (result.configured ? 502 : 400)).json({
      success: result.connected,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      configured: false,
      connected: false,
      status: 'SMS provider failed',
      message: `SMS provider failed: ${err.message}`
    });
  }
});

/**
 * GET /api/notifications/whatsapp/health
 */
router.get('/whatsapp/health', async (req, res) => {
  try {
    const result = await verifyWhatsAppProvider();
    return res.status(result.connected ? 200 : (result.configured ? 502 : 400)).json({
      success: result.connected,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      configured: false,
      connected: false,
      status: 'WhatsApp provider failed',
      message: `WhatsApp provider failed: ${err.message}`
    });
  }
});

/**
 * GET /api/notifications/diagnostics
 * Full startup and admin diagnostics with domain verification.
 */
router.get('/diagnostics', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const config = await getNotificationConfig();

    const [smtpHealth, smsHealth, domainHealth] = await Promise.all([
      verifySmtpConnection().catch(e => ({ configured: false, connected: false, status: 'SMTP connection failed', message: e.message })),
      verifySmsProvider().catch(e => ({ configured: false, connected: false, status: 'SMS provider failed', message: e.message })),
      verifyDomainDns(config.smtp.fromEmail).catch(e => ({ valid: false, error: e.message }))
    ]);

    // Query last email and SMS tests
    const lastEmailTest = db.queryOne(
      "SELECT * FROM notifications WHERE notification_type = 'TEST' AND channel = 'EMAIL' ORDER BY id DESC LIMIT 1"
    );
    const lastSmsTest = db.queryOne(
      "SELECT * FROM notifications WHERE notification_type = 'TEST' AND channel = 'SMS' ORDER BY id DESC LIMIT 1"
    );

    // Summary counts
    const queuedCount = db.queryOne("SELECT COUNT(*) as cnt FROM notifications WHERE status = 'QUEUED'").cnt || 0;
    const sentCount = db.queryOne("SELECT COUNT(*) as cnt FROM notifications WHERE status = 'SENT'").cnt || 0;
    const deliveredCount = db.queryOne("SELECT COUNT(*) as cnt FROM notifications WHERE status = 'DELIVERED'").cnt || 0;
    const failedCount = db.queryOne("SELECT COUNT(*) as cnt FROM notifications WHERE status = 'FAILED'").cnt || 0;

    return res.json({
      success: true,
      mode: (smtpHealth.connected && smsHealth.connected) ? 'LIVE' : 'UNCONFIGURED_OR_PARTIAL',
      database: 'Connected (SQLite)',
      senderIdentity: {
        fromName: config.smtp.fromName,
        fromEmail: config.smtp.fromEmail,
        smsSenderId: config.sms.senderId,
        isBusinessSender: !isFreeMailDomain(config.smtp.fromEmail)
      },
      domainVerification: domainHealth,
      smtp: {
        ...smtpHealth,
        lastTest: lastEmailTest ? {
          date: lastEmailTest.created_at,
          status: lastEmailTest.status,
          recipient: lastEmailTest.recipient_masked,
          error: lastEmailTest.error_message
        } : null
      },
      sms: {
        ...smsHealth,
        lastTest: lastSmsTest ? {
          date: lastSmsTest.created_at,
          status: lastSmsTest.status,
          recipient: lastSmsTest.recipient_masked,
          error: lastSmsTest.error_message
        } : null
      },
      googleSheets: {
        configured: config.googleSheets.isConfigured,
        webhookUrl: config.googleSheets.webhookUrl ? 'Configured' : 'Not set'
      },
      missingVariables: config.diagnostics.missingVars,
      stats: {
        queued: queuedCount,
        sent: sentCount,
        delivered: deliveredCount,
        failed: failedCount
      }
    });
  } catch (err) {
    console.error('Diagnostics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to run diagnostics: ' + err.message });
  }
});

// ===================================================================
// 2. ADMIN TEST BUTTON ENDPOINTS
// ===================================================================

/**
 * POST /api/notifications/email/test
 * Admin sends a real test email through Nodemailer.
 */
router.post('/email/test', adminAuthMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid recipient email address.' });
    }

    const testOrderId = `TEST-${Date.now().toString().slice(-6)}`;
    const subject = `Test Notification - Giggle & Bloom Kids Gift Shop (#${testOrderId})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #FFE4E6; border-radius: 16px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #FF6B8B, #FF8E53); padding: 18px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">✨ SMTP Test Email Successful! ✨</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Giggle &amp; Bloom Kids Gift Shop</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Hello Administrator! This email confirms that your Nodemailer SMTP configuration is working end-to-end.
        </p>
        <div style="background: #F8FAFC; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #1E293B;">
          <strong>Dispatch Timestamp:</strong> ${new Date().toISOString()}<br>
          <strong>Test Order ID:</strong> #${testOrderId}<br>
          <strong>Recipient:</strong> ${email}
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5;">
          Note: If this message arrived in your Spam/Junk folder, ensure your domain has valid SPF, DKIM, and DMARC DNS records configured.
        </p>
      </div>
    `;

    const text = `Giggle & Bloom Kids Gift Shop - SMTP Test Email Successful!\nDispatched at: ${new Date().toISOString()}\nTest Order ID: #${testOrderId}`;

    const result = await sendEmail({
      to: email.trim(),
      subject,
      html,
      text,
      orderId: testOrderId,
      eventType: 'TEST',
      idempotencyKey: `TEST:${Date.now()}:EMAIL`
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'Test email sent successfully. Check your inbox/spam folder.',
        messageId: result.messageId,
        notificationId: result.notificationId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email failed to send.',
        error: result.error,
        code: result.code,
        notificationId: result.notificationId
      });
    }
  } catch (err) {
    console.error('Test email route error:', err);
    return res.status(500).json({
      success: false,
      message: 'Email failed to send.',
      error: err.message
    });
  }
});

/**
 * POST /api/notifications/sms/test
 * Admin sends a real test SMS to an Indian mobile number.
 */
router.post('/sms/test', adminAuthMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a 10-digit Indian mobile number.' });
    }

    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm.valid) {
      return res.status(400).json({
        success: false,
        message: 'SMS failed',
        error: phoneNorm.error
      });
    }

    const testOrderId = `TEST-${Date.now().toString().slice(-6)}`;
    const testMessage = `Test SMS from Giggle & Bloom Kids Gift Shop: Your notification gateway is configured successfully! Test Order: #${testOrderId}.`;

    const result = await sendSMS({
      phone: phoneNorm.tenDigit,
      message: testMessage,
      orderId: testOrderId,
      notificationType: 'TEST',
      idempotencyKey: `TEST:${Date.now()}:SMS`
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'SMS sent successfully',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        recipient: result.recipient,
        notificationId: result.notificationId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'SMS failed',
        http_status: result.http_status || 400,
        error_code: result.error_code || 'SMS_REJECTED',
        error_message: result.error_message || result.error,
        error: result.error,
        notificationId: result.notificationId
      });
    }
  } catch (err) {
    console.error('Test SMS route error:', err);
    return res.status(500).json({
      success: false,
      message: 'SMS failed',
      http_status: 500,
      error_code: 'SERVER_ERR',
      error_message: err.message,
      error: err.message
    });
  }
});

/**
 * POST /api/notifications/whatsapp/test
 * Admin sends a test WhatsApp message.
 */
router.post('/whatsapp/test', adminAuthMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please enter a 10-digit Indian mobile number.' });
    }

    const phoneNorm = normalizeIndianPhone(phone);
    if (!phoneNorm.valid) {
      return res.status(400).json({ success: false, message: 'WhatsApp failed', error: phoneNorm.error });
    }

    const testOrderId = `TEST-${Date.now().toString().slice(-6)}`;
    const testMessage = `🎁 *Giggle & Bloom Kids Gift Shop*\n\n✨ *WhatsApp Gateway Test Successful!*\nTest Order ID: \`#${testOrderId}\`\nTime: ${new Date().toLocaleTimeString()}\n\nYour WhatsApp notifications are ready for customer delivery! 🎈`;

    const result = await sendWhatsApp({
      phone: phoneNorm.tenDigit,
      message: testMessage,
      orderId: testOrderId,
      notificationType: 'TEST',
      idempotencyKey: `TEST:${Date.now()}:WHATSAPP`
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'WhatsApp message sent successfully!',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        recipient: result.recipient,
        notificationId: result.notificationId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp failed',
        error: result.error,
        notificationId: result.notificationId
      });
    }
  } catch (err) {
    console.error('Test WhatsApp error:', err);
    return res.status(500).json({ success: false, message: 'WhatsApp failed', error: err.message });
  }
});

/**
 * GET /api/notifications/whatsapp/link
 * Generates direct wa.me URL for an order.
 */
router.get('/whatsapp/link', adminAuthMiddleware, async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const db = await getDatabase();
    const order = db.queryOne("SELECT * FROM orders WHERE order_id = ? OR id = ?", [order_id, order_id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const link = getDirectWhatsAppUrl(order.customer_phone, order, order.order_status);
    return res.json({ success: true, link, phone: order.customer_phone });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ===================================================================
// 3. RETRY & LOGS ENDPOINTS
// ===================================================================

/**
 * POST /api/notifications/retry/:id
 * Admin manually triggers a retry for a queued or failed notification.
 */
router.post('/retry/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await retryNotification(id);

    if (result.success) {
      return res.json({
        success: true,
        message: `Notification #${id} dispatched successfully!`,
        result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Retry failed for Notification #${id}.`,
        error: result.error,
        code: result.code
      });
    }
  } catch (err) {
    console.error(`Retry error for notification #${req.params.id}:`, err);
    return res.status(500).json({
      success: false,
      message: `Failed to retry notification: ${err.message}`
    });
  }
});

/**
 * GET /api/notifications/logs
 * Fetches recent notification records with full diagnostic metadata.
 */
router.get('/logs', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const { channel, status, order_id, limit = 100 } = req.query;

    let conditions = [];
    let params = [];

    if (channel && channel !== 'all') {
      conditions.push("channel = ?");
      params.push(channel.toUpperCase());
    }

    if (status && status !== 'all') {
      conditions.push("status = ?");
      params.push(status.toUpperCase());
    }

    if (order_id && order_id.trim()) {
      conditions.push("order_code LIKE ?");
      params.push(`%${order_id.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const safeLimit = Math.min(parseInt(limit, 10) || 100, 200);

    const logs = db.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY id DESC LIMIT ${safeLimit}`,
      params
    );

    return res.json({
      success: true,
      logs
    });
  } catch (err) {
    console.error('Error fetching notification logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to load notification logs.' });
  }
});

// ===================================================================
// 4. SMS DELIVERY REPORT / WEBHOOK
// ===================================================================

/**
 * POST /api/notifications/sms/webhook
 * Receives delivery callbacks from SMS providers and updates status to DELIVERED.
 */
router.post('/sms/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await handleSmsDeliveryWebhook(payload);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('SMS webhook error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
