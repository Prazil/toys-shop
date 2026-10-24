const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');

// Setup upload directory
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'gift-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPEG, PNG, WEBP, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function generateProductId(db) {
  const countRow = db.queryOne("SELECT COUNT(*) as count FROM products");
  const nextNum = (countRow.count || 0) + 1;
  return `PROD-${String(nextNum).padStart(4, '0')}`;
}

// ==========================================
// CUSTOMER PRODUCT ENDPOINTS
// ==========================================

// GET /api/products (Customer Storefront)
// RULE: ONLY products uploaded by Admin, active, visible, not archived!
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const {
      search,
      category,
      minPrice,
      maxPrice,
      availability,
      sort,
      featured,
      newArrival,
      bestseller,
      limit = 50,
      page = 1
    } = req.query;

    let conditions = ["status != 'Archived'", "is_visible = 1"];
    let params = [];

    // Search query
    if (search && search.trim()) {
      conditions.push("(name LIKE ? OR description LIKE ? OR category_name LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Category filter
    if (category && category !== 'all') {
      conditions.push("(category_id = ? OR category_name = ?)");
      params.push(category, category);
    }

    // Price range
    if (minPrice && !isNaN(minPrice)) {
      conditions.push("price >= ?");
      params.push(parseFloat(minPrice));
    }
    if (maxPrice && !isNaN(maxPrice)) {
      conditions.push("price <= ?");
      params.push(parseFloat(maxPrice));
    }

    // Availability filter
    if (availability === 'available') {
      conditions.push("status = 'Available' AND stock_quantity > 0");
    } else if (availability === 'sold_out') {
      conditions.push("(status = 'Sold Out' OR stock_quantity <= 0)");
    }

    // Flags
    if (featured === 'true') {
      conditions.push("is_featured = 1");
    }
    if (newArrival === 'true') {
      conditions.push("is_new_arrival = 1");
    }
    if (bestseller === 'true') {
      conditions.push("is_bestseller = 1");
    }

    let whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Sorting
    let orderBy = "ORDER BY created_at DESC";
    if (sort === 'price_low_high') {
      orderBy = "ORDER BY (CASE WHEN discount_price > 0 THEN discount_price ELSE price END) ASC";
    } else if (sort === 'price_high_low') {
      orderBy = "ORDER BY (CASE WHEN discount_price > 0 THEN discount_price ELSE price END) DESC";
    } else if (sort === 'newest') {
      orderBy = "ORDER BY created_at DESC";
    } else if (sort === 'bestseller') {
      orderBy = "ORDER BY is_bestseller DESC, created_at DESC";
    } else if (sort === 'featured') {
      orderBy = "ORDER BY is_featured DESC, created_at DESC";
    }

    const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const totalCount = db.queryOne(countSql, params).total;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const sql = `SELECT * FROM products ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
    const queryParams = [...params, parseInt(limit, 10), offset];

    const products = db.query(sql, queryParams);

    // Calculate discount percentages and enrich
    const enriched = products.map(p => {
      let discountPercent = 0;
      if (p.discount_price && p.discount_price < p.price) {
        discountPercent = Math.round(((p.price - p.discount_price) / p.price) * 100);
      }
      return {
        ...p,
        discount_percentage: discountPercent,
        is_in_stock: p.status === 'Available' && p.stock_quantity > 0
      };
    });

    return res.json({
      success: true,
      products: enriched,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Error fetching customer products:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id (Customer Product Details)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Query by id, slug, or product_id
    const product = db.queryOne(
      "SELECT * FROM products WHERE (id = ? OR slug = ? OR product_id = ?) AND status != 'Archived' AND is_visible = 1",
      [id, id, id]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or currently unavailable.' });
    }

    const images = db.query("SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC", [product.id]);

    let discountPercent = 0;
    if (product.discount_price && product.discount_price < product.price) {
      discountPercent = Math.round(((product.price - product.discount_price) / product.price) * 100);
    }

    return res.json({
      success: true,
      product: {
        ...product,
        images: images.length > 0 ? images.map(img => img.image_url) : [product.main_image],
        discount_percentage: discountPercent,
        is_in_stock: product.status === 'Available' && product.stock_quantity > 0
      }
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    return res.status(500).json({ success: false, message: 'Failed to load product.' });
  }
});

// ==========================================
// ADMIN PRODUCT ENDPOINTS (PROTECTED)
// ==========================================

// GET /api/admin/products (Admin Product List)
router.get('/admin/list', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, search, category } = req.query;

    let conditions = [];
    let params = [];

    if (status && status !== 'all') {
      conditions.push("status = ?");
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push("(name LIKE ? OR sku LIKE ? OR product_id LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (category && category !== 'all') {
      conditions.push("category_id = ?");
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const sql = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC`;
    const products = db.query(sql, params);

    const enriched = products.map(p => {
      let discountPercent = 0;
      if (p.discount_price && p.discount_price < p.price) {
        discountPercent = Math.round(((p.price - p.discount_price) / p.price) * 100);
      }
      return {
        ...p,
        discount_percentage: discountPercent
      };
    });

    return res.json({ success: true, products: enriched });
  } catch (err) {
    console.error('Error fetching admin products:', err);
    return res.status(500).json({ success: false, message: 'Failed to load admin products.' });
  }
});

// POST /api/admin/products (Add Product)
router.post('/admin', adminAuthMiddleware, upload.array('images', 8), async (req, res) => {
  try {
    const db = await getDatabase();
    const {
      name,
      price,
      discount_price,
      category_id,
      stock_quantity,
      description,
      status = 'Available',
      is_visible = '1',
      is_featured = '0',
      is_new_arrival = '0',
      is_bestseller = '0',
      sku,
      existing_images
    } = req.body;

    // VALIDATION OF REQUIRED FIELDS
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product Name is required.' });
    }
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid Price is required.' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }
    if (stock_quantity === undefined || stock_quantity === null || isNaN(stock_quantity) || parseInt(stock_quantity, 10) < 0) {
      return res.status(400).json({ success: false, message: 'Stock Quantity is required and must be 0 or more.' });
    }

    // Check images
    let uploadedImageUrls = [];
    if (req.files && req.files.length > 0) {
      uploadedImageUrls = req.files.map(f => `/uploads/products/${f.filename}`);
    }
    if (existing_images) {
      const parsed = Array.isArray(existing_images) ? existing_images : [existing_images];
      uploadedImageUrls = [...parsed, ...uploadedImageUrls];
    }

    if (uploadedImageUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one Product Image is required.' });
    }

    const mainImage = uploadedImageUrls[0];
    const category = db.queryOne("SELECT * FROM categories WHERE id = ?", [category_id]);
    const categoryName = category ? category.name : 'Kids Gifts';

    const productId = generateProductId(db);
    const slug = slugify(name) + '-' + Math.floor(1000 + Math.random() * 9000);
    const parsedPrice = parseFloat(price);
    const parsedDiscount = discount_price && !isNaN(discount_price) ? parseFloat(discount_price) : null;
    const parsedStock = parseInt(stock_quantity, 10);

    // Save product
    const result = db.run(
      `INSERT INTO products (
        product_id, name, slug, price, discount_price, description,
        category_id, category_name, stock_quantity, sku, status,
        is_visible, is_featured, is_new_arrival, is_bestseller, main_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        name.trim(),
        slug,
        parsedPrice,
        parsedDiscount,
        description || '',
        category_id,
        categoryName,
        parsedStock,
        sku || productId,
        parsedStock <= 0 ? 'Sold Out' : status,
        is_visible === '1' || is_visible === true || is_visible === 1 ? 1 : 0,
        is_featured === '1' || is_featured === true || is_featured === 1 ? 1 : 0,
        is_new_arrival === '1' || is_new_arrival === true || is_new_arrival === 1 ? 1 : 0,
        is_bestseller === '1' || is_bestseller === true || is_bestseller === 1 ? 1 : 0,
        mainImage
      ]
    );

    const newDbId = result.lastInsertRowid;

    // Save product gallery images
    uploadedImageUrls.forEach((imgUrl, idx) => {
      db.run(
        "INSERT INTO product_images (product_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)",
        [newDbId, imgUrl, idx === 0 ? 1 : 0, idx]
      );
    });

    const saved = db.queryOne("SELECT * FROM products WHERE id = ?", [newDbId]);

    console.log(`[PRODUCT CREATED] ID: ${productId} | Name: "${name}" | Price: ₹${price} | Stock: ${stock_quantity}`);

    return res.status(201).json({
      success: true,
      message: 'Product added successfully!',
      product: saved
    });
  } catch (err) {
    console.error('Error adding product:', err);
    return res.status(500).json({ success: false, message: 'Failed to add product: ' + err.message });
  }
});

// PUT /api/admin/products/:id (Edit Product)
router.put('/admin/:id', adminAuthMiddleware, upload.array('images', 8), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const {
      name,
      price,
      discount_price,
      category_id,
      stock_quantity,
      description,
      status,
      is_visible,
      is_featured,
      is_new_arrival,
      is_bestseller,
      sku,
      existing_images
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product Name is required.' });
    }
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid Price is required.' });
    }

    let allImages = [];
    if (existing_images) {
      const parsed = Array.isArray(existing_images) ? existing_images : [existing_images];
      allImages = [...parsed];
    }
    if (req.files && req.files.length > 0) {
      const newUrls = req.files.map(f => `/uploads/products/${f.filename}`);
      allImages = [...allImages, ...newUrls];
    }

    if (allImages.length === 0) {
      allImages = [existing.main_image];
    }

    const mainImage = allImages[0];
    const category = db.queryOne("SELECT * FROM categories WHERE id = ?", [category_id || existing.category_id]);
    const categoryName = category ? category.name : existing.category_name;
    const parsedStock = parseInt(stock_quantity !== undefined ? stock_quantity : existing.stock_quantity, 10);
    const parsedStatus = parsedStock <= 0 && status === 'Available' ? 'Sold Out' : (status || existing.status);

    db.run(
      `UPDATE products SET
        name = ?, price = ?, discount_price = ?, description = ?,
        category_id = ?, category_name = ?, stock_quantity = ?, sku = ?,
        status = ?, is_visible = ?, is_featured = ?, is_new_arrival = ?,
        is_bestseller = ?, main_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        name.trim(),
        parseFloat(price),
        discount_price && !isNaN(discount_price) ? parseFloat(discount_price) : null,
        description || '',
        category ? category.id : existing.category_id,
        categoryName,
        parsedStock,
        sku || existing.sku,
        parsedStatus,
        is_visible === '1' || is_visible === true || is_visible === 1 ? 1 : 0,
        is_featured === '1' || is_featured === true || is_featured === 1 ? 1 : 0,
        is_new_arrival === '1' || is_new_arrival === true || is_new_arrival === 1 ? 1 : 0,
        is_bestseller === '1' || is_bestseller === true || is_bestseller === 1 ? 1 : 0,
        mainImage,
        id
      ]
    );

    // Refresh images in product_images table
    db.run("DELETE FROM product_images WHERE product_id = ?", [id]);
    allImages.forEach((imgUrl, idx) => {
      db.run(
        "INSERT INTO product_images (product_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)",
        [id, imgUrl, idx === 0 ? 1 : 0, idx]
      );
    });

    const updated = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (err) {
    console.error('Error editing product:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// PATCH /api/admin/products/:id/quick-update (Fast inline actions)
router.patch('/admin/:id/quick-update', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, discount_price, stock_quantity, status, is_visible } = req.body;
    const db = await getDatabase();

    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let updates = [];
    let params = [];

    if (price !== undefined && !isNaN(price)) {
      updates.push("price = ?");
      params.push(parseFloat(price));
    }
    if (discount_price !== undefined) {
      updates.push("discount_price = ?");
      params.push(discount_price ? parseFloat(discount_price) : null);
    }
    if (stock_quantity !== undefined && !isNaN(stock_quantity)) {
      const parsedStock = parseInt(stock_quantity, 10);
      updates.push("stock_quantity = ?");
      params.push(parsedStock);
      // Auto toggle Sold Out if 0
      if (parsedStock <= 0 && existing.status === 'Available') {
        updates.push("status = 'Sold Out'");
      } else if (parsedStock > 0 && existing.status === 'Sold Out') {
        updates.push("status = 'Available'");
      }
    }
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }
    if (is_visible !== undefined) {
      updates.push("is_visible = ?");
      params.push(is_visible ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    db.run(sql, params);

    const updated = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (err) {
    console.error('Error quick-updating product:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// POST /api/admin/products/:id/archive (Archive Product)
router.post('/admin/:id/archive', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    db.run(
      "UPDATE products SET status = 'Archived', is_visible = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    return res.json({
      success: true,
      message: `Product "${existing.name}" archived. It is no longer visible on the store.`
    });
  } catch (err) {
    console.error('Error archiving product:', err);
    return res.status(500).json({ success: false, message: 'Failed to archive product.' });
  }
});

// POST /api/admin/products/:id/restore (Restore Product)
router.post('/admin/:id/restore', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const existing = db.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const newStatus = existing.stock_quantity > 0 ? 'Available' : 'Sold Out';
    db.run(
      "UPDATE products SET status = ?, is_visible = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, id]
    );

    return res.json({
      success: true,
      message: `Product "${existing.name}" restored successfully and is now active.`
    });
  } catch (err) {
    console.error('Error restoring product:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore product.' });
  }
});

module.exports = router;
