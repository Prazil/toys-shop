const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('./db');

const DEFAULT_CATEGORIES = [
  { name: 'Toys', slug: 'toys', icon: 'Gamepad2', description: 'Fun, active and engaging toys for children of all ages' },
  { name: 'Soft Toys', slug: 'soft-toys', icon: 'Heart', description: 'Ultra-cuddly plushies, teddy bears, and comforting companions' },
  { name: 'Birthday Gifts', slug: 'birthday-gifts', icon: 'Cake', description: 'Exciting and memorable gifts to celebrate wonderful birthdays' },
  { name: 'Kids Gifts', slug: 'kids-gifts', icon: 'Gift', description: 'Curated joyful gifts handpicked to spark delight' },
  { name: 'Educational Gifts', slug: 'educational-gifts', icon: 'BookOpen', description: 'STEM puzzles, building kits, and creative learning toys' },
  { name: 'Return Gifts', slug: 'return-gifts', icon: 'PartyPopper', description: 'Delightful bulk return gift hampers for kids parties' },
  { name: 'Stationery', slug: 'stationery', icon: 'Palette', description: 'Vibrant coloring sets, cute pencil cases, and craft kits' },
  { name: 'Personalized Gifts', slug: 'personalized-gifts', icon: 'Sparkles', description: 'Custom printed keepsakes, engraved name toys, and hampers' },
  { name: 'Accessories', slug: 'accessories', icon: 'Smile', description: 'Cute bags, watches, water bottles, and kid accessories' },
  { name: 'Other', slug: 'other', icon: 'Package', description: 'Specialty festive surprises and seasonal wonders' }
];

const DEFAULT_SETTINGS = {
  shop_name: 'Giggle & Bloom Kids Gift Shop',
  shop_tagline: 'Little Gifts, Big Smiles!',
  shop_subtitle: 'Discover cute, fun and memorable gifts for every special moment.',
  shop_email: 'hello@giggleandbloom.com',
  shop_phone: '+91 98765 43210',
  shop_address: '108 Rainbow Valley, Wonderpark, Bangalore, Karnataka - 560001',
  upi_merchant_id: 'prazilss4@oksbi',
  upi_merchant_name: 'Kids Gift Shop',
  shipping_fee: '0',
  free_shipping_threshold: '499',
  currency: 'INR',
  currency_symbol: '₹',
  google_sheets_enabled: 'false',
  google_sheets_url: '',
  google_sheets_webhook_url: '',
  google_sheets_id: '',
  // Nodemailer SMTP
  smtp_host: 'smtp.gmail.com',
  smtp_port: '587',
  smtp_secure: 'false',
  smtp_user: '',
  smtp_password: '',
  smtp_from_name: 'Giggle & Bloom Kids Gift Shop',
  smtp_from_email: 'orders@giggleandbloom.com',
  // Backward compatibility alias keys
  email_smtp_enabled: 'false',
  email_smtp_host: 'smtp.gmail.com',
  email_smtp_port: '587',
  email_smtp_user: '',
  email_smtp_pass: '',
  email_from_name: 'Giggle & Bloom Kids Gift Shop',
  email_from_address: 'orders@giggleandbloom.com',
  // SMS Gateway
  sms_provider: 'fast2sms',
  sms_api_key: '',
  sms_api_secret: '',
  sms_sender_id: 'KIDGFT',
  sms_template_id: '',
  sms_base_url: 'https://www.fast2sms.com/dev/bulkV2',
  sms_enabled: 'false',
  // Payments
  payment_provider: 'UPI',
  payment_key: '',
  payment_secret: '',
  razorpay_enabled: 'false',
  razorpay_key_id: '',
  razorpay_key_secret: '',
  payment_mode: 'upi_direct'
};

async function initDb() {
  const db = await getDatabase();
  console.log('Initializing database schema...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Schema migration for notifications table
  try {
    const tableInfo = db.query("PRAGMA table_info(notifications)");
    const colNames = tableInfo.map(c => c.name);
    if (!colNames.includes('idempotency_key') || !colNames.includes('channel')) {
      console.log('[MIGRATION] Upgrading notifications table to production schema with idempotency and channels...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_code TEXT,
          channel TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          idempotency_key TEXT UNIQUE,
          recipient TEXT NOT NULL,
          recipient_masked TEXT,
          subject TEXT,
          message_body TEXT,
          html_body TEXT,
          status TEXT NOT NULL DEFAULT 'QUEUED',
          provider TEXT,
          provider_message_id TEXT,
          attempt_count INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          last_attempt_at DATETIME,
          error_code TEXT,
          error_message TEXT,
          raw_response TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      if (colNames.length > 0) {
        const oldRows = db.query("SELECT * FROM notifications");
        for (const row of oldRows) {
          const channel = row.type || 'EMAIL';
          const notifType = row.subject ? (row.subject.includes(':') ? row.subject.split(':')[1].trim() : 'Order Update') : 'Order Update';
          const idKey = `${row.order_code || 'ORD'}:${notifType}:${channel}:${row.id}`;
          db.run(`
            INSERT OR IGNORE INTO notifications_new (
              id, order_code, channel, notification_type, idempotency_key, recipient, recipient_masked,
              subject, message_body, html_body, status, provider, raw_response, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            row.id,
            row.order_code,
            channel,
            notifType,
            idKey,
            row.recipient,
            row.recipient,
            row.subject,
            row.message,
            channel === 'EMAIL' ? row.message : null,
            row.status || 'SENT',
            row.provider || 'SYSTEM',
            row.response,
            row.created_at || new Date().toISOString()
          ]);
        }
        db.exec("DROP TABLE notifications");
      }
      db.exec("ALTER TABLE notifications_new RENAME TO notifications");
      console.log('[MIGRATION] Notifications table successfully upgraded!');
    }

    // Ensure helpful indexes exist
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_notifications_order_code ON notifications(order_code);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    `);
  } catch (migErr) {
    console.error('Migration error on notifications table:', migErr.message);
  }

  // Check and seed default admin
  const adminExists = db.queryOne("SELECT id FROM admins WHERE username = ?", ['admin']);
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(
      "INSERT INTO admins (username, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
      ['admin', 'admin@kidsgiftshop.com', hash, 'super_admin', 'Shop Administrator']
    );
    console.log('Default admin created (Username: admin, Password: admin123, Email: admin@kidsgiftshop.com)');
  }

  // Check and seed default categories
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = db.queryOne("SELECT id FROM categories WHERE slug = ?", [cat.slug]);
    if (!exists) {
      db.run(
        "INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)",
        [cat.name, cat.slug, cat.description, cat.icon]
      );
    }
  }
  console.log('Categories initialized (10 default categories ready)');

  // Check and seed default settings
  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = db.queryOne("SELECT key FROM settings WHERE key = ?", [key]);
    if (!exists) {
      db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, val]);
    }
  }
  console.log('Store settings initialized (UPI: prazilss4@oksbi)');

  // Ensure products table is verified
  const productCount = db.queryOne("SELECT COUNT(*) as cnt FROM products").cnt;
  console.log(`Database initialized successfully. Current products in DB: ${productCount}`);
  if (productCount === 0) {
    console.log('Note: Products table is 0 as required. Customer storefront will show: "No gifts available right now. Check back soon!" until admin adds products.');
  }

  return db;
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('Database init script completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database init script failed:', err);
      process.exit(1);
    });
}

module.exports = { initDb };
