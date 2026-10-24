const nodemailer = require('nodemailer');
const { getDatabase } = require('../database/db');
const { getNotificationConfig, maskEmail } = require('./notificationConfig');

/**
 * Creates and returns a Nodemailer transporter using active SMTP configuration.
 */
async function getTransporter() {
  const config = await getNotificationConfig();
  if (!config.smtp.isConfigured) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password
    },
    tls: {
      // Allow TLS negotiation
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

/**
 * Verifies the SMTP connection with the configured provider.
 * Used at server startup and for GET /api/notifications/email/health.
 */
async function verifySmtpConnection() {
  const config = await getNotificationConfig();

  if (!config.smtp.isConfigured) {
    const missing = [];
    if (!config.smtp.host) missing.push('SMTP_HOST');
    if (!config.smtp.user) missing.push('SMTP_USER');
    if (!config.smtp.password) missing.push('SMTP_PASSWORD');

    return {
      configured: false,
      connected: false,
      status: 'SMTP configuration missing',
      message: `SMTP configuration missing (${missing.join(', ')} not set in .env or settings)`,
      missing
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    await transporter.verify();

    return {
      configured: true,
      connected: true,
      status: 'SMTP connection successful',
      message: 'SMTP configured and connection verified successfully!',
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      from: config.smtp.fromEmail
    };
  } catch (err) {
    console.error('[SMTP VERIFY FAILED]', err.message);
    return {
      configured: true,
      connected: false,
      status: 'SMTP connection failed',
      message: `SMTP connection failed: ${err.message}`,
      error_code: err.code || 'SMTP_CONN_ERR',
      error: err.message,
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user
    };
  }
}

/**
 * Generates rich HTML email template for an order event.
 */
function generateEmailHtml({ order, eventType, statusTitle, statusBadgeColor, statusMessage, showTracking = false }) {
  const items = order.items || [];
  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px dashed #e2e8f0;">
      <td style="padding: 12px 8px; vertical-align: middle;">
        <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${item.product_name}</div>
        <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Qty: <strong>${item.quantity}</strong> × ₹${item.price_at_purchase}</div>
      </td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a; vertical-align: middle; font-size: 14px;">
        ₹${item.total_price}
      </td>
    </tr>
  `).join('');

  const fullAddress = `
    <strong>${order.customer_name}</strong><br>
    ${order.house_no}, ${order.street}, ${order.area}<br>
    ${order.city}, ${order.district}, ${order.state} - <strong>${order.pincode}</strong><br>
    Phone: <strong>${order.customer_phone}</strong>
    ${order.landmark ? `<br>Landmark: <em>${order.landmark}</em>` : ''}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle} - Giggle & Bloom Kids Gift Shop (#${order.order_id})</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F4; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF9F4; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(255, 107, 139, 0.08); border: 1px solid #FFE4E6;">
          
          <!-- Cheerful Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%); padding: 36px 24px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.25); padding: 6px 18px; border-radius: 50px; color: #ffffff; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                ✨ Giggle &amp; Bloom Kids Gift Shop ✨
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">${statusTitle}</h1>
              <p style="margin: 8px 0 0; color: #FFE4E6; font-size: 14px; font-weight: 600;">Order #${order.order_id}</p>
            </td>
          </tr>

          <!-- Status Highlight Banner -->
          <tr>
            <td style="padding: 24px 30px 10px;">
              <div style="background-color: #F8FAFC; border-left: 5px solid ${statusBadgeColor}; padding: 18px 20px; border-radius: 10px;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
                  Hello <strong>${order.customer_name}</strong>, ${statusMessage}
                </p>
              </div>
            </td>
          </tr>

          <!-- Tracking Info Box (if applicable) -->
          ${showTracking && (order.tracking_number || order.courier_name) ? `
          <tr>
            <td style="padding: 10px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-weight: 800; color: #166534; font-size: 14px; margin-bottom: 6px;">🚚 Shipping &amp; Courier Details</div>
                    <div style="font-size: 13px; color: #15803D; margin-bottom: 4px;">Courier Partner: <strong>${order.courier_name || 'Blue Dart / Express'}</strong></div>
                    <div style="font-size: 13px; color: #15803D; margin-bottom: 12px;">Tracking Number: <code style="background: #DCFCE7; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 13px;">${order.tracking_number || 'Will update shortly'}</code></div>
                    ${order.tracking_url ? `
                      <a href="${order.tracking_url}" target="_blank" style="display: inline-block; background-color: #16A34A; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;">Track Package Online →</a>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Order Summary Header -->
          <tr>
            <td style="padding: 16px 30px 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                <h3 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 800;">Gifts in this Order:</h3>
                <span style="font-size: 12px; color: #64748B; font-weight: 600;">Status: <strong style="color: ${statusBadgeColor};">${order.order_status}</strong></span>
              </div>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 30px 15px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsHtml}
              </table>

              <!-- Totals Breakdown -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; border-top: 2px solid #F1F5F9; padding-top: 12px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Items Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155; font-size: 13px; font-weight: 600;">₹${order.subtotal}</td>
                </tr>
                ${order.discount_total > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #16A34A; font-size: 13px;">Discount Savings</td>
                  <td style="padding: 4px 0; text-align: right; color: #16A34A; font-size: 13px; font-weight: 600;">-₹${order.discount_total}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Delivery Fee</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155; font-size: 13px; font-weight: 600;">${order.shipping_fee > 0 ? `₹${order.shipping_fee}` : 'FREE 🎁'}</td>
                </tr>
                <tr style="border-top: 1px solid #E2E8F0;">
                  <td style="padding: 12px 0 4px; color: #0f172a; font-size: 16px; font-weight: 800;">Total Amount</td>
                  <td style="padding: 12px 0 4px; text-align: right; color: #FF6B8B; font-size: 20px; font-weight: 800;">₹${order.total_amount}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 0 6px; color: #64748B; font-size: 12px;">Payment Status</td>
                  <td style="padding: 2px 0 6px; text-align: right; color: #10B981; font-size: 12px; font-weight: 700;">${order.payment_status || 'Pending'} (${order.payment_method || 'UPI'})</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Destination Address -->
          <tr>
            <td style="padding: 10px 30px 24px;">
              <div style="background-color: #F8FAFC; border-radius: 14px; padding: 18px 20px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">📍 Delivery Destination</h4>
                <div style="color: #475569; font-size: 13px; line-height: 1.6;">
                  ${fullAddress}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer & Anti-Spam Notice -->
          <tr>
            <td style="background-color: #FFF9F4; padding: 25px 30px; text-align: center; border-top: 1px solid #FFE4E6;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                Have questions or need assistance? Reply directly to this email or reach us at <a href="mailto:hello@kidsgiftshop.com" style="color: #FF6B8B; text-decoration: none; font-weight: 700;">hello@kidsgiftshop.com</a>
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © 2026 Giggle &amp; Bloom Kids Gift Shop • Spreading smiles, one gift at a time! 🎈<br>
                <em>This is an automated notification regarding your order #${order.order_id}.</em>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates plain text fallback for email clients.
 */
function generateEmailPlainText({ order, eventType, statusTitle, statusMessage }) {
  const items = (order.items || []).map(i => `- ${i.product_name} (Qty: ${i.quantity}) - ₹${i.total_price}`).join('\n');
  return `
Giggle & Bloom Kids Gift Shop
${statusTitle}
Order ID: #${order.order_id}

Hello ${order.customer_name},
${statusMessage.replace(/<[^>]+>/g, '')}

Gifts in this order:
${items}

Order Total: ₹${order.total_amount}
Payment Status: ${order.payment_status || 'Pending'}
Order Status: ${order.order_status}

Delivery Address:
${order.customer_name}
${order.house_no}, ${order.street}, ${order.area}
${order.city}, ${order.district}, ${order.state} - ${order.pincode}
Phone: ${order.customer_phone}

Thank you for shopping with Giggle & Bloom Kids Gift Shop!
Support: hello@kidsgiftshop.com
`.trim();
}

/**
 * Sends a real email via Nodemailer SMTP with idempotency, logging, and error tracking.
 * NEVER returns success if SMTP delivery failed.
 */
async function sendEmail({
  to,
  subject,
  html,
  text,
  orderId = 'N/A',
  eventType = 'NOTIFICATION',
  idempotencyKey = null,
  forceRetry = false
}) {
  const db = await getDatabase();
  const config = await getNotificationConfig();
  const maskedTo = maskEmail(to);
  const nowIso = new Date().toISOString();

  // 1. Idempotency Check: Don't send duplicate emails for the same event
  if (idempotencyKey && !forceRetry) {
    const existing = db.queryOne(
      "SELECT id, status, provider_message_id, created_at FROM notifications WHERE idempotency_key = ?",
      [idempotencyKey]
    );

    if (existing) {
      if (existing.status === 'SENT' || existing.status === 'DELIVERED') {
        console.log(`[IDEMPOTENT SKIP] Email already sent for key "${idempotencyKey}". Skipping duplicate.`);
        return {
          success: true,
          skippedDuplicate: true,
          notificationId: existing.id,
          message: 'Notification already sent previously (idempotent duplicate skipped).'
        };
      }
    }
  }

  // Determine existing notification record or create one in QUEUED state
  let notificationId = null;
  if (idempotencyKey) {
    const existingRow = db.queryOne("SELECT id, attempt_count FROM notifications WHERE idempotency_key = ?", [idempotencyKey]);
    if (existingRow) {
      notificationId = existingRow.id;
      db.run(
        "UPDATE notifications SET status = 'QUEUED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [notificationId]
      );
    }
  }

  if (!notificationId) {
    const res = db.run(
      `INSERT INTO notifications (
        order_code, channel, notification_type, idempotency_key, recipient, recipient_masked,
        subject, message_body, html_body, status, provider, attempt_count, created_at, updated_at
      ) VALUES (?, 'EMAIL', ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'NODEMAILER', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [orderId, eventType, idempotencyKey, to, maskedTo, subject, text, html]
    );
    notificationId = res.lastInsertRowid;
    if (!notificationId) {
      const inserted = db.queryOne("SELECT id FROM notifications ORDER BY id DESC LIMIT 1");
      if (inserted) notificationId = inserted.id;
    }
  }

  // 2. Check SMTP Configuration
  if (!config.smtp.isConfigured) {
    const errorMsg = 'SMTP credentials not configured in environment (SMTP_HOST, SMTP_USER, or SMTP_PASSWORD missing)';
    console.warn(`[EMAIL DELIVERY BLOCKED] ${errorMsg}`);

    db.run(
      `UPDATE notifications SET 
        status = 'FAILED', 
        error_code = 'SMTP_NOT_CONFIGURED',
        error_message = ?, 
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [errorMsg, notificationId]
    );

    return {
      success: false,
      notificationId,
      error: errorMsg,
      code: 'SMTP_NOT_CONFIGURED',
      status: 'FAILED'
    };
  }

  // 3. Perform REAL SMTP Delivery
  const fromName = config.smtp.fromName;
  const fromEmail = config.smtp.fromEmail;
  const fromHeader = `"${fromName}" <${fromEmail}>`;
  const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'kidsgiftshop.com';
  const customMessageId = `<order-${orderId}-${Date.now()}@${domain}>`;

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    console.log(`[SMTP ATTEMPT] Dispatching email to ${maskedTo} via ${config.smtp.host}:${config.smtp.port}...`);

    const info = await transporter.sendMail({
      from: fromHeader,
      to,
      subject,
      text: text || '',
      html: html || '',
      replyTo: fromEmail,
      messageId: customMessageId,
      headers: {
        'X-Shop-Name': 'Giggle & Bloom Kids Gift Shop',
        'X-Order-ID': String(orderId),
        'X-Notification-Type': eventType
      }
    });

    console.log(`[SMTP SUCCESS] Email delivered to SMTP server! MessageID: ${info.messageId || customMessageId}`);

    // Update status to SENT ONLY after receiving successful response from Nodemailer
    db.run(
      `UPDATE notifications SET 
        status = 'SENT',
        provider = 'NODEMAILER',
        provider_message_id = ?,
        raw_response = ?,
        error_code = NULL,
        error_message = NULL,
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        info.messageId || customMessageId,
        JSON.stringify({ response: info.response, accepted: info.accepted, rejected: info.rejected }),
        notificationId
      ]
    );

    return {
      success: true,
      notificationId,
      status: 'SENT',
      messageId: info.messageId || customMessageId,
      response: info.response,
      recipient: maskedTo
    };
  } catch (err) {
    console.error(`[SMTP FAILED] Could not send email to ${maskedTo}:`, err.message);

    // Record FAILED status and exact error
    db.run(
      `UPDATE notifications SET 
        status = 'FAILED',
        provider = 'NODEMAILER',
        error_code = ?,
        error_message = ?,
        raw_response = ?,
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        err.code || 'SMTP_SEND_FAILED',
        err.message || 'Unknown SMTP error',
        JSON.stringify({ error: err.message, stack: err.stack, code: err.code }),
        notificationId
      ]
    );

    return {
      success: false,
      notificationId,
      status: 'FAILED',
      error: err.message,
      code: err.code || 'SMTP_ERR'
    };
  }
}

/**
 * Dispatches order notification email for the 9 supported order events:
 * 1. Payment Verified
 * 2. Order Accepted
 * 3. Processing
 * 4. Packed
 * 5. Shipped
 * 6. Out for Delivery
 * 7. Delivered
 * 8. Cancelled
 * 9. Payment Failed
 */
async function sendOrderNotificationEmail(order, eventType) {
  let statusTitle = 'Order Update';
  let statusBadgeColor = '#3B82F6';
  let statusMessage = `there is an update on your order #${order.order_id}.`;
  let showTracking = false;

  switch (eventType) {
    case 'Payment Verified':
      statusTitle = 'Payment Verified & Order Confirmed! 🎉';
      statusBadgeColor = '#10B981';
      statusMessage = `we have verified your payment of <strong>₹${order.total_amount}</strong> for Order <strong>#${order.order_id}</strong>! We are now preparing your wonderful gifts.`;
      break;
    case 'Order Accepted':
      statusTitle = 'Order Accepted! 🎁';
      statusBadgeColor = '#8B5CF6';
      statusMessage = `your order <strong>#${order.order_id}</strong> has been accepted by our shop team and scheduled for careful gift-wrapping.`;
      break;
    case 'Processing':
      statusTitle = 'Gifts in Preparation! 🧸';
      statusBadgeColor = '#F59E0B';
      statusMessage = `our team is currently hand-picking and quality-checking your gifts for Order <strong>#${order.order_id}</strong>.`;
      break;
    case 'Packed':
      statusTitle = 'Order Packed with Love! 🎀';
      statusBadgeColor = '#EC4899';
      statusMessage = `your order <strong>#${order.order_id}</strong> is beautifully packed and ready for dispatch with our courier partner.`;
      break;
    case 'Shipped':
      statusTitle = 'Your Gifts are on the Way! 🚀';
      statusBadgeColor = '#3B82F6';
      statusMessage = `your order <strong>#${order.order_id}</strong> has been handed over to our courier partner and is on its journey to you!`;
      showTracking = true;
      break;
    case 'Out for Delivery':
      statusTitle = 'Out for Delivery Today! 🛵';
      statusBadgeColor = '#F97316';
      statusMessage = `get excited! The delivery partner is out to deliver your gifts for Order <strong>#${order.order_id}</strong> today. Please keep your phone reachable.`;
      showTracking = true;
      break;
    case 'Delivered':
      statusTitle = 'Order Delivered! 🥳';
      statusBadgeColor = '#10B981';
      statusMessage = `your order <strong>#${order.order_id}</strong> has been delivered! We hope it brings endless joy and sweet smiles to your little ones!`;
      break;
    case 'Cancelled':
      statusTitle = 'Order Cancelled';
      statusBadgeColor = '#EF4444';
      statusMessage = `your order <strong>#${order.order_id}</strong> has been cancelled. If payment was made, your refund is being processed according to our policy.`;
      break;
    case 'Payment Failed':
      statusTitle = 'Payment Incomplete';
      statusBadgeColor = '#EF4444';
      statusMessage = `we were unable to verify payment for Order <strong>#${order.order_id}</strong>. Please retry or contact our friendly support team.`;
      break;
    default:
      statusTitle = `Order Update: ${eventType}`;
      statusBadgeColor = '#6366F1';
      statusMessage = `the status of Order <strong>#${order.order_id}</strong> is now <strong>${eventType}</strong>.`;
  }

  const html = generateEmailHtml({
    order,
    eventType,
    statusTitle,
    statusBadgeColor,
    statusMessage,
    showTracking
  });

  const text = generateEmailPlainText({
    order,
    eventType,
    statusTitle,
    statusMessage
  });

  const subject = `${statusTitle} - Giggle & Bloom Kids Gift Shop (#${order.order_id})`;
  const idempotencyKey = `${order.order_id}:${eventType}:EMAIL`;

  return sendEmail({
    to: order.customer_email,
    subject,
    html,
    text,
    orderId: order.order_id,
    eventType,
    idempotencyKey
  });
}

module.exports = {
  verifySmtpConnection,
  sendEmail,
  sendOrderNotificationEmail,
  generateEmailHtml,
  generateEmailPlainText
};
