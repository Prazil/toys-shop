const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');
const { exportOrdersToCSV, processSyncQueue } = require('../services/googleSheets');
const { sendOrderNotificationEmail } = require('../services/emailService');
const { sendOrderNotificationSMS } = require('../services/smsService');

// GET /api/settings/public (Customer store branding)
router.get('/public', async (req, res) => {
  try {
    const db = await getDatabase();
    const rows = db.query("SELECT key, value FROM settings");
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    return res.json({
      success: true,
      shop: {
        shop_name: settings.shop_name || 'Giggle & Bloom Kids Gift Shop',
        shop_tagline: settings.shop_tagline || 'Little Gifts, Big Smiles!',
        shop_subtitle: settings.shop_subtitle || 'Discover cute, fun and memorable gifts for every special moment.',
        shop_email: settings.shop_email || 'hello@giggleandbloom.com',
        shop_phone: settings.shop_phone || '+91 98765 43210',
        shop_address: settings.shop_address || '108 Rainbow Valley, Bangalore, Karnataka - 560001',
        upi_merchant_id: settings.upi_merchant_id || 'prazilss4@oksbi',
        shipping_fee: parseFloat(settings.shipping_fee || '0'),
        free_shipping_threshold: parseFloat(settings.free_shipping_threshold || '499'),
        currency_symbol: settings.currency_symbol || '₹',
        currency: settings.currency || 'INR'
      }
    });
  } catch (err) {
    console.error('Error fetching public settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

// GET /api/admin/settings (Admin all settings)
router.get('/admin', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const rows = db.query("SELECT key, value FROM settings");
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    // Sync queue health
    const pendingSyncCount = db.queryOne("SELECT COUNT(*) as cnt FROM sheets_sync_queue WHERE status = 'PENDING'").cnt || 0;
    const failedSyncCount = db.queryOne("SELECT COUNT(*) as cnt FROM sheets_sync_queue WHERE status = 'FAILED'").cnt || 0;
    const successSyncCount = db.queryOne("SELECT COUNT(*) as cnt FROM sheets_sync_queue WHERE status = 'SUCCESS'").cnt || 0;
    const latestSync = db.queryOne("SELECT * FROM sheets_sync_queue ORDER BY id DESC LIMIT 1");

    return res.json({
      success: true,
      settings,
      google_sheets_health: {
        pending: pendingSyncCount,
        failed: failedSyncCount,
        success: successSyncCount,
        latest: latestSync
      }
    });
  } catch (err) {
    console.error('Error fetching admin settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load settings.' });
  }
});

// POST /api/admin/settings (Update settings)
router.post('/admin', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const updates = req.body;

    for (const [key, val] of Object.entries(updates)) {
      const stringVal = String(val == null ? '' : val);
      const exists = db.queryOne("SELECT key FROM settings WHERE key = ?", [key]);
      if (exists) {
        db.run("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?", [stringVal, key]);
      } else {
        db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, stringVal]);
      }
    }

    return res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
});

// GET /api/admin/settings/export-csv (Download Google Sheets CSV)
router.get('/admin/export-csv', adminAuthMiddleware, async (req, res) => {
  try {
    const csv = await exportOrdersToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=kids_gift_shop_orders_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    return res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
});

// POST /api/admin/settings/sync-sheets-now (Trigger queue sync)
router.post('/admin/sync-sheets-now', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await processSyncQueue();
    return res.json({
      success: true,
      message: `Sync process completed. Processed ${result.processed} pending items.`
    });
  } catch (err) {
    console.error('Error during manual sync:', err);
    return res.status(500).json({ success: false, message: 'Sync failed: ' + err.message });
  }
});

// GET /api/admin/settings/notifications (Audit log of all sent Emails & SMS)
router.get('/admin/notifications', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const notifications = db.query("SELECT * FROM notifications ORDER BY id DESC LIMIT 50");
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

module.exports = router;
