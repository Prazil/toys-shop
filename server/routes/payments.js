const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');
const { MERCHANT_UPI_ID, generateUPIUrl, verifyRazorpaySignature, verifyWebhookSignature } = require('../services/paymentService');
const { sendOrderNotificationEmail } = require('../services/emailService');
const { sendOrderNotificationSMS } = require('../services/smsService');
const { enqueueOrderSync } = require('../services/googleSheets');

// POST /api/payments/create-intent
router.post('/create-intent', async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const db = await getDatabase();
    const order = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const paymentId = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const upiUrl = generateUPIUrl({
      amount: order.total_amount,
      orderId: order.order_id,
      merchantUpi: MERCHANT_UPI_ID,
      merchantName: 'Giggle and Bloom Kids Gift Shop'
    });

    // Record initial payment record
    db.run(
      `INSERT INTO payments (
        order_code, payment_id, amount, currency, payment_method, payment_status, created_at
      ) VALUES (?, ?, ?, 'INR', 'UPI', 'Pending', CURRENT_TIMESTAMP)`,
      [order.order_id, paymentId, order.total_amount]
    );

    // Deep links for Indian UPI apps
    const gpayUrl = `tez://upi/pay?pa=${MERCHANT_UPI_ID}&pn=Giggle%20and%20Bloom&am=${order.total_amount.toFixed(2)}&tn=Order%20${order.order_id}&cu=INR`;
    const phonepeUrl = `phonepe://pay?pa=${MERCHANT_UPI_ID}&pn=Giggle%20and%20Bloom&am=${order.total_amount.toFixed(2)}&tn=Order%20${order.order_id}&cu=INR`;
    const paytmUrl = `paytmmp://pay?pa=${MERCHANT_UPI_ID}&pn=Giggle%20and%20Bloom&am=${order.total_amount.toFixed(2)}&tn=Order%20${order.order_id}&cu=INR`;
    const bhimUrl = `bhim://pay?pa=${MERCHANT_UPI_ID}&pn=Giggle%20and%20Bloom&am=${order.total_amount.toFixed(2)}&tn=Order%20${order.order_id}&cu=INR`;

    return res.json({
      success: true,
      payment: {
        payment_id: paymentId,
        order_id: order.order_id,
        amount: order.total_amount,
        merchant_upi: MERCHANT_UPI_ID,
        upi_url: upiUrl,
        deep_links: {
          gpay: gpayUrl,
          phonepe: phonepeUrl,
          paytm: paytmUrl,
          bhim: bhimUrl
        }
      }
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate payment.' });
  }
});

// POST /api/payments/submit-utr (Customer submits UPI reference / UTR)
// RULE: Never trust this blindly! Sets status to Processing (Awaiting Verification)
router.post('/submit-utr', async (req, res) => {
  try {
    const { order_id, utr_number, payment_id } = req.body;
    if (!order_id || !utr_number || !utr_number.trim()) {
      return res.status(400).json({ success: false, message: 'Order ID and 12-digit UPI Reference (UTR) are required.' });
    }

    const cleanUtr = utr_number.trim();
    if (cleanUtr.length < 8) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UPI transaction reference number (UTR).' });
    }

    const db = await getDatabase();
    const order = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Check existing payment record or update
    const existingPayment = db.queryOne("SELECT * FROM payments WHERE order_code = ? ORDER BY id DESC LIMIT 1", [order_id]);
    if (existingPayment) {
      db.run(
        "UPDATE payments SET transaction_reference = ?, payment_status = 'Processing' WHERE id = ?",
        [cleanUtr, existingPayment.id]
      );
    } else {
      const pid = payment_id || `PAY-${Date.now()}`;
      db.run(
        `INSERT INTO payments (
          order_code, payment_id, transaction_reference, amount, currency, payment_method, payment_status, created_at
        ) VALUES (?, ?, ?, ?, 'INR', 'UPI', 'Processing', CURRENT_TIMESTAMP)`,
        [order_id, pid, cleanUtr, order.total_amount]
      );
    }

    // Update order with reference
    db.run(
      "UPDATE orders SET payment_ref = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      [cleanUtr, order_id]
    );

    console.log(`[UPI UTR SUBMITTED] Order: ${order_id} | UTR: ${cleanUtr} | Status: Processing (Awaiting Verification)`);

    return res.json({
      success: true,
      status: 'Processing',
      message: 'Transaction reference received! Server-side verification is in progress.',
      note: 'Your order is recorded and waiting for payment verification confirmation.'
    });
  } catch (err) {
    console.error('Error submitting UTR:', err);
    return res.status(500).json({ success: false, message: 'Failed to record transaction reference.' });
  }
});

// POST /api/payments/verify-gateway (Razorpay / Gateway Server Verification)
router.post('/verify-gateway', async (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const db = await getDatabase();

    const order = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const secretSetting = db.queryOne("SELECT value FROM settings WHERE key = 'razorpay_key_secret'");
    const secret = secretSetting ? secretSetting.value : process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(400).json({
        success: false,
        message: 'Payment gateway secret is not configured in store settings.'
      });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      secret
    });

    if (!isValid) {
      console.warn(`[PAYMENT VERIFICATION FAILED] Invalid signature for order ${order_id}`);
      return res.status(400).json({ success: false, message: 'Payment verification failed: Signature mismatch.' });
    }

    // Verification SUCCESSFUL
    db.run(
      "UPDATE orders SET payment_status = 'Verified', order_status = 'Payment Verified', payment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      [razorpay_payment_id, order_id]
    );

    db.run(
      "UPDATE payments SET payment_status = 'Verified', gateway_reference = ?, verified_at = CURRENT_TIMESTAMP WHERE order_code = ?",
      [razorpay_payment_id, order_id]
    );

    const updatedOrder = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order_id]);
    const fullOrder = { ...updatedOrder, items };

    // DISPATCH NOTIFICATIONS & GOOGLE SHEETS
    sendOrderNotificationEmail(fullOrder, 'Payment Verified').catch(console.error);
    sendOrderNotificationSMS(fullOrder, 'Payment Verified').catch(console.error);
    enqueueOrderSync(order_id, 'INSERT');

    return res.json({
      success: true,
      message: 'Payment verified successfully! Order confirmed.',
      order: fullOrder
    });
  } catch (err) {
    console.error('Error verifying gateway payment:', err);
    return res.status(500).json({ success: false, message: 'Payment verification error.' });
  }
});

// POST /api/payments/webhook (Automated Webhook from Payment Gateway / Bank)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const db = await getDatabase();
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'];
    const webhookSecretSetting = db.queryOne("SELECT value FROM settings WHERE key = 'webhook_secret'");
    const webhookSecret = webhookSecretSetting ? webhookSecretSetting.value : process.env.WEBHOOK_SECRET;

    // Optional verification if secret configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature({
        rawBody: req.body,
        signature,
        webhookSecret
      });
      if (!isValid) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event || (payload.payment && payload.payment.status);

    console.log(`[PAYMENT WEBHOOK RECEIVED] Event: ${event}`);

    // If payment captured/authorized
    if (event === 'payment.captured' || event === 'order.paid' || event === 'SUCCESS') {
      const orderId = payload.payload?.payment?.entity?.notes?.order_id || payload.order_id;
      const paymentId = payload.payload?.payment?.entity?.id || payload.payment_id;

      if (orderId) {
        const order = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [orderId]);
        if (order && order.payment_status !== 'Verified') {
          db.run(
            "UPDATE orders SET payment_status = 'Verified', order_status = 'Payment Verified', payment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
            [paymentId, orderId]
          );

          db.run(
            "UPDATE payments SET payment_status = 'Verified', gateway_reference = ?, verified_at = CURRENT_TIMESTAMP WHERE order_code = ?",
            [paymentId, orderId]
          );

          const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [orderId]);
          const fullOrder = { ...order, order_status: 'Payment Verified', payment_status: 'Verified', payment_id: paymentId, items };

          sendOrderNotificationEmail(fullOrder, 'Payment Verified').catch(console.error);
          sendOrderNotificationSMS(fullOrder, 'Payment Verified').catch(console.error);
          enqueueOrderSync(orderId, 'INSERT');
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/payments/admin/verify/:id (Admin Manual Verification Fallback)
router.post('/admin/verify/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { audit_notes } = req.body;
    const db = await getDatabase();

    const order = db.queryOne("SELECT * FROM orders WHERE id = ? OR order_id = ?", [id, id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.payment_status === 'Verified') {
      return res.status(400).json({ success: false, message: 'Payment for this order is already verified.' });
    }

    const verifiedBy = req.admin ? req.admin.username : 'Admin';
    const auditRecord = `Verified by ${verifiedBy}. Note: ${audit_notes || 'Verified against UPI merchant account (prazilss4@oksbi)'}`;

    // Update payment record
    const payment = db.queryOne("SELECT * FROM payments WHERE order_code = ? ORDER BY id DESC LIMIT 1", [order.order_id]);
    if (payment) {
      db.run(
        "UPDATE payments SET payment_status = 'Verified', gateway_reference = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?",
        [auditRecord, payment.id]
      );
    } else {
      db.run(
        `INSERT INTO payments (
          order_code, payment_id, transaction_reference, amount, currency, payment_method, payment_status, gateway_reference, verified_at
        ) VALUES (?, ?, ?, ?, 'INR', 'UPI', 'Verified', ?, CURRENT_TIMESTAMP)`,
        [order.order_id, `VERIFIED-${Date.now()}`, order.payment_ref || 'MANUAL-UTR', order.total_amount, auditRecord]
      );
    }

    // Update Order
    db.run(
      "UPDATE orders SET payment_status = 'Verified', order_status = 'Payment Verified', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [order.id]
    );

    const updatedOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [order.id]);
    const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order.order_id]);
    const fullOrder = { ...updatedOrder, items };

    // DISPATCH NOTIFICATIONS & GOOGLE SHEETS
    sendOrderNotificationEmail(fullOrder, 'Payment Verified').catch(console.error);
    sendOrderNotificationSMS(fullOrder, 'Payment Verified').catch(console.error);
    enqueueOrderSync(order.order_id, 'INSERT');

    console.log(`[MANUAL PAYMENT VERIFIED] Order ${order.order_id} verified by ${verifiedBy}`);

    return res.json({
      success: true,
      message: `Payment verified successfully for Order ${order.order_id}! Customer notified via Email & SMS, Google Sheets sync enqueued.`,
      order: fullOrder
    });
  } catch (err) {
    console.error('Error in admin payment verification:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// GET /api/payments/admin/list
router.get('/admin/list', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const payments = db.query("SELECT * FROM payments ORDER BY id DESC");
    return res.json({ success: true, payments });
  } catch (err) {
    console.error('Error fetching admin payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to load payments.' });
  }
});

module.exports = router;
