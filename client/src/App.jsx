import React, { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';

// Customer Pages
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AboutUsPage from './pages/AboutUsPage';
import ContactUsPage from './pages/ContactUsPage';
import PolicyPages from './pages/PolicyPages';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminProductManagement from './pages/admin/AdminProductManagement';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';

function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [adminTab, setAdminTab] = useState('products'); // RULE: DEFAULT LANDING MUST ALWAYS BE PRODUCT MANAGEMENT!
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Listen for browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if current route is an Admin route
  const isAdminRoute = currentPath.startsWith('/admin');

  // Handle Admin Routing
  if (isAdminRoute) {
    if (authLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontWeight: '700', color: '#64748B' }}>Checking admin credentials...</div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <AdminLoginPage onNavigate={navigate} />;
    }

    return (
      <AdminLayout
        activeTab={adminTab}
        onTabChange={(tab) => setAdminTab(tab)}
        onNavigate={navigate}
      >
        {adminTab === 'products' && <AdminProductManagement />}
        {adminTab === 'orders' && <AdminOrders />}
        {adminTab === 'categories' && <AdminCategories />}
        {adminTab === 'payments' && <AdminPayments />}
        {adminTab === 'analytics' && <AdminAnalytics />}
        {adminTab === 'settings' && <AdminSettings />}
      </AdminLayout>
    );
  }

  // Handle Customer Routing
  const renderCustomerPage = () => {
    // 1. Home
    if (currentPath === '/' || currentPath === '') {
      return <HomePage onNavigate={navigate} />;
    }

    // 2. Shop
    if (currentPath.startsWith('/shop')) {
      const url = new URL(window.location.href);
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      return <ShopPage initialCategory={category} initialSearch={search} onNavigate={navigate} />;
    }

    // 3. Product Details: /product/:id
    if (currentPath.startsWith('/product/')) {
      const productId = currentPath.replace('/product/', '');
      return <ProductDetailsPage productId={productId} onNavigate={navigate} />;
    }

    // 4. Checkout
    if (currentPath === '/checkout') {
      return <CheckoutPage onNavigate={navigate} />;
    }

    // 5. Order Confirmation: /order-confirmation/:id
    if (currentPath.startsWith('/order-confirmation/')) {
      const orderId = currentPath.replace('/order-confirmation/', '');
      return <OrderConfirmationPage orderId={orderId} onNavigate={navigate} />;
    }

    // 6. Order Tracking
    if (currentPath === '/track-order') {
      return <OrderTrackingPage onNavigate={navigate} />;
    }

    // 7. About Us
    if (currentPath === '/about') {
      return <AboutUsPage onNavigate={navigate} />;
    }

    // 8. Contact Us
    if (currentPath === '/contact') {
      return <ContactUsPage onNavigate={navigate} />;
    }

    // 9. Policies
    if (currentPath === '/privacy-policy') {
      return <PolicyPages initialTab="privacy" />;
    }
    if (currentPath === '/terms') {
      return <PolicyPages initialTab="terms" />;
    }
    if (currentPath === '/refund-policy') {
      return <PolicyPages initialTab="refund" />;
    }

    // Fallback -> Home
    return <HomePage onNavigate={navigate} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header currentPath={currentPath} onNavigate={navigate} />
      <main style={{ flex: 1 }}>
        {renderCustomerPage()}
      </main>
      <CartDrawer onNavigate={navigate} />
      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
