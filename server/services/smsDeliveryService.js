const { getDatabase } = require('../database/db');
const { getNotificationConfig, normalizeIndianPhone, maskPhone } = require('./notificationConfig');

/**
 * Health check / verification for the configured SMS provider.
 * Used at server startup and for GET /api/notifications/sms/health.
 */
async function verifySmsProvider() {
  const config = await getNotificationConfig();

  if (!config.sms.isConfigured) {
    return {
      configured: false,
      connected: false,
      status: 'SMS configuration missing',
      message: 'SMS provider API key not configured (SMS_API_KEY missing in .env or settings)',
      provider: config.sms.provider
    };
  }

  const { provider, apiKey, apiSecret, baseUrl } = config.sms;

  try {
    if (provider === 'fast2sms') {
      // Fast2SMS wallet / profile check endpoint
      const response = await fetch('https://www.fast2sms.com/dev/wallet', {
        method: 'POST',
        headers: {
          'authorization': apiKey
        }
      });
      const data = await response.json();

      if (response.ok && data.return === true) {
        return {
          configured: true,
          connected: true,
          status: 'SMS provider connected',
          message: 'Fast2SMS API connection successful!',
          provider: 'fast2sms',
          wallet: data.wallet || 0
        };
      } else {
        return {
          configured: true,
          connected: false,
          status: 'SMS provider failed',
          message: `Fast2SMS rejected credentials: ${data.message || 'Invalid API Key'}`,
          error: data.message || 'Fast2SMS authentication failed',
          provider: 'fast2sms',
          http_status: response.status
        };
      }
    } else if (provider === 'twilio') {
      // Twilio Account lookup check
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
          status: 'SMS provider connected',
          message: 'Twilio connection successful!',
          provider: 'twilio',
          friendly_name: data.friendly_name
        };
      } else {
        return {
          configured: true,
          connected: false,
          status: 'SMS provider failed',
          message: `Twilio error: ${data.message || 'Authentication error'}`,
          error: data.message,
          error_code: data.code,
          http_status: response.status,
          provider: 'twilio'
        };
      }
    } else if (provider === 'telegram') {
      // Telegram Bot check
      const response = await fetch(`https://api.telegram.org/bot${apiKey}/getMe`);
      const data = await response.json();
      if (response.ok && data.ok) {
        return {
          configured: true,
          connected: true,
          status: 'SMS provider connected',
          message: `Telegram Bot @${data.result.username} connected successfully! (100% Free Mobile Alerts)`,
          provider: 'telegram',
          bot_name: data.result.first_name,
          username: data.result.username
        };
      } else {
        return {
          configured: true,
          connected: false,
          status: 'SMS provider failed',
          message: `Telegram Bot error: ${data.description || 'Invalid Bot Token'}`,
          error: data.description,
          provider: 'telegram'
        };
      }
    } else {
      // Generic webhook or custom provider
      return {
        configured: true,
        connected: true,
        status: 'SMS provider configured',
        message: `Custom provider "${provider}" is configured at ${baseUrl}`,
        provider
      };
    }
  } catch (err) {
    console.error('[SMS VERIFY ERROR]', err.message);
    return {
      configured: true,
      connected: false,
      status: 'SMS provider failed',
      message: `Failed to connect to SMS provider: ${err.message}`,
      error: err.message,
      provider
    };
  }
}

/**
 * Sends a real SMS to an Indian mobile number through the configured provider.
 * Follows TRAI 10-digit mobile standards.
 * Never reports SENT or DELIVERED if the provider rejected the request.
 */
async function sendSMS({
  phone,
  message,
  orderId = 'N/A',
  notificationType = 'SMS_UPDATE',
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

    if (existing) {
      if (existing.status === 'SENT' || existing.status === 'DELIVERED') {
        console.log(`[IDEMPOTENT SKIP] SMS already sent for key "${idempotencyKey}". Skipping duplicate.`);
        return {
          success: true,
          skippedDuplicate: true,
          notificationId: existing.id,
          message: 'SMS notification already sent previously (idempotent duplicate skipped).'
        };
      }
    }
  }

  // Determine existing notification record or create one in QUEUED state
  let notificationId = null;
  if (idempotencyKey) {
    const existingRow = db.queryOne("SELECT id FROM notifications WHERE idempotency_key = ?", [idempotencyKey]);
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
        subject, message_body, status, provider, attempt_count, created_at, updated_at
      ) VALUES (?, 'SMS', ?, ?, ?, ?, ?, ?, 'QUEUED', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        orderId,
        notificationType,
        idempotencyKey,
        phoneNorm.tenDigit || phone,
        maskedNumber,
        `SMS: ${notificationType}`,
        message,
        config.sms.provider.toUpperCase()
      ]
    );
    notificationId = res.lastInsertRowid;
    if (!notificationId) {
      const inserted = db.queryOne("SELECT id FROM notifications ORDER BY id DESC LIMIT 1");
      if (inserted) notificationId = inserted.id;
    }
  }

  // 3. Reject invalid Indian phone numbers
  if (!phoneNorm.valid) {
    const invalidErr = phoneNorm.error || 'Invalid Indian mobile number';
    console.warn(`[SMS BLOCKED] ${invalidErr} (${phone})`);

    db.run(
      `UPDATE notifications SET 
        status = 'FAILED',
        error_code = 'INVALID_PHONE_NUMBER',
        error_message = ?,
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [invalidErr, notificationId]
    );

    return {
      success: false,
      notificationId,
      status: 'FAILED',
      error: invalidErr,
      code: 'INVALID_PHONE_NUMBER'
    };
  }

  // 4. Check Provider API Configuration
  if (!config.sms.isConfigured) {
    const unconfiguredErr = `SMS provider credentials not configured (SMS_API_KEY missing in .env or settings for provider ${config.sms.provider})`;
    console.warn(`[SMS BLOCKED] ${unconfiguredErr}`);

    db.run(
      `UPDATE notifications SET 
        status = 'FAILED',
        error_code = 'SMS_NOT_CONFIGURED',
        error_message = ?,
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [unconfiguredErr, notificationId]
    );

    return {
      success: false,
      notificationId,
      status: 'FAILED',
      error: unconfiguredErr,
      code: 'SMS_NOT_CONFIGURED'
    };
  }

  const { provider, apiKey, apiSecret, senderId, templateId, baseUrl } = config.sms;

  // 5. Call Real SMS Provider API
  try {
    console.log(`[SMS ATTEMPT] Calling real SMS provider "${provider}" for ${maskedNumber}...`);

    let providerResponse = null;
    let providerMsgId = null;
    let isSuccess = false;
    let errorCode = null;
    let errorMessage = null;
    let httpStatus = 200;

    if (provider === 'fast2sms') {
      // Fast2SMS API integration (Quick route or DLT)
      const postUrl = baseUrl || 'https://www.fast2sms.com/dev/bulkV2';

      // Build payload based on DLT or Quick SMS
      const payload = templateId ? {
        route: 'dlt',
        sender_id: senderId || 'KIDGFT',
        message: templateId,
        variables_values: message,
        flash: 0,
        numbers: phoneNorm.tenDigit
      } : {
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: phoneNorm.tenDigit
      };

      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      httpStatus = res.status;
      providerResponse = await res.json();

      if (res.ok && providerResponse.return === true) {
        isSuccess = true;
        providerMsgId = providerResponse.request_id || `F2S-${Date.now()}`;
      } else {
        isSuccess = false;
        errorCode = providerResponse.status_code || res.status;
        const rawMsg = Array.isArray(providerResponse.message) ? providerResponse.message.join(', ') : (providerResponse.message || 'Fast2SMS API rejected request');
        if (rawMsg.includes('100 INR') || rawMsg.includes('transaction of 100')) {
          errorMessage = `${rawMsg} (💡 Solution: Fast2SMS requires a one-time ₹100 wallet recharge to unlock API routes. Or switch to Twilio free trial / Telegram Bot 100% free.)`;
        } else {
          errorMessage = rawMsg;
        }
      }

    } else if (provider === 'telegram') {
      // Telegram Bot API integration (100% Free Forever, instant mobile push)
      const botToken = apiKey;
      // Chat ID can be configured in templateId or senderId, or falls back to admin default
      const chatId = templateId || senderId;
      
      if (!chatId || chatId === 'KIDGFT') {
        throw new Error('Telegram Chat ID required. Put your Chat ID (e.g. from @userinfobot) in Template ID or Sender ID field.');
      }

      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const tgPayload = {
        chat_id: chatId,
        text: `📱 *Giggle & Bloom Mobile Alert*\nTo: \`${phoneNorm.tenDigit}\`\nOrder: \`${orderId}\`\n\n${message}`,
        parse_mode: 'Markdown'
      };

      const res = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tgPayload)
      });

      httpStatus = res.status;
      providerResponse = await res.json();

      if (res.ok && providerResponse.ok === true) {
        isSuccess = true;
        providerMsgId = `TG-${providerResponse.result.message_id}`;
      } else {
        isSuccess = false;
        errorCode = providerResponse.error_code || res.status;
        errorMessage = providerResponse.description || 'Telegram Bot message failed';
      }

    } else if (provider === 'twilio') {
      // Twilio API integration
      const accountSid = apiKey;
      const authToken = apiSecret;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append('To', phoneNorm.e164);
      formData.append('From', senderId || '+15005550006');
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
        errorCode = providerResponse.code || res.status;
        errorMessage = providerResponse.message || 'Twilio message rejected';
      }

    } else {
      // Generic Webhook / HTTP POST integration
      const webhookUrl = baseUrl;
      if (!webhookUrl) {
        throw new Error('SMS_BASE_URL is required for custom SMS provider.');
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Sender-ID': senderId || 'KIDGFT'
        },
        body: JSON.stringify({
          phone: phoneNorm.e164,
          raw_phone: phoneNorm.tenDigit,
          message,
          order_id: orderId,
          notification_type: notificationType,
          template_id: templateId
        })
      });

      httpStatus = res.status;
      const textRes = await res.text();
      try {
        providerResponse = JSON.parse(textRes);
      } catch (e) {
        providerResponse = { raw: textRes };
      }

      if (res.ok) {
        isSuccess = true;
        providerMsgId = providerResponse.message_id || providerResponse.id || `CUSTOM-${Date.now()}`;
      } else {
        isSuccess = false;
        errorCode = res.status;
        errorMessage = providerResponse.message || providerResponse.error || 'Webhook returned error status';
      }
    }

    // 6. Handle Delivery Result
    if (isSuccess) {
      console.log(`[SMS ACCEPTED BY PROVIDER] MsgID: ${providerMsgId} | Recipient: ${maskedNumber}`);

      // Provider accepted the request: mark as SENT (never mark as DELIVERED until webhook confirms)
      db.run(
        `UPDATE notifications SET 
          status = 'SENT',
          provider = ?,
          provider_message_id = ?,
          raw_response = ?,
          error_code = NULL,
          error_message = NULL,
          last_attempt_at = CURRENT_TIMESTAMP,
          attempt_count = attempt_count + 1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          provider.toUpperCase(),
          String(providerMsgId),
          JSON.stringify(providerResponse),
          notificationId
        ]
      );

      return {
        success: true,
        notificationId,
        status: 'SENT',
        provider: provider.toUpperCase(),
        providerMessageId: providerMsgId,
        recipient: maskedNumber,
        message: 'SMS sent successfully. Provider accepted message for dispatch.'
      };
    } else {
      console.error(`[SMS PROVIDER REJECTED] HTTP ${httpStatus} | Error: ${errorMessage}`);

      db.run(
        `UPDATE notifications SET 
          status = 'FAILED',
          provider = ?,
          error_code = ?,
          error_message = ?,
          raw_response = ?,
          last_attempt_at = CURRENT_TIMESTAMP,
          attempt_count = attempt_count + 1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          provider.toUpperCase(),
          String(errorCode),
          errorMessage,
          JSON.stringify({ httpStatus, response: providerResponse }),
          notificationId
        ]
      );

      return {
        success: false,
        notificationId,
        status: 'FAILED',
        http_status: httpStatus,
        error_code: errorCode,
        error_message: errorMessage,
        error: `SMS failed: [${errorCode}] ${errorMessage}`
      };
    }

  } catch (apiErr) {
    console.error(`[SMS NETWORK ERROR] Could not contact ${provider}:`, apiErr.message);

    db.run(
      `UPDATE notifications SET 
        status = 'FAILED',
        provider = ?,
        error_code = 'NETWORK_ERROR',
        error_message = ?,
        raw_response = ?,
        last_attempt_at = CURRENT_TIMESTAMP,
        attempt_count = attempt_count + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        provider.toUpperCase(),
        apiErr.message,
        JSON.stringify({ error: apiErr.message, stack: apiErr.stack }),
        notificationId
      ]
    );

    return {
      success: false,
      notificationId,
      status: 'FAILED',
      http_status: 500,
      error_code: 'NETWORK_ERROR',
      error_message: apiErr.message,
      error: `SMS failed: ${apiErr.message}`
    };
  }
}

/**
 * Dispatches order notification SMS for the 9 supported order events:
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
async function sendOrderNotificationSMS(order, eventType) {
  let message = '';

  switch (eventType) {
    case 'Payment Verified':
      message = `Payment of ₹${order.total_amount} verified for order ${order.order_id}! Thank you for shopping with Giggle & Bloom. We are preparing your gifts!`;
      break;
    case 'Order Accepted':
      message = `Your order ${order.order_id} has been accepted. Thank you for shopping with us! - Giggle & Bloom Kids Gift Shop`;
      break;
    case 'Processing':
      message = `Your order ${order.order_id} is now being hand-picked and prepared with love. Giggle & Bloom Kids Gift Shop.`;
      break;
    case 'Packed':
      message = `Great news! Your gifts for order ${order.order_id} have been safely packed and are ready for dispatch. Giggle & Bloom.`;
      break;
    case 'Shipped':
      message = `Order ${order.order_id} has shipped via ${order.courier_name || 'Express Courier'}! Tracking: ${order.tracking_number || 'Available soon'}. Giggle & Bloom.`;
      break;
    case 'Out for Delivery':
      message = `Yay! Order ${order.order_id} is out for delivery today. Keep your phone handy! Giggle & Bloom Kids Gift Shop.`;
      break;
    case 'Delivered':
      message = `Delivered! Your gifts for order ${order.order_id} have arrived. We hope they bring big smiles! Thank you for choosing Giggle & Bloom.`;
      break;
    case 'Cancelled':
      message = `Your order ${order.order_id} has been cancelled. If paid, your refund will be credited in 3-5 business days. Giggle & Bloom.`;
      break;
    case 'Payment Failed':
      message = `Payment verification failed for Order ${order.order_id}. Please retry payment or contact Giggle & Bloom support.`;
      break;
    default:
      message = `Update for order ${order.order_id}: status is now ${eventType}. Giggle & Bloom Kids Gift Shop.`;
  }

  const idempotencyKey = `${order.order_id}:${eventType}:SMS`;

  return sendSMS({
    phone: order.customer_phone,
    message,
    orderId: order.order_id,
    notificationType: eventType,
    idempotencyKey
  });
}

/**
 * Handles SMS Delivery Webhook from providers to transition status from SENT -> DELIVERED.
 */
async function handleSmsDeliveryWebhook(payload) {
  const db = await getDatabase();
  console.log('[SMS DELIVERY WEBHOOK RECEIVED]', JSON.stringify(payload));

  // Extract message ID and delivery status across different providers
  let providerMsgId = payload.request_id || payload.message_id || payload.MessageSid || payload.id;
  let status = (payload.status || payload.delivery_status || '').toLowerCase();

  if (providerMsgId) {
    const existing = db.queryOne("SELECT id, status FROM notifications WHERE provider_message_id = ?", [String(providerMsgId)]);
    if (existing) {
      if (status.includes('deliver') || status === 'success' || status === 'sent') {
        db.run(
          "UPDATE notifications SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [existing.id]
        );
        console.log(`[SMS STATUS UPDATED] Notification #${existing.id} updated to DELIVERED via webhook.`);
        return { updated: true, notificationId: existing.id, newStatus: 'DELIVERED' };
      }
    }
  }

  return { updated: false, received: true };
}

module.exports = {
  verifySmsProvider,
  sendSMS,
  sendOrderNotificationSMS,
  handleSmsDeliveryWebhook
};
