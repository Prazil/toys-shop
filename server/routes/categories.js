const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');
const { adminAuthMiddleware } = require('../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET /api/categories (Customer & Admin)
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const includeHidden = req.query.includeHidden === 'true';

    let sql = "SELECT * FROM categories";
    if (!includeHidden) {
      sql += " WHERE is_hidden = 0";
    }
    sql += " ORDER BY name ASC";

    const categories = db.query(sql);

    // Count products per category
    const counts = db.query(
      "SELECT category_id, COUNT(*) as cnt FROM products WHERE status != 'Archived' AND is_visible = 1 GROUP BY category_id"
    );
    const countMap = {};
    counts.forEach(c => { countMap[c.category_id] = c.cnt; });

    const enriched = categories.map(cat => ({
      ...cat,
      product_count: countMap[cat.id] || 0
    }));

    return res.json({ success: true, categories: enriched });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// POST /api/categories (Admin)
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const db = await getDatabase();
    const slug = slugify(name);

    const exists = db.queryOne("SELECT id FROM categories WHERE slug = ? OR name = ?", [slug, name.trim()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists.' });
    }

    const result = db.run(
      "INSERT INTO categories (name, slug, description, icon, is_hidden) VALUES (?, ?, ?, ?, 0)",
      [name.trim(), slug, description || '', icon || 'Gift']
    );

    const newCategory = db.queryOne("SELECT * FROM categories WHERE id = ?", [result.lastInsertRowid]);
    return res.status(201).json({ success: true, message: 'Category created successfully!', category: newCategory });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id (Admin)
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const db = await getDatabase();
    const slug = slugify(name);

    db.run(
      "UPDATE categories SET name = ?, slug = ?, description = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name.trim(), slug, description || '', icon || 'Gift', id]
    );

    // Also update category_name in products table
    db.run("UPDATE products SET category_name = ? WHERE category_id = ?", [name.trim(), id]);

    const updated = db.queryOne("SELECT * FROM categories WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Category updated successfully!', category: updated });
  } catch (err) {
    console.error('Error updating category:', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// PATCH /api/categories/:id/toggle-hide (Admin)
router.patch('/:id/toggle-hide', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const category = db.queryOne("SELECT * FROM categories WHERE id = ?", [id]);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const newHidden = category.is_hidden ? 0 : 1;
    db.run("UPDATE categories SET is_hidden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newHidden, id]);

    return res.json({
      success: true,
      message: newHidden ? 'Category hidden from store.' : 'Category now visible in store.',
      is_hidden: newHidden
    });
  } catch (err) {
    console.error('Error toggling category visibility:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle category.' });
  }
});

// DELETE /api/categories/:id (Admin)
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Check if products exist in category
    const productCount = db.queryOne("SELECT COUNT(*) as cnt FROM products WHERE category_id = ? AND status != 'Archived'", [id]).cnt;
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${productCount} active product(s) are assigned to it. Please reassign or archive those products first.`
      });
    }

    db.run("DELETE FROM categories WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

module.exports = router;
