import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('kids_gift_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('kids_gift_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const addToCart = (product, quantity = 1) => {
    if (product.status === 'Sold Out' || product.stock_quantity <= 0) {
      showToast(`Sorry, "${product.name}" is currently sold out!`, 'error');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock_quantity) {
          showToast(`Only ${product.stock_quantity} available in stock!`, 'error');
          return prev.map(item => item.id === product.id ? { ...item, quantity: product.stock_quantity } : item);
        }
        showToast(`Updated "${product.name}" quantity in cart! 🎁`);
        return prev.map(item => item.id === product.id ? { ...item, quantity: newQty } : item);
      } else {
        const addedQty = Math.min(quantity, product.stock_quantity);
        showToast(`Added "${product.name}" to your gift cart! 🎀`);
        return [...prev, {
          id: product.id,
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          discount_price: product.discount_price,
          effective_price: (product.discount_price && product.discount_price < product.price) ? product.discount_price : product.price,
          main_image: product.main_image,
          category_name: product.category_name,
          stock_quantity: product.stock_quantity,
          quantity: addedQty
        }];
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    showToast('Item removed from cart.');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(item => {
      if (item.id === productId) {
        const safeQty = Math.min(quantity, item.stock_quantity || 99);
        return { ...item, quantity: safeQty };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const discountTotal = cartItems.reduce((sum, item) => {
    if (item.discount_price && item.discount_price < item.price) {
      return sum + ((item.price - item.discount_price) * item.quantity);
    }
    return sum;
  }, 0);

  const itemsTotal = subtotal - discountTotal;
  const shippingFee = itemsTotal >= 499 || itemsTotal === 0 ? 0 : 49;
  const grandTotal = itemsTotal + shippingFee;

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      discountTotal,
      itemsTotal,
      shippingFee,
      grandTotal,
      isCartOpen,
      setIsCartOpen,
      toast,
      showToast
    }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
          color: '#FFFFFF',
          padding: '14px 22px',
          borderRadius: '50px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: '700',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'scaleUp 0.25s ease-out'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✨'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
