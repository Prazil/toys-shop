-- Database Schema for Kids Gift Shop

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin',
  name TEXT DEFAULT 'Gift Shop Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  is_hidden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  price REAL NOT NULL,
  discount_price REAL,
  description TEXT,
  category_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  status TEXT DEFAULT 'Available',
  is_visible INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  is_new_arrival INTEGER DEFAULT 0,
  is_bestseller INTEGER DEFAULT 0,
  main_image TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  is_main INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  house_no TEXT NOT NULL,
  street TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  order_notes TEXT,
  subtotal REAL NOT NULL,
  discount_total REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  payment_method TEXT DEFAULT 'UPI',
  payment_status TEXT DEFAULT 'Pending',
  order_status TEXT DEFAULT 'Payment Pending',
  payment_id TEXT,
  payment_ref TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery TEXT,
  delivery_otp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  order_code TEXT NOT NULL,
  product_id INTEGER,
  product_code TEXT,
  product_name TEXT NOT NULL,
  price_at_purchase REAL NOT NULL,
  discount_price_at_purchase REAL,
  quantity INTEGER NOT NULL,
  total_price REAL NOT NULL,
  product_image TEXT,
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL,
  payment_id TEXT UNIQUE NOT NULL,
  transaction_reference TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  gateway_reference TEXT,
  raw_payload TEXT,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT,
  channel TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  recipient TEXT NOT NULL,
  recipient_masked TEXT,
  subject TEXT,
  message_body TEXT,
  html_body TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  provider TEXT,
  provider_message_id TEXT,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at DATETIME,
  error_code TEXT,
  error_message TEXT,
  raw_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sheets_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  last_attempt_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
