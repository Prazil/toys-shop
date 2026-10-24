# 🎁 Giggle & Bloom Kids Gift Shop

> **"Little Gifts, Big Smiles!"**  
> A complete, production-ready, full-stack e-commerce website for a modern, colorful, premium kids gift shop.

---

## 🌟 Quick Start Guide

### 1. Start the Full-Stack Server
From the root directory (`d:/GIFT SHOP`):

```bash
npm run dev
# or
node server/server.js
```

- **Customer Storefront**: [http://localhost:5000/](http://localhost:5000/)
- **Admin Dashboard**: [http://localhost:5000/admin](http://localhost:5000/admin)
- **API Base**: [http://localhost:5000/api](http://localhost:5000/api)

### 2. Admin Login
- **Username**: `admin`
- **Password**: `admin123`
- **Default Landing Page**: **Product Management** (`/admin/products`)

### 3. Payment Details
- **Merchant UPI ID**: `prazilss4@oksbi`
- **Accepted Modes**: All UPI Apps (Google Pay, PhonePe, Paytm, BHIM) and Online Payment Gateways
- **Server Verification**: Cryptographic HMAC signature check + Admin bank statement verification audit

---

## 📦 System Architecture

- **Frontend**: Vite + React 19 + Vanilla CSS Design System (`index.css` with playful pastel & vibrant tokens)
- **Backend**: Node.js + Express 5 with JWT Authentication, Multer file upload, and Nodemailer HTML email templates
- **Database**: Persistent SQLite with relational schema (`giftshop.sqlite` in `server/data/`)
- **Notifications**: Automated dispatch for all 9 order lifecycle transitions (Email + SMS)
- **Google Sheets**: 24-column order ledger with idempotency (1 row per order, updated on status change) and 1-click CSV export.

---

## 🛍️ Customer Pages
1. Home (`/`)
2. Shop / All Products (`/shop`)
3. Product Details (`/product/:id`)
4. Cart Drawer & Cart Page (`/cart`)
5. Checkout (`/checkout`) — Online payment only
6. Order Confirmation (`/order-confirmation/:id`) with celebratory confetti
7. Order Tracking (`/track-order`) with 8-milestone timeline
8. About Us (`/about`)
9. Contact Us (`/contact`)
10. Privacy Policy (`/privacy-policy`)
11. Terms & Conditions (`/terms`)
12. Refund & Cancellation Policy (`/refund-policy`)
