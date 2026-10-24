import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, Tag, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Gift');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories?includeHidden=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIcon('Gift');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Gift');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), description, icon })
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        showNotification(editingCategory ? 'Category updated!' : 'Category created!');
        fetchCategories();
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (err) {
      alert('Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHide = async (cat) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}/toggle-hide`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Category deleted successfully.');
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '4px' }}>Categories</h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Manage store categories, customize descriptions, and control visibility.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} />
          <span>+ Add Category</span>
        </button>
      </div>

      {notification && (
        <div style={{ backgroundColor: '#E6FAF4', color: '#038A65', border: '1px solid #A7F3D0', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontWeight: '700' }}>
          {notification.msg}
        </div>
      )}

      {/* Categories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {categories.map(cat => (
          <div key={cat.id} style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className={`badge ${cat.is_hidden === 1 ? 'badge-soldout' : 'badge-new'}`}>
                  {cat.is_hidden === 1 ? 'Hidden' : 'Visible'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>
                  {cat.product_count} Product{cat.product_count === 1 ? '' : 's'}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', color: '#1E293B', marginBottom: '8px' }}>
                {cat.name}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', minHeight: '40px' }}>
                {cat.description || 'No description added yet.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: '16px' }}>
              <button
                onClick={() => handleToggleHide(cat)}
                style={{ fontSize: '12px', fontWeight: '700', color: cat.is_hidden === 1 ? '#038A65' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {cat.is_hidden === 1 ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{cat.is_hidden === 1 ? 'Show in Store' : 'Hide from Store'}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleOpenEdit(cat)} style={{ padding: '6px', color: '#3B82F6' }} title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(cat)} style={{ padding: '6px', color: '#EF4444' }} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '440px', padding: '30px 24px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#1E293B' }}>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Category Name <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wooden Toys"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of this collection..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                  {submitting ? 'Saving...' : editingCategory ? 'Update' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
