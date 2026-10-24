const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');
const { sendOrderNotificationEmail } = require('../services/emailService');
const { sendOrderNotificationSMS } = require('../services/smsService');
const { enqueueOrderSync } = require('../services/googleSheets');
const { generateUPIUrl, MERCHANT_UPI_ID } = require('../services/paymentService');

function generateOrderId(db) {
  const year = new Date().getFullYear();
  let nextNum = 1;
  const maxRow = db.queryOne("SELECT MAX(id) as max_id FROM orders");
  if (maxRow && maxRow.max_id) {
    nextNum = maxRow.max_id + 1;
  }
  let orderId = `GS-${year}-${String(nextNum).padStart(6, '0')}`;
  while (db.queryOne("SELECT id FROM orders WHERE order_id = ?", [orderId])) {
    nextNum++;
    orderId = `GS-${year}-${String(nextNum).padStart(6, '0')}`;
  }
  return orderId;
}

function validateIndianPhone(phone) {
  const clean = phone.replace(/[\s\-\+]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(clean);
}

function validatePincode(pincode) {
  return /^\d{6}$/.test(pincode.trim());
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// POST /api/orders (Customer Create Order)
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const {
      customer_name,
      customer_phone,
      customer_email,
      house_no,
      street,
      area,
      city,
      district,
      state,
      pincode,
      landmark,
      order_notes,
      items
    } = req.body;

    // VALIDATION OF CUSTOMER DETAILS
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!customer_phone || !validateIndianPhone(customer_phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    if (!customer_email || !validateEmail(customer_email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!house_no || !house_no.trim()) {
      return res.status(400).json({ success: false, message: 'House / Flat / Door Number is required.' });
    }
    if (!street || !street.trim()) {
      return res.status(400).json({ success: false, message: 'Street / Road Name is required.' });
    }
    if (!area || !area.trim()) {
      return res.status(400).json({ success: false, message: 'Area / Locality is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required.' });
    }
    if (!district || !district.trim()) {
      return res.status(400).json({ success: false, message: 'District is required.' });
    }
    if (!state || !state.trim()) {
      return res.status(400).json({ success: false, message: 'State is required.' });
    }
    if (!pincode || !validatePincode(pincode)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shopping cart is empty.' });
    }

    // SERVER-SIDE STOCK & PRICE VALIDATION
    let verifiedItems = [];
    let subtotal = 0;
    let discountTotal = 0;

    for (const item of items) {
      const product = db.queryOne(
        "SELECT * FROM products WHERE id = ? AND status != 'Archived' AND is_visible = 1",
        [item.id]
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name || 'Unknown'}" is no longer available in store.`
        });
      }

      if (product.status === 'Sold Out' || product.stock_quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `"${product.name}" is currently sold out.`
        });
      }

      const requestedQty = parseInt(item.quantity, 10) || 1;
      if (requestedQty > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock_quantity} unit(s) of "${product.name}" are in stock. Please adjust your cart.`
        });
      }

      // Compute actual server price
      const effectivePrice = (product.discount_price && product.discount_price < product.price)
        ? product.discount_price
        : product.price;

      const itemTotal = effectivePrice * requestedQty;
      subtotal += product.price * requestedQty;
      if (product.discount_price && product.discount_price < product.price) {
        discountTotal += (product.price - product.discount_price) * requestedQty;
      }

      verifiedItems.push({
        product_id: product.id,
        product_code: product.product_id,
        product_name: product.name,
        price_at_purchase: product.price,
        discount_price_at_purchase: product.discount_price || null,
        effective_price: effectivePrice,
        quantity: requestedQty,
        total_price: itemTotal,
        product_image: product.main_image
      });
    }

    // Dynamic shipping fee rule from store settings
    const freeShippingThresholdSetting = db.queryOne("SELECT value FROM settings WHERE key = 'free_shipping_threshold'");
    const shippingFeeSetting = db.queryOne("SELECT value FROM settings WHERE key = 'shipping_fee'");
    const threshold = freeShippingThresholdSetting ? parseFloat(freeShippingThresholdSetting.value) : 499;
    const defaultShippingFee = shippingFeeSetting ? parseFloat(shippingFeeSetting.value) : 0;
    const finalSubtotal = subtotal - discountTotal;
    const shippingFee = (defaultShippingFee === 0 || (threshold > 0 && finalSubtotal >= threshold)) ? 0 : defaultShippingFee;
    const grandTotal = finalSubtotal + shippingFee;

    const orderId = generateOrderId(db);
    // Generate secure 4-digit Delivery OTP (Provided free to customer for secure delivery)
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // DEDUCT INVENTORY AND CREATE ORDER ATOMICALLY
    let newOrder;
    db.transaction(() => {
      // 1. Deduct stock for each item
      for (const item of verifiedItems) {
        db.run(
          "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
        // If stock hits 0, auto-mark sold out
        const updatedProd = db.queryOne("SELECT stock_quantity FROM products WHERE id = ?", [item.product_id]);
        if (updatedProd && updatedProd.stock_quantity <= 0) {
          db.run("UPDATE products SET status = 'Sold Out' WHERE id = ?", [item.product_id]);
        }
      }

      // 2. Insert order with delivery_otp
      const orderInsert = db.run(
        `INSERT INTO orders (
          order_id, customer_name, customer_phone, customer_email,
          house_no, street, area, city, district, state, pincode, landmark,
          order_notes, subtotal, discount_total, shipping_fee, total_amount,
          payment_method, payment_status, order_status, delivery_otp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPI', 'Pending', 'Payment Pending', ?)`,
        [
          orderId,
          customer_name.trim(),
          customer_phone.trim(),
          customer_email.trim().toLowerCase(),
          house_no.trim(),
          street.trim(),
          area.trim(),
          city.trim(),
          district.trim(),
          state.trim(),
          pincode.trim(),
          landmark ? landmark.trim() : '',
          order_notes ? order_notes.trim() : '',
          subtotal,
          discountTotal,
          shippingFee,
          grandTotal,
          deliveryOtp
        ]
      );

      const dbOrderId = orderInsert.lastInsertRowid;

      // 3. Insert order items
      for (const it of verifiedItems) {
        db.run(
          `INSERT INTO order_items (
            order_id, order_code, product_id, product_code,
            product_name, price_at_purchase, discount_price_at_purchase,
            quantity, total_price, product_image
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dbOrderId,
            orderId,
            it.product_id,
            it.product_code,
            it.product_name,
            it.effective_price,
            it.discount_price_at_purchase,
            it.quantity,
            it.total_price,
            it.product_image
          ]
        );
      }

      newOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [dbOrderId]);
    });

    // Generate UPI Payment details
    const upiUrl = generateUPIUrl({
      amount: grandTotal,
      orderId: orderId,
      merchantUpi: MERCHANT_UPI_ID,
      merchantName: 'Giggle and Bloom Kids Gift Shop'
    });

    console.log(`[ORDER CREATED] ID: ${orderId} | Customer: ${customer_name} | Amount: ₹${grandTotal}`);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete your online payment.',
      order: {
        ...newOrder,
        items: verifiedItems,
        upi_id: MERCHANT_UPI_ID,
        upi_payment_url: upiUrl,
        formatted_amount: grandTotal
      }
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ success: false, message: 'Failed to place order: ' + err.message });
  }
});

// GET /api/orders/:id (Customer Order Confirmation)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const order = db.queryOne("SELECT * FROM orders WHERE order_id = ? OR id = ?", [id, id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order.order_id]);

    return res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (err) {
    console.error('Error fetching order confirmation:', err);
    return res.status(500).json({ success: false, message: 'Failed to load order.' });
  }
});

// POST /api/orders/track (Customer Order Tracking)
router.post('/track', async (req, res) => {
  try {
    const { order_id, contact } = req.body;
    if (!order_id || !contact) {
      return res.status(400).json({ success: false, message: 'Order ID and Phone Number / Email are required.' });
    }

    const db = await getDatabase();
    const cleanContact = contact.trim().toLowerCase();

    const order = db.queryOne(
      `SELECT * FROM orders 
       WHERE order_id = ? 
       AND (LOWER(customer_email) = ? OR customer_phone LIKE ? OR customer_phone = ?)`,
      [order_id.trim().toUpperCase(), cleanContact, `%${contact.trim()}%`, contact.trim()]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No matching order found. Please verify your Order ID and phone number or email.'
      });
    }

    const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order.order_id]);

    // Milestones definition
    const milestones = [
      { key: 'Order Placed', label: 'Order Placed', desc: 'Order details received' },
      { key: 'Payment Verified', label: 'Payment Verified', desc: 'Secure payment confirmed' },
      { key: 'Order Accepted', label: 'Order Accepted', desc: 'Shop confirmed your order' },
      { key: 'Processing', label: 'Processing', desc: 'Curating & quality checking gifts' },
      { key: 'Packed', label: 'Packed', desc: 'Gift-wrapped & packed with care' },
      { key: 'Shipped', label: 'Shipped', desc: 'Dispatched with courier partner' },
      { key: 'Out for Delivery', label: 'Out for Delivery', desc: 'Delivery partner arriving soon' },
      { key: 'Delivered', label: 'Delivered', desc: 'Gift delivered with joy!' }
    ];

    const statusHierarchy = [
      'Payment Pending',
      'Payment Verified',
      'Order Accepted',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered'
    ];

    const currentIndex = statusHierarchy.indexOf(order.order_status);

    const timeline = milestones.map((m, idx) => ({
      ...m,
      is_completed: currentIndex >= idx && order.order_status !== 'Cancelled',
      is_current: statusHierarchy[currentIndex] === m.key
    }));

    return res.json({
      success: true,
      order: {
        ...order,
        items,
        timeline,
        is_cancelled: order.order_status === 'Cancelled'
      }
    });
  } catch (err) {
    console.error('Error tracking order:', err);
    return res.status(500).json({ success: false, message: 'Failed to look up order tracking.' });
  }
});

// ==========================================
// ADMIN ORDER ENDPOINTS (PROTECTED)
// ==========================================

// GET /api/admin/orders
router.get('/admin/list', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, search } = req.query;

    let conditions = [];
    let params = [];

    if (status && status !== 'all') {
      conditions.push("order_status = ?");
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push("(order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const orders = db.query(`SELECT * FROM orders ${whereClause} ORDER BY created_at DESC`, params);

    // Enrich with item counts
    const enriched = orders.map(ord => {
      const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [ord.order_id]);
      return {
        ...ord,
        items,
        item_count: items.reduce((sum, it) => sum + it.quantity, 0)
      };
    });

    return res.json({ success: true, orders: enriched });
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    return res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

// PUT /api/admin/orders/:id/status (Admin Update Status)
router.put('/admin/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, courier_name, tracking_number, tracking_url } = req.body;
    const db = await getDatabase();

    const order = db.queryOne("SELECT * FROM orders WHERE id = ? OR order_id = ?", [id, id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const oldStatus = order.order_status;
    const newStatus = order_status;

    // Handle cancellation restock
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order.order_id]);
      for (const it of items) {
        db.run("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [it.quantity, it.product_id]);
        db.run("UPDATE products SET status = 'Available' WHERE id = ? AND status = 'Sold Out'", [it.product_id]);
      }
      console.log(`[RESTOCK] Order ${order.order_id} cancelled. Restocked ${items.length} product(s).`);
    }

    // Update orders table
    let updates = ["order_status = ?", "updated_at = CURRENT_TIMESTAMP"];
    let params = [newStatus];

    if (courier_name !== undefined) {
      updates.push("courier_name = ?");
      params.push(courier_name);
    }
    if (tracking_number !== undefined) {
      updates.push("tracking_number = ?");
      params.push(tracking_number);
    }
    if (tracking_url !== undefined) {
      updates.push("tracking_url = ?");
      params.push(tracking_url);
    }

    params.push(order.id);
    db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [order.id]);
    const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [order.order_id]);
    const fullOrder = { ...updatedOrder, items };

    // DISPATCH NOTIFICATIONS & SYNC
    // 1. Send Email
    sendOrderNotificationEmail(fullOrder, newStatus).catch(err => {
      console.error('[EMAIL ERROR] Notification failed:', err.message);
    });

    // 2. Send SMS
    sendOrderNotificationSMS(fullOrder, newStatus).catch(err => {
      console.error('[SMS ERROR] Notification failed:', err.message);
    });

    // 3. Update Google Sheets (row updated, no duplicates)
    enqueueOrderSync(order.order_id, 'UPDATE');

    console.log(`[ORDER STATUS CHANGED] ${order.order_id}: ${oldStatus} -> ${newStatus}`);

    return res.json({
      success: true,
      message: `Order status updated to "${newStatus}". Customer notified via Email & SMS, Google Sheets sync enqueued.`,
      order: fullOrder
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

module.exports = router;
