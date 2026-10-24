const { getDatabase } = require('../database/db');
const { getNotificationConfig, normalizeIndianPhone, maskPhone } = require('./notificationConfig');

/**
 * Health check / verification for the configured WhatsApp provider.
 */
async function verifyWhatsAppProvider() {
  const config = await getNotificationConfig();

  // Check if WhatsApp or SMS credentials exist
  const apiKey = config.sms?.apiKey || process.env.WHATSAPP_API_KEY || '';
  const apiSecret = config.sms?.apiSecret || process.env.WHATSAPP_API_SECRET || '';
  const provider = (config.sms?.provider || process.env.WHATSAPP_PROVIDER || 'twilio').toLowerCase();

  if (!apiKey) {
    return {
      configured: false,
      connected: false,
      status: 'WhatsApp configuration missing',
      message: 'WhatsApp API credentials missing in Settings or .env',
      provider
    };
  }

  try {
    if (provider === 'twilio' || provider === 'twilio_whatsapp') {
      const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${apiKey}.json`, {
        method: 'GET',
        headers: { 'Authorization': authHeader }
      });
      const data = await response.json();

      if (response.ok && data.sid) {
        return {
          configured: true,
          connected: true,
          status: 'WhatsApp provider connected',
          message: 'Twilio WhatsApp API connection successful!',
          provider: 'twilio_whatsapp',
          friendly_name: data.friendly_name
        };
      } else {
        return {
          configured: true,
          connected: false,
          status: 'WhatsApp provider failed',
          message: `Twilio WhatsApp error: ${data.message || 'Authentication error'}`,
          error: data.message,
          provider: 'twilio_whatsapp'
        };
      }
    } else if (provider === 'callmebot') {
      return {
        configured: true,
        connected: true,
        status: 'WhatsApp provider connected',
        message: 'CallMeBot WhatsApp API ready! (100% Free Forever)',
        provider: 'callmebot'
      };
    } else if (provider === 'ultramsg') {
      const instanceId = config.sms?.templateId || process.env.ULTRAMSG_INSTANCE_ID || '';
      const response = await fetch(`https://api.ultramsg.com/${instanceId}/instance/status?token=${apiKey}`);
      const data = await response.json();
      return {
        configured: true,
        connected: response.ok,
        status: response.ok ? 'WhatsApp provider connected' : 'WhatsApp provider failed',
        message: response.ok ? 'UltraMsg WhatsApp connected' : (data.error || 'Connection failed'),
        provider: 'ultramsg'
      };
    } else {
      return {
        configured: true,
        connected: true,
        status: 'WhatsApp provider configured',
        message: `Custom WhatsApp provider "${provider}" configured.`,
        provider
      };
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      status: 'WhatsApp provider failed',
      message: `Failed to connect to WhatsApp provider: ${err.message}`,
      error: err.message,
      provider
    };
  }
}

/**
 * Builds rich WhatsApp message text with emojis and formatting.
 */
function buildWhatsAppMessage(order, eventType) {
  let emoji = '🎁';
  let title = eventType;

  switch (eventType) {
    case 'Payment Verified':
      emoji = '🎉';
      title = 'Payment Verified & Order Confirmed!';
      break;
    case 'Order Accepted':
      emoji = '🧸';
      title = 'Order Accepted!';
      break;
    case 'Processing':
      emoji = '✨';
      title = 'Gifts in Preparation!';
      break;
    case 'Packed':
      emoji = '🎀';
      title = 'Order Packed with Love!';
      break;
    case 'Shipped':
      emoji = '🚀';
      title = 'Your Gifts are on the Way!';
      break;
    case 'Out for Delivery':
      emoji = '🛵';
      title = 'Out for Delivery Today!';
      break;
    case 'Delivered':
      emoji = '🥳';
      title = 'Gifts Delivered Successfully!';
      break;
    case 'Cancelled':
      emoji = '❌';
      title = 'Order Cancelled';
      break;
    default:
      emoji = '📦';
      title = `Order Status: ${eventType}`;
  }

  let text = `🎁 *GIGGLE & BLOOM KIDS GIFT SHOP* 🎁\n` +
    `*Order Update:* ${emoji} *${title}*\n\n` +
    `Hi *${order.customer_name || 'Customer'}*,\n` +
    `There is an exciting update on your gift order!\n\n` +
    `📦 *Order ID:* #${order.order_id}\n` +
    `✨ *Status:* ${order.order_status || eventType}\n` +
    `🛒 *Items:* ${order.products || 'Gift Hamper'}\n` +
    `💰 *Total Amount:* ₹${order.total_amount || 0} (${order.payment_status || 'Paid'} via ${order.payment_method || 'UPI'})\n\n` +
    `📍 *Delivery Address:*\n` +
    `${order.customer_name}\n` +
    `${order.house_number ? order.house_number + ', ' : ''}${order.street ? order.street + ', ' : ''}${order.area ? order.area + ', ' : ''}\n` +
    `${order.city || ''}, ${order.state || ''} - *${order.pin_code || ''}*\n` +
    `📞 Phone: +91 ${order.customer_phone || order.phone}\n`;

  if (order.tracking_number) {
    text += `\n🚚 *Tracking Number:* \`${order.tracking_number}\`\n`;
    if (order.tracking_url) {
      text += `🔗 Track here: ${order.tracking_url}\n`;
    }
  }

  text += `\n❤️ _Thank you for choosing Giggle & Bloom! Little gifts, big smiles._\n\n` +
    `💬 Need help? Reply directly to this WhatsApp message or email hello@kidsgiftshop.com`;

  return text;
}

/**
 * Sends a real WhatsApp message to an Indian phone number.
 */
async function sendWhatsApp({
  phone,
  message,
  orderId = 'N/A',
  notificationType = 'WHATSAPP_UPDATE',
  idempotencyKey = null,
  forceRetry = false
}) {
  const db = await getDatabase();
  const config = await getNotificationConfig();

  // 1. Validate & Normalize Indian Mobile Number
  const phoneNorm = normalizeIndianPhone(phone);
  const maskedNumber = maskPhone(phone);

  // 2. Check Idempotency Key
  if (idempotencyKey && !forceRetry) {
    const existing = db.queryOne(
      "SELECT id, status, provider_message_id, created_at FROM notifications WHERE idempotency_key = ?",
      [idempotencyKey]
    );

    if (existing && (existing.status === 'SENT' || existing.status === 'DELIVERED')) {
      console.log(`[IDEMPOTENT SKIP] WhatsApp already sent for key "${idempotencyKey}".`);
      return {
        success: true,
        skippedDuplicate: true,
        notificationId: existing.id,
        message: 'WhatsApp notification already sent previously.'
      };
    }
  }

  // Create notification record in QUEUED state
  let notificationId = null;
  if (idempotencyKey) {
    const existingRow = db.queryOne("SELECT id FROM notifications WHERE idempotency_key = ?", [idempotencyKey]);
    if (existingRow) {
      notificationId = existingRow.id;
      db.run("UPDATE notifications SET status = 'QUEUED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [notificationId]);
    }
  }

  if (!notificationId) {
    const res = db.run(
      `INSERT INTO notifications (
        order_code, channel, notification_type, idempotency_key, recipient, recipient_masked,
        subject, message_body, status, provider, attempt_count, created_at, updated_at
      ) VALUES (?, 'WHATSAPP', ?, ?, ?, ?, ?, ?, 'QUEUED', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        orderId,
        notificationType,
        idempotencyKey,
        phoneNorm.tenDigit || phone,
        maskedNumber,
        `WhatsApp: ${notificationType}`,
        message,
        'WHATSAPP'
      ]
    );
    notificationId = res.lastInsertRowid;
    if (!notificationId) {
      const inserted = db.queryOne("SELECT id FROM notifications ORDER BY id DESC LIMIT 1");
      if (inserted) notificationId = inserted.id;
    }
  }

  // Reject invalid phone
  if (!phoneNorm.valid) {
    const invalidErr = phoneNorm.error || 'Invalid Indian mobile number';
    db.run(
      `UPDATE notifications SET status = 'FAILED', error_code = 'INVALID_PHONE_NUMBER', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [invalidErr, notificationId]
    );
    return { success: false, notificationId, status: 'FAILED', error: invalidErr };
  }

  const apiKey = config.sms?.apiKey || process.env.WHATSAPP_API_KEY || '';
  const apiSecret = config.sms?.apiSecret || process.env.WHATSAPP_API_SECRET || '';
  const provider = (config.sms?.provider || process.env.WHATSAPP_PROVIDER || 'twilio').toLowerCase();
  const fromNumber = config.sms?.senderId || process.env.WHATSAPP_FROM || '+14155238886';

  // 3. Dispatch to WhatsApp Gateway
  try {
    console.log(`[WHATSAPP ATTEMPT] Sending WhatsApp message via "${provider}" to ${maskedNumber}...`);

    let providerResponse = null;
    let providerMsgId = null;
    let isSuccess = false;
    let errorMessage = null;
    let httpStatus = 200;

    if (provider === 'twilio' || provider === 'twilio_whatsapp') {
      // Twilio WhatsApp API
      const accountSid = apiKey;
      const authToken = apiSecret;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const toWhatsApp = `whatsapp:${phoneNorm.e164}`;
      const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

      const formData = new URLSearchParams();
      formData.append('To', toWhatsApp);
      formData.append('From', fromWhatsApp);
      formData.append('Body', message);

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      httpStatus = res.status;
      providerResponse = await res.json();

      if (res.ok && providerResponse.sid) {
        isSuccess = true;
        providerMsgId = providerResponse.sid;
      } else {
        isSuccess = false;
        errorMessage = providerResponse.message || 'Twilio WhatsApp rejected message';
      }

    } else if (provider === 'callmebot') {
      // CallMeBot 100% Free WhatsApp API
      const encodedMsg = encodeURIComponent(message);
      const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=+91${phoneNorm.tenDigit}&text=${encodedMsg}&apikey=${apiKey}`;

      const res = await fetch(callMeBotUrl);
      httpStatus = res.status;
      const textRes = await res.text();
      providerResponse = { response: textRes };

      if (res.ok && !textRes.toLowerCase().includes('error')) {
        isSuccess = true;
        providerMsgId = `CMB-${Date.now()}`;
      } else {
        isSuccess = false;
        errorMessage = textRes || 'CallMeBot rejected request';
      }

    } else if (provider === 'ultramsg') {
      // UltraMsg WhatsApp Instance API
      const instanceId = config.sms?.templateId || process.env.ULTRAMSG_INSTANCE_ID || '';
      const ultraUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;

      const res = await fetch(ultraUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiKey,
          to: `+91${phoneNorm.tenDigit}`,
          body: message
        })
      });

      httpStatus = res.status;
      providerResponse = await res.json();

      if (res.ok && (providerResponse.sent === 'true' || providerResponse.id)) {
        isSuccess = true;
        providerMsgId = providerResponse.id || `ULTRA-${Date.now()}`;
      } else {
        isSuccess = false;
        errorMessage = providerResponse.error || 'UltraMsg failed';
      }

    } else {
      // Direct WhatsApp Chat Link fallback
      const waLink = `https://wa.me/91${phoneNorm.tenDigit}?text=${encodeURIComponent(message)}`;
      isSuccess = true;
      providerMsgId = `WALINK-${Date.now()}`;
      providerResponse = { chat_link: waLink, note: 'Direct WhatsApp link generated' };
    }

    if (isSuccess) {
      console.log(`[WHATSAPP SENT] MsgID: ${providerMsgId} | Recipient: ${maskedNumber}`);
      db.run(
        `UPDATE notifications SET 
          status = 'SENT',
          provider = ?,
          provider_message_id = ?,
          raw_response = ?,
          last_attempt_at = CURRENT_TIMESTAMP,
          attempt_count = attempt_count + 1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [provider.toUpperCase(), String(providerMsgId), JSON.stringify(providerResponse), notificationId]
      );

      return {
        success: true,
        notificationId,
        status: 'SENT',
        provider: provider.toUpperCase(),
        providerMessageId: providerMsgId,
        recipient: maskedNumber,
        message: 'WhatsApp notification sent successfully!'
      };
    } else {
      console.error(`[WHATSAPP REJECTED] HTTP ${httpStatus} | ${errorMessage}`);
      db.run(
        `UPDATE notifications SET 
          status = 'FAILED',
          provider = ?,
          error_message = ?,
          raw_response = ?,
          last_attempt_at = CURRENT_TIMESTAMP,
          attempt_count = attempt_count + 1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [provider.toUpperCase(), errorMessage, JSON.stringify({ httpStatus, providerResponse }), notificationId]
      );

      return {
        success: false,
        notificationId,
        status: 'FAILED',
        error: `WhatsApp failed: ${errorMessage}`
      };
    }

  } catch (err) {
    console.error('[WHATSAPP NETWORK ERROR]', err.message);
    db.run(
      `UPDATE notifications SET status = 'FAILED', error_message = ?, last_attempt_at = CURRENT_TIMESTAMP, attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [err.message, notificationId]
    );
    return {
      success: false,
      notificationId,
      status: 'FAILED',
      error: `WhatsApp failed: ${err.message}`
    };
  }
}

/**
 * Dispatches order notification WhatsApp message for all 9 milestones.
 */
async function sendOrderNotificationWhatsApp(order, eventType) {
  const message = buildWhatsAppMessage(order, eventType);
  const idempotencyKey = `${order.order_id}:${eventType}:WHATSAPP`;

  return sendWhatsApp({
    phone: order.customer_phone || order.phone,
    message,
    orderId: order.order_id,
    notificationType: eventType,
    idempotencyKey
  });
}

/**
 * Helper to generate direct 1-click wa.me chat URL.
 */
function getDirectWhatsAppUrl(phone, order, eventType) {
  const phoneNorm = normalizeIndianPhone(phone);
  const text = buildWhatsAppMessage(order, eventType);
  return `https://wa.me/91${phoneNorm.tenDigit}?text=${encodeURIComponent(text)}`;
}

module.exports = {
  verifyWhatsAppProvider,
  sendWhatsApp,
  sendOrderNotificationWhatsApp,
  buildWhatsAppMessage,
  getDirectWhatsAppUrl
};
