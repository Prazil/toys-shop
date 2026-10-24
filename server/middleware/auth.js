const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'kids_gift_shop_super_secret_jwt_key_2026';

async function adminAuthMiddleware(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      // Check cookie
      const match = req.headers.cookie.match(/admin_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in as admin.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDatabase();
    const admin = db.queryOne("SELECT id, username, email, role, name FROM admins WHERE id = ?", [decoded.id]);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found or invalid token.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { adminAuthMiddleware, JWT_SECRET };
