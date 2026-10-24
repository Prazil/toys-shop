const { getDatabase } = require('../database/db');
const { sendEmail } = require('./emailDeliveryService');
const { sendSMS } = require('./smsDeliveryService');

let retryTimer = null;
let isProcessing = false;

/**
 * Retries a single notification by its database ID.
 * Admin can manually invoke this for any failed notification.
 */
async function retryNotification(id) {
  const db = await getDatabase();
  const notif = db.queryOne("SELECT * FROM notifications WHERE id = ?", [id]);

  if (!notif) {
    throw new Error(`Notification #${id} not found.`);
  }

  console.log(`[MANUAL RETRY] Retrying notification #${notif.id} (${notif.channel} to ${notif.recipient_masked || notif.recipient})...`);

  if (notif.channel === 'EMAIL') {
    return sendEmail({
      to: notif.recipient,
      subject: notif.subject,
      html: notif.html_body,
      text: notif.message_body,
      orderId: notif.order_code,
      eventType: notif.notification_type,
      idempotencyKey: notif.idempotency_key,
      forceRetry: true
    });
  } else if (notif.channel === 'SMS') {
    return sendSMS({
      phone: notif.recipient,
      message: notif.message_body,
      orderId: notif.order_code,
      notificationType: notif.notification_type,
      idempotencyKey: notif.idempotency_key,
      forceRetry: true
    });
  } else {
    throw new Error(`Unsupported notification channel: ${notif.channel}`);
  }
}

/**
 * Background queue processor for notifications.
 * Automatically retries failed or queued notifications with exponential backoff up to 3 attempts.
 */
async function processNotificationQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const db = await getDatabase();

    // Find pending queued items or failed items that haven't reached max attempts (3)
    const items = db.query(`
      SELECT * FROM notifications 
      WHERE (status = 'QUEUED' OR (status = 'FAILED' AND attempt_count < max_attempts))
      AND (last_attempt_at IS NULL OR datetime(last_attempt_at, '+' || (attempt_count * 30) || ' seconds') <= datetime('now'))
      ORDER BY id ASC
      LIMIT 10
    `);

    for (const item of items) {
      console.log(`[BACKGROUND RETRY] Processing notification #${item.id} (Attempt ${item.attempt_count + 1}/${item.max_attempts})...`);
      try {
        await retryNotification(item.id);
      } catch (err) {
        console.error(`[BACKGROUND RETRY ERROR] Failed to process notification #${item.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[NOTIFICATION QUEUE PROCESSOR ERROR]', err.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Starts the background retry worker running every 30 seconds.
 */
function startNotificationQueueWorker() {
  if (retryTimer) return;
  console.log('Starting Notification Background Retry Worker (interval: 30s)...');
  retryTimer = setInterval(processNotificationQueue, 30000);
}

/**
 * Stops the background retry worker.
 */
function stopNotificationQueueWorker() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

module.exports = {
  retryNotification,
  processNotificationQueue,
  startNotificationQueueWorker,
  stopNotificationQueueWorker
};
