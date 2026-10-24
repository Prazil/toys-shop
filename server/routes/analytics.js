const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');

// GET /api/admin/analytics (Secondary tab)
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();

    // Order metrics
    const totalOrders = db.queryOne("SELECT COUNT(*) as count FROM orders").count || 0;
    const totalSalesRow = db.queryOne(
      "SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'Verified' AND order_status != 'Cancelled'"
    );
    const totalSales = totalSalesRow ? (totalSalesRow.total || 0) : 0;

    const pendingPayments = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'Pending'").count || 0;
    const newOrders = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('Payment Verified', 'Order Accepted')").count || 0;
    const processingOrders = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('Processing', 'Packed')").count || 0;
    const shippedOrders = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('Shipped', 'Out for Delivery')").count || 0;
    const deliveredOrders = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE order_status = 'Delivered'").count || 0;
    const cancelledOrders = db.queryOne("SELECT COUNT(*) as count FROM orders WHERE order_status = 'Cancelled'").count || 0;

    // Product metrics
    const totalProducts = db.queryOne("SELECT COUNT(*) as count FROM products WHERE status != 'Archived'").count || 0;
    const availableProducts = db.queryOne("SELECT COUNT(*) as count FROM products WHERE status = 'Available' AND stock_quantity > 0").count || 0;
    const soldOutProducts = db.queryOne("SELECT COUNT(*) as count FROM products WHERE (status = 'Sold Out' OR stock_quantity <= 0) AND status != 'Archived'").count || 0;
    const archivedProducts = db.queryOne("SELECT COUNT(*) as count FROM products WHERE status = 'Archived'").count || 0;

    // Recent orders
    const recentOrders = db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5");

    // Category breakdown
    const categoryBreakdown = db.query(
      `SELECT c.name, COUNT(p.id) as product_count 
       FROM categories c 
       LEFT JOIN products p ON p.category_id = c.id AND p.status != 'Archived'
       GROUP BY c.id ORDER BY product_count DESC`
    );

    return res.json({
      success: true,
      analytics: {
        totalOrders,
        totalSales: Math.round(totalSales * 100) / 100,
        pendingPayments,
        newOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalProducts,
        availableProducts,
        soldOutProducts,
        archivedProducts,
        recentOrders,
        categoryBreakdown
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate analytics.' });
  }
});

module.exports = router;
