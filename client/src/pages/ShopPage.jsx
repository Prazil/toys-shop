import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ShopPage({ initialCategory, initialSearch, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // Load categories
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.categories); });
  }, []);

  useEffect(() => {
    fetchFilteredProducts();
  }, [selectedCategory, availability, sortBy]);

  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);
      if (availability !== 'all') params.append('availability', availability);
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching shop products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setPriceRange({ min: '', max: '' });
    setAvailability('all');
    setSortBy('newest');
  };

  return (
    <div style={{ padding: '40px 20px 80px', backgroundColor: 'var(--bg-body)', minHeight: '80vh' }}>
      <div className="container">
        
        {/* Title */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Explore Kids Gifts &amp; Toys</h1>
          <p style={{ fontSize: '15px', color: '#64748B' }}>
            Find the perfect joyful surprise for birthdays, milestones, and everyday smiles!
          </p>
        </div>

        {/* Filter Controls Row */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '35px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Search & Sort Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 300px', maxWidth: '500px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Search toys, gifts, teddy..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-control"
                  style={{ paddingLeft: '40px' }}
                />
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 20px' }}>
                Search
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', whiteSpace: 'nowrap' }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-control"
                style={{ width: 'auto', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                <option value="newest">✨ Newest Arrivals</option>
                <option value="bestseller">🔥 Best Sellers</option>
                <option value="featured">⭐ Featured</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '50px',
                fontSize: '13px',
                fontWeight: '700',
                border: '1.5px solid',
                borderColor: selectedCategory === 'all' ? 'var(--primary)' : 'var(--border-soft)',
                backgroundColor: selectedCategory === 'all' ? 'var(--primary-light)' : '#FFFFFF',
                color: selectedCategory === 'all' ? 'var(--primary)' : '#475569',
                cursor: 'pointer'
              }}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: '1.5px solid',
                  borderColor: selectedCategory === String(cat.id) ? 'var(--primary)' : 'var(--border-soft)',
                  backgroundColor: selectedCategory === String(cat.id) ? 'var(--primary-light)' : '#FFFFFF',
                  color: selectedCategory === String(cat.id) ? 'var(--primary)' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Additional Filter Row: Price and Availability */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: '#64748B' }}>Availability:</span>
              <button
                onClick={() => setAvailability('all')}
                style={{ fontWeight: availability === 'all' ? '800' : '500', color: availability === 'all' ? 'var(--primary)' : '#64748B' }}
              >
                All
              </button>
              <span>•</span>
              <button
                onClick={() => setAvailability('available')}
                style={{ fontWeight: availability === 'available' ? '800' : '500', color: availability === 'available' ? '#10B981' : '#64748B' }}
              >
                In Stock Only
              </button>
              <span>•</span>
              <button
                onClick={() => setAvailability('sold_out')}
                style={{ fontWeight: availability === 'sold_out' ? '800' : '500', color: availability === 'sold_out' ? '#EF4444' : '#64748B' }}
              >
                Sold Out
              </button>
            </div>

            {(search || selectedCategory !== 'all' || availability !== 'all') && (
              <button
                onClick={handleClearFilters}
                style={{ marginLeft: 'auto', color: '#EF4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={14} /> Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {loading ? (
          <div className="grid-products">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} style={{ height: '340px' }} className="skeleton" />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* MANDATORY EMPTY STATE - NO FAKE PRODUCTS */
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '2px dashed var(--primary-border)',
            padding: '70px 20px',
            textAlign: 'center',
            maxWidth: '650px',
            margin: '40px auto'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎈</div>
            <h3 style={{ fontSize: '24px', color: '#1E293B', marginBottom: '10px' }}>
              No gifts available right now. Check back soon!
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '440px', margin: '0 auto 24px' }}>
              We're currently restocking our magical shelves with new joyful gifts.
            </p>
            <button
              onClick={() => onNavigate('/admin')}
              className="btn btn-outline"
            >
              🔐 Admin: Add Products to Store
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
              Showing {products.length} gift{products.length === 1 ? '' : 's'}
            </div>
            <div className="grid-products">
              {products.map(prod => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
