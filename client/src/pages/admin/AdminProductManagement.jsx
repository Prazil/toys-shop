import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit3, Trash2, Eye, EyeOff, Archive, RotateCcw, Upload, X, Check, AlertCircle, Sparkles, Image as ImageIcon, DollarSign, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminProductManagement() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form Fields (in exact mandated order)
  const [formImages, setFormImages] = useState([]); // File objects or existing URLs
  const [imagePreviews, setImagePreviews] = useState([]);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [description, setDescription] = useState('');
  const [productStatus, setProductStatus] = useState('Available');
  const [isVisible, setIsVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Quick Action Modals
  const [priceModal, setPriceModal] = useState(null); // { product, newPrice, newDiscount }
  const [stockModal, setStockModal] = useState(null); // { product, newStock }
  const [archiveModal, setArchiveModal] = useState(null); // product

  // Inline New Category
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [statusFilter]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/admin/list?status=${statusFilter}&search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?includeHidden=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  // Open Add Product Form
  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setFormImages([]);
    setImagePreviews([]);
    setProductName('');
    setPrice('');
    setDiscountPrice('');
    setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
    setStockQuantity('10');
    setDescription('');
    setProductStatus('Available');
    setIsVisible(true);
    setIsFeatured(false);
    setIsNewArrival(true);
    setIsBestseller(false);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Edit Product Form
  const handleOpenEditForm = (prod) => {
    setEditingProduct(prod);
    setFormImages([]);
    setImagePreviews(prod.main_image ? [prod.main_image] : []);
    setProductName(prod.name);
    setPrice(String(prod.price));
    setDiscountPrice(prod.discount_price ? String(prod.discount_price) : '');
    setCategoryId(String(prod.category_id));
    setStockQuantity(String(prod.stock_quantity));
    setDescription(prod.description || '');
    setProductStatus(prod.status);
    setIsVisible(prod.is_visible === 1);
    setIsFeatured(prod.is_featured === 1);
    setIsNewArrival(prod.is_new_arrival === 1);
    setIsBestseller(prod.is_bestseller === 1);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Image Upload Handling (Click & Drag-Drop)
  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setFormImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate discount percent
  const calcDiscountPercent = () => {
    const p = parseFloat(price);
    const d = parseFloat(discountPrice);
    if (!isNaN(p) && !isNaN(d) && d > 0 && d < p) {
      return Math.round(((p - d) / p) * 100);
    }
    return 0;
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();

    // Required fields validation
    const errors = {};
    if (imagePreviews.length === 0) errors.images = 'Product image is required';
    if (!productName.trim()) errors.name = 'Product name is required';
    if (!price || isNaN(price) || parseFloat(price) <= 0) errors.price = 'Valid price in ₹ is required';
    if (!categoryId) errors.category = 'Category is required';
    if (stockQuantity === '' || isNaN(stockQuantity) || parseInt(stockQuantity, 10) < 0) {
      errors.stock = 'Stock quantity is required (0 or more)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitting(true);
    setFormErrors({});

    try {
      const formData = new FormData();
      formData.append('name', productName.trim());
      formData.append('price', price);
      if (discountPrice) formData.append('discount_price', discountPrice);
      formData.append('category_id', categoryId);
      formData.append('stock_quantity', stockQuantity);
      formData.append('description', description);
      formData.append('status', parseInt(stockQuantity, 10) <= 0 ? 'Sold Out' : productStatus);
      formData.append('is_visible', isVisible ? '1' : '0');
      formData.append('is_featured', isFeatured ? '1' : '0');
      formData.append('is_new_arrival', isNewArrival ? '1' : '0');
      formData.append('is_bestseller', isBestseller ? '1' : '0');

      // Append new files
      formImages.forEach(file => {
        if (file instanceof File) {
          formData.append('images', file);
        }
      });

      // Existing images if editing
      if (editingProduct && editingProduct.main_image) {
        formData.append('existing_images', editingProduct.main_image);
      }

      const url = editingProduct
        ? `/api/products/admin/${editingProduct.id}`
        : '/api/products/admin';

      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setIsFormModalOpen(false);
        showNotification(editingProduct ? 'Product updated successfully!' : 'Product added successfully! 🎉');
        fetchProducts();
      } else {
        setFormErrors({ server: data.message || 'Failed to save product.' });
      }
    } catch (err) {
      setFormErrors({ server: 'Connection error while saving product.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick Change Price
  const handleQuickPriceSubmit = async (e) => {
    e.preventDefault();
    if (!priceModal) return;
    try {
      const res = await fetch(`/api/products/admin/${priceModal.product.id}/quick-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: priceModal.newPrice,
          discount_price: priceModal.newDiscount || null
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Price updated for "${priceModal.product.name}"`);
        setPriceModal(null);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Change Stock
  const handleQuickStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockModal) return;
    try {
      const res = await fetch(`/api/products/admin/${stockModal.product.id}/quick-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock_quantity: stockModal.newStock })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Stock updated for "${stockModal.product.name}"`);
        setStockModal(null);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // One-Click Status Toggle (Sold Out / Available)
  const handleToggleSoldOut = async (prod) => {
    const newStatus = prod.status === 'Sold Out' ? 'Available' : 'Sold Out';
    try {
      const res = await fetch(`/api/products/admin/${prod.id}/quick-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`"${prod.name}" marked as ${newStatus}`);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // One-Click Visibility Toggle (Hide / Show)
  const handleToggleVisibility = async (prod) => {
    const newVis = prod.is_visible === 1 ? false : true;
    try {
      const res = await fetch(`/api/products/admin/${prod.id}/quick-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_visible: newVis })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(newVis ? `"${prod.name}" is now visible on website` : `"${prod.name}" hidden from website`);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Archive Product
  const handleArchiveConfirm = async () => {
    if (!archiveModal) return;
    try {
      const res = await fetch(`/api/products/admin/${archiveModal.id}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Product "${archiveModal.name}" archived.`);
        setArchiveModal(null);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restore Product
  const handleRestoreProduct = async (prod) => {
    try {
      const res = await fetch(`/api/products/admin/${prod.id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Product "${prod.name}" restored!`);
        fetchProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create new category inline
  const handleCreateCategoryInline = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCatName.trim() })
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories(prev => [...prev, data.category]);
        setCategoryId(String(data.category.id));
        setNewCatName('');
        setShowNewCatInput(false);
        showNotification(`Created category "${data.category.name}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1E293B', marginBottom: '4px' }}>
            Product Management
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Manage catalog, upload photos, set pricing, adjust inventory, and control website visibility.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenAddForm}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '15px' }}
          >
            <Plus size={18} />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          backgroundColor: notification.type === 'error' ? '#FEE2E2' : '#E6FAF4',
          color: notification.type === 'error' ? '#B91C1C' : '#038A65',
          border: `1px solid ${notification.type === 'error' ? '#FCA5A5' : '#A7F3D0'}`,
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>{notification.type === 'error' ? '⚠️' : '✨'}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        padding: '16px 20px',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-xs)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'Available', 'Sold Out', 'Hidden', 'Archived'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '7px 14px',
                borderRadius: '50px',
                fontSize: '13px',
                fontWeight: '700',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--primary)' : 'var(--border-soft)',
                backgroundColor: statusFilter === st ? 'var(--primary-light)' : '#FFFFFF',
                color: statusFilter === st ? 'var(--primary)' : '#64748B',
                cursor: 'pointer'
              }}
            >
              {st === 'all' ? 'All Products' : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchProducts(); }}
            className="input-control"
            style={{ paddingLeft: '38px', paddingRight: '12px', paddingBottom: '9px', paddingTop: '9px', fontSize: '13px' }}
          />
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '12px' }}>🧸</div>
          <div style={{ fontWeight: '700', color: '#64748B' }}>Loading products...</div>
        </div>
      ) : products.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '60px 20px',
          border: '2px dashed var(--border-soft)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '20px auto'
        }}>
          <div style={{ fontSize: '50px', marginBottom: '14px' }}>📦</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#1E293B' }}>
            No products found in this view
          </h3>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
            {statusFilter === 'Archived' ? 'No archived products.' : 'Click "+ Add Product" to publish your first gift! Customer storefront only shows products you add here.'}
          </p>
          <button onClick={handleOpenAddForm} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add First Product</span>
          </button>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid var(--border-soft)', color: '#64748B', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 20px' }}>Product</th>
                  <th style={{ padding: '16px 14px' }}>Category</th>
                  <th style={{ padding: '16px 14px' }}>Price</th>
                  <th style={{ padding: '16px 14px' }}>Stock</th>
                  <th style={{ padding: '16px 14px' }}>Status</th>
                  <th style={{ padding: '16px 14px' }}>Visibility</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  const isSoldOut = prod.status === 'Sold Out' || prod.stock_quantity <= 0;
                  const isArchived = prod.status === 'Archived';
                  return (
                    <tr key={prod.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                      
                      {/* Product Image & Title */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={prod.main_image || '/placeholder-gift.png'}
                            alt={prod.name}
                            style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '12px',
                              objectFit: 'cover',
                              backgroundColor: '#FFF9F5',
                              border: '1px solid var(--border-soft)'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '15px' }}>{prod.name}</div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>SKU: {prod.sku || prod.product_id}</div>
                            {prod.is_bestseller === 1 && <span className="badge badge-bestseller" style={{ fontSize: '10px', marginTop: '3px' }}>Bestseller</span>}
                            {prod.is_featured === 1 && <span className="badge badge-featured" style={{ fontSize: '10px', marginTop: '3px', marginLeft: '4px' }}>Featured</span>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px 14px', color: '#475569' }}>
                        {prod.category_name}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '15px' }}>
                          ₹{prod.discount_price && prod.discount_price < prod.price ? prod.discount_price : prod.price}
                        </div>
                        {prod.discount_price && prod.discount_price < prod.price && (
                          <div style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through' }}>
                            ₹{prod.price} ({prod.discount_percentage}% OFF)
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{
                          fontWeight: '800',
                          color: prod.stock_quantity <= 0 ? '#EF4444' : prod.stock_quantity <= 3 ? '#F59E0B' : '#10B981'
                        }}>
                          {prod.stock_quantity} units
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 14px' }}>
                        <span className={`badge ${isArchived ? 'badge-soldout' : isSoldOut ? 'badge-soldout' : 'badge-new'}`}>
                          {prod.status}
                        </span>
                      </td>

                      {/* Visibility Toggle */}
                      <td style={{ padding: '14px 14px' }}>
                        <button
                          onClick={() => handleToggleVisibility(prod)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '50px',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: prod.is_visible === 1 ? '#E6FAF4' : '#F1F5F9',
                            color: prod.is_visible === 1 ? '#038A65' : '#64748B'
                          }}
                          title="Click to toggle visibility on storefront"
                        >
                          {prod.is_visible === 1 ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{prod.is_visible === 1 ? 'LIVE' : 'HIDDEN'}</span>
                        </button>
                      </td>

                      {/* Quick Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          
                          {/* Quick Edit Full */}
                          <button
                            onClick={() => handleOpenEditForm(prod)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="Edit Product"
                          >
                            <Edit3 size={14} />
                            <span>Edit</span>
                          </button>

                          {/* Quick Price */}
                          <button
                            onClick={() => setPriceModal({ product: prod, newPrice: String(prod.price), newDiscount: prod.discount_price ? String(prod.discount_price) : '' })}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: '700', color: '#475569' }}
                            title="Quick Change Price"
                          >
                            ₹ Price
                          </button>

                          {/* Quick Stock */}
                          <button
                            onClick={() => setStockModal({ product: prod, newStock: String(prod.stock_quantity) })}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: '700', color: '#475569' }}
                            title="Quick Change Stock"
                          >
                            Qty
                          </button>

                          {/* Sold Out Toggle */}
                          {!isArchived && (
                            <button
                              onClick={() => handleToggleSoldOut(prod)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: isSoldOut ? '#10B981' : '#F59E0B'
                              }}
                              title={isSoldOut ? 'Mark Available' : 'Mark Sold Out'}
                            >
                              {isSoldOut ? 'Avail' : 'Sold'}
                            </button>
                          )}

                          {/* Archive or Restore */}
                          {isArchived ? (
                            <button
                              onClick={() => handleRestoreProduct(prod)}
                              style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: '#E6FAF4', color: '#038A65', fontSize: '12px', fontWeight: '700' }}
                              title="Restore to Active Store"
                            >
                              <RotateCcw size={14} />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setArchiveModal(prod)}
                              style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#EF4444', fontSize: '12px', fontWeight: '700' }}
                              title="Archive Product"
                            >
                              <Archive size={14} />
                              <span>Archive</span>
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT PRODUCT MODAL (Exact mandated field order!)
          ======================================================== */}
      {isFormModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '640px', padding: '35px 30px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#1E293B' }}>
                  {editingProduct ? 'Edit Product' : '+ Add Product'}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Fill in the gift details to publish on the storefront.
                </div>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} style={{ padding: '6px', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            {formErrors.server && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                {formErrors.server}
              </div>
            )}

            <form onSubmit={handleSaveProduct}>
              
              {/* 1. PRODUCT IMAGE (LARGE UPLOAD BOX AT TOP) */}
              <div style={{ marginBottom: '24px' }}>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  1. Product Image <span className="req">*</span>
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
                  }}
                  style={{
                    border: '2px dashed var(--primary-border)',
                    borderRadius: '20px',
                    backgroundColor: '#FFF9F5',
                    padding: '30px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <Upload size={24} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                    Upload Product Image
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    Click to browse or Drag &amp; Drop images here (JPEG, PNG, WEBP, GIF up to 5MB)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); }}
                  />
                </div>

                {formErrors.images && (
                  <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600', marginTop: '6px', display: 'block' }}>
                    {formErrors.images}
                  </span>
                )}

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: idx === 0 ? '2px solid var(--primary)' : '1px solid #E2E8F0' }}>
                        <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 94, 126, 0.9)', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', textAlign: 'center', padding: '1px' }}>
                            MAIN
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFFFFF', borderRadius: '50%', padding: '2px' }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. PRODUCT NAME * */}
              <div className="input-group">
                <label className="input-label">2. Product Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Cute Teddy Bear"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="input-control"
                />
                {formErrors.name && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.name}</span>}
              </div>

              {/* 3. PRICE * & 4. DISCOUNT PRICE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">3. Price (₹) <span className="req">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 499"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input-control"
                  />
                  {formErrors.price && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.price}</span>}
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">4. Discount Price (₹)</label>
                    {calcDiscountPercent() > 0 && (
                      <span className="badge badge-discount" style={{ fontSize: '11px' }}>
                        {calcDiscountPercent()}% OFF
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 399"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    className="input-control"
                  />
                </div>
              </div>

              {/* 5. CATEGORY * (Dropdown + Allow Admin to create new categories) */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ margin: 0 }}>5. Category <span className="req">*</span></label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}
                  >
                    {showNewCatInput ? 'Cancel' : '+ Add New Category'}
                  </button>
                </div>

                {showNewCatInput && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="input-control"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategoryInline}
                      className="btn btn-primary btn-sm"
                    >
                      Save Category
                    </button>
                  </div>
                )}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-control"
                >
                  <option value="">Select a category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formErrors.category && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.category}</span>}
              </div>

              {/* 6. STOCK QUANTITY * */}
              <div className="input-group">
                <label className="input-label">6. Stock Quantity <span className="req">*</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="input-control"
                />
                {formErrors.stock && <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>{formErrors.stock}</span>}
              </div>

              {/* 7. PRODUCT DESCRIPTION */}
              <div className="input-group">
                <label className="input-label">7. Product Description</label>
                <textarea
                  rows={3}
                  placeholder="Soft and cute teddy bear, perfect for birthdays and gifting."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-control"
                />
              </div>

              {/* 8. PRODUCT STATUS */}
              <div className="input-group">
                <label className="input-label">8. Product Status</label>
                <select
                  value={productStatus}
                  onChange={(e) => setProductStatus(e.target.value)}
                  className="input-control"
                >
                  <option value="Available">Available (Can be purchased)</option>
                  <option value="Sold Out">Sold Out (Visible, but purchase disabled)</option>
                  <option value="Hidden">Hidden (Not shown on store)</option>
                </select>
              </div>

              {/* 9. TOGGLES (Visibility, Featured, New Arrival, Bestseller) */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px'
              }}>
                {/* 9. Website Visibility */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>Show Product on Website</span>
                </label>

                {/* 10. Featured Product */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>Featured Product</span>
                </label>

                {/* 11. New Arrival */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>New Arrival Badge</span>
                </label>

                {/* 12. Bestseller */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>Bestseller Badge</span>
                </label>
              </div>

              {/* 13. SAVE BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: '15px' }}
                >
                  <Check size={16} />
                  <span>{formSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* QUICK PRICE MODAL */}
      {priceModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Change Price</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>{priceModal.product.name}</p>
            <form onSubmit={handleQuickPriceSubmit}>
              <div className="input-group">
                <label className="input-label">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceModal.newPrice}
                  onChange={(e) => setPriceModal({ ...priceModal, newPrice: e.target.value })}
                  className="input-control"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Discount Price (₹) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceModal.newDiscount}
                  onChange={(e) => setPriceModal({ ...priceModal, newDiscount: e.target.value })}
                  className="input-control"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setPriceModal(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Update Price</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK MODAL */}
      {stockModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Change Stock</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>{stockModal.product.name}</p>
            <form onSubmit={handleQuickStockSubmit}>
              <div className="input-group">
                <label className="input-label">Available Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockModal.newStock}
                  onChange={(e) => setStockModal({ ...stockModal, newStock: e.target.value })}
                  className="input-control"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setStockModal(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '440px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '14px' }}>📦</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#1E293B' }}>
              Archive Product?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
              Are you sure you want to remove <strong>"{archiveModal.name}"</strong> from the store? It will disappear from the customer website, but all historical orders will remain intact.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setArchiveModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleArchiveConfirm} className="btn btn-primary" style={{ backgroundColor: '#EF4444' }}>
                Yes, Archive Product
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
