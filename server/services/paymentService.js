const crypto = require('crypto');
const { getDatabase } = require('../database/db');

const MERCHANT_UPI_ID = 'prazilss4@oksbi';
const MERCHANT_NAME = 'Kids Gift Shop';

function generateUPIUrl({ amount, orderId, merchantUpi = MERCHANT_UPI_ID, merchantName = MERCHANT_NAME }) {
  const encName = encodeURIComponent(merchantName);
  const encNote = encodeURIComponent(`Order ${orderId}`);
  const formattedAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${merchantUpi}&pn=${encName}&am=${formattedAmount}&tn=${encNote}&cu=INR`;
}

function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
  if (!secret || !signature || !orderId || !paymentId) {
    return false;
  }
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
}

function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!webhookSecret || !signature) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

async function recordPaymentAttempt({ orderCode, paymentId, amount, paymentMethod = 'UPI', transactionRef = '', gatewayRef = '', rawPayload = {} }) {
  const db = await getDatabase();
  
  // Check if payment ID already recorded
  const existing = db.queryOne("SELECT * FROM payments WHERE payment_id = ?", [paymentId]);
  if (existing) {
    return existing;
  }

  const result = db.run(
    `INSERT INTO payments (
      order_code, payment_id, transaction_reference, amount, currency, 
      payment_method, payment_status, gateway_reference, raw_payload
    ) VALUES (?, ?, ?, ?, 'INR', ?, 'Pending', ?, ?)`,
    [
      orderCode,
      paymentId,
      transactionRef,
      amount,
      paymentMethod,
      gatewayRef,
      JSON.stringify(rawPayload)
    ]
  );

  return { id: result.lastInsertRowid, orderCode, paymentId, paymentStatus: 'Pending' };
}

module.exports = {
  MERCHANT_UPI_ID,
  MERCHANT_NAME,
  generateUPIUrl,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  recordPaymentAttempt
};
