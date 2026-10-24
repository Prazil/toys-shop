const { getDatabase } = require('./server/database/db');
const { initDb } = require('./server/database/init');

async function testDatabase() {
  console.log('Testing Giggle & Bloom Gift Shop SQLite Database Connection...');
  try {
    // 1. Initialize schema and get database instance
    const db = await initDb();
    console.log('✅ Database initialized successfully.');

    // 2. Query Tables
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log('Active Database Tables:', tables.map(t => t.name).join(', '));

    // 3. Check Product Count
    const products = db.query("SELECT COUNT(*) as count FROM products");
    console.log(`Current Published Products: ${products[0].count}`);

    // 4. Check Orders Count
    const orders = db.query("SELECT COUNT(*) as count FROM orders");
    console.log(`Total Orders Recorded: ${orders[0].count}`);

    // 5. Check Notifications Table
    const notifs = db.query("SELECT COUNT(*) as count FROM notifications");
    console.log(`Notification Logs Recorded: ${notifs[0].count}`);

    console.log('✅ Database check completed with 0 errors.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database test failed:', err);
    process.exit(1);
  }
}

testDatabase();
