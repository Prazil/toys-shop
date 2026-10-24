const { getDatabase } = require('../database/db');

// Suggested Google Sheet Columns
const SHEET_HEADERS = [
  'Order ID',
  'Order Date',
  'Customer Name',
  'Phone',
  'Email',
  'House Number',
  'Street',
  'Area',
  'City',
  'District',
  'State',
  'PIN Code',
  'Landmark',
  'Products',
  'Quantity',
  'Subtotal',
  'Discount',
  'Total Amount',
  'Payment ID',
  'Payment Method',
  'Payment Status',
  'Order Status',
  'Tracking Number',
  'Created At',
  'Updated At'
];

async function formatOrderForSheets(orderId) {
  const db = await getDatabase();
  const order = db.queryOne("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  if (!order) return null;

  const items = db.query("SELECT * FROM order_items WHERE order_code = ?", [orderId]);
  const productsSummary = items.map(it => `${it.product_name} (x${it.quantity})`).join('; ');
  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);

  return {
    order_id: order.order_id,
    order_date: order.created_at,
    customer_name: order.customer_name,
    phone: order.customer_phone,
    email: order.customer_email,
    house_number: order.house_no,
    street: order.street,
    area: order.area,
    city: order.city,
    district: order.district,
    state: order.state,
    pin_code: order.pincode,
    landmark: order.landmark || '',
    products: productsSummary,
    quantity: totalQuantity,
    subtotal: order.subtotal,
    discount: order.discount_total || 0,
    total_amount: order.total_amount,
    payment_id: order.payment_id || '',
    payment_method: order.payment_method || 'UPI',
    payment_status: order.payment_status,
    order_status: order.order_status,
    tracking_number: order.tracking_number || '',
    delivery_otp: order.delivery_otp || '',
    created_at: order.created_at,
    updated_at: order.updated_at,
    row_values: [
      order.order_id,
      order.created_at,
      order.customer_name,
      order.customer_phone,
      order.customer_email,
      order.house_no,
      order.street,
      order.area,
      order.city,
      order.district,
      order.state,
      order.pincode,
      order.landmark || '',
      productsSummary,
      totalQuantity,
      order.subtotal,
      order.discount_total || 0,
      order.total_amount,
      order.payment_id || '',
      order.payment_method || 'UPI',
      order.payment_status,
      order.order_status,
      order.tracking_number || '',
      order.created_at,
      order.updated_at
    ]
  };
}

async function enqueueOrderSync(orderId, action = 'INSERT') {
  const db = await getDatabase();
  
  // Check if there is an existing pending sync for this order
  const existing = db.queryOne(
    "SELECT id FROM sheets_sync_queue WHERE order_code = ? AND status = 'PENDING'",
    [orderId]
  );

  if (existing) {
    db.run(
      "UPDATE sheets_sync_queue SET action = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [action, existing.id]
    );
  } else {
    db.run(
      "INSERT INTO sheets_sync_queue (order_code, action, status) VALUES (?, ?, 'PENDING')",
      [orderId, action]
    );
  }

  // Attempt async sync without blocking request
  setImmediate(() => {
    processSyncQueue().catch(err => {
      console.error('[GOOGLE SHEETS] Background sync error:', err.message);
    });
  });
}

async function processSyncQueue() {
  const db = await getDatabase();
  const pending = db.query("SELECT * FROM sheets_sync_queue WHERE status = 'PENDING' ORDER BY id ASC LIMIT 10");
  if (!pending || pending.length === 0) return { processed: 0 };

  const sheetsUrlSetting = db.queryOne("SELECT value FROM settings WHERE key = 'google_sheets_url'");
  const sheetsEnabled = db.queryOne("SELECT value FROM settings WHERE key = 'google_sheets_enabled'");

  for (const item of pending) {
    const formatted = await formatOrderForSheets(item.order_code);
    if (!formatted) {
      db.run("UPDATE sheets_sync_queue SET status = 'FAILED', error_message = 'Order not found' WHERE id = ?", [item.id]);
      continue;
    }

    if (!sheetsEnabled || sheetsEnabled.value !== 'true' || !sheetsUrlSetting || !sheetsUrlSetting.value) {
      // Marked as pending integration URL configuration
      db.run(
        "UPDATE sheets_sync_queue SET error_message = 'Google Sheets Webhook URL not configured yet. Ready for sync once URL is saved in Settings.', last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?",
        [item.id]
      );
      continue;
    }

    try {
      // Dispatch payload to Google Sheets Apps Script Webhook
      const payload = {
        action: item.action, // INSERT or UPDATE
        order_id: item.order_code,
        headers: SHEET_HEADERS,
        data: formatted.row_values,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(sheetsUrlSetting.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        db.run(
          "UPDATE sheets_sync_queue SET status = 'SUCCESS', error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [item.id]
        );
        console.log(`[GOOGLE SHEETS SUCCESS] Synced ${item.action} for order ${item.order_code}`);
      } else {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (err) {
      console.error(`[GOOGLE SHEETS SYNC FAILED] Order ${item.order_code}:`, err.message);
      db.run(
        "UPDATE sheets_sync_queue SET retry_count = retry_count + 1, error_message = ?, last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?",
        [err.message, item.id]
      );
    }
  }

  return { processed: pending.length };
}

async function exportOrdersToCSV() {
  const db = await getDatabase();
  const orders = db.query("SELECT * FROM orders ORDER BY id DESC");
  
  let csv = SHEET_HEADERS.map(h => `"${h}"`).join(',') + '\n';

  for (const ord of orders) {
    const formatted = await formatOrderForSheets(ord.order_id);
    if (formatted) {
      const row = formatted.row_values.map(val => {
        const str = String(val == null ? '' : val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
      csv += row + '\n';
    }
  }

  return csv;
}

module.exports = {
  SHEET_HEADERS,
  formatOrderForSheets,
  enqueueOrderSync,
  processSyncQueue,
  exportOrdersToCSV
};
