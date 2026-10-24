require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./database/init');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');

const { verifySmtpConnection } = require('./services/emailDeliveryService');
const { verifySmsProvider } = require('./services/smsDeliveryService');
const { startNotificationQueueWorker } = require('./services/notificationQueue');
const { getNotificationConfig } = require('./services/notificationConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    shop: 'Giggle & Bloom Kids Gift Shop API',
    time: new Date().toISOString()
  });
});

// Serve frontend build if client/dist exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDb();

    console.log('\n================ STARTUP DIAGNOSTICS ================');
    console.log('Database:         ✅ SQLite Connected');

    // Run non-blocking SMTP & SMS verification
    const [smtpRes, smsRes, config] = await Promise.all([
      verifySmtpConnection().catch(e => ({ configured: false, connected: false, message: e.message })),
      verifySmsProvider().catch(e => ({ configured: false, connected: false, message: e.message })),
      getNotificationConfig()
    ]);

    if (smtpRes.connected) {
      console.log(`SMTP:             ✅ Connected (${smtpRes.host}:${smtpRes.port} - ${smtpRes.user})`);
    } else if (smtpRes.configured) {
      console.log(`SMTP:             ❌ Connection Failed (${smtpRes.message})`);
    } else {
      console.log(`SMTP:             ❌ Not Configured (Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)`);
    }

    if (smsRes.connected) {
      console.log(`SMS Provider:     ✅ Connected (${smsRes.provider.toUpperCase()})`);
    } else if (smsRes.configured) {
      console.log(`SMS Provider:     ❌ Connection Failed (${smsRes.message})`);
    } else {
      console.log(`SMS Provider:     ❌ Not Configured (Set SMS_API_KEY in .env or settings)`);
    }

    console.log(`Google Sheets:    ${config.googleSheets.isConfigured ? '✅ Webhook Configured' : '⚠️ Not Configured (Queueing locally for CSV export)'}`);
    console.log(`Payment Gateway:  ✅ UPI Merchant Active (${process.env.MERCHANT_UPI_ID || 'prazilss4@oksbi'})`);
    console.log('=====================================================\n');

    // Start background retry worker
    startNotificationQueueWorker();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`✨ Giggle & Bloom Kids Gift Shop Server Running! ✨`);
      console.log(`📡 API Base URL:       http://localhost:${PORT}/api`);
      console.log(`🛒 Storefront:         http://localhost:${PORT}/`);
      console.log(`🔐 Admin Panel:        http://localhost:${PORT}/admin`);
      console.log(`🎁 Merchant UPI:       ${process.env.MERCHANT_UPI_ID || 'prazilss4@oksbi'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
