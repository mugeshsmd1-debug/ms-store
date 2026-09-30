const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'store.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL DEFAULT 'MS Store',
      tagline TEXT DEFAULT 'Smart Retail & Inventory Management',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      currency_symbol TEXT DEFAULT '₹',
      tax_percentage REAL DEFAULT 5.0,
      owner_name TEXT DEFAULT '',
      owner_email TEXT DEFAULT '',
      owner_pin TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      unit TEXT DEFAULT 'pcs',
      image_emoji TEXT DEFAULT '📦',
      gst_percentage REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_phone TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      status TEXT DEFAULT 'Completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      gst_percentage REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      profit REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations for existing tables
  try {
    db.exec('ALTER TABLE settings ADD COLUMN owner_name TEXT DEFAULT ""');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE settings ADD COLUMN owner_email TEXT DEFAULT ""');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE settings ADD COLUMN owner_pin TEXT DEFAULT ""');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE products ADD COLUMN gst_percentage REAL DEFAULT 5.0');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE order_items ADD COLUMN gst_percentage REAL DEFAULT 0.0');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE order_items ADD COLUMN tax_amount REAL DEFAULT 0.0');
  } catch (e) {}

  // Multi-user authentication & Account data scoping
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      shop_name TEXT NOT NULL DEFAULT 'MS Store',
      phone TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { db.exec('ALTER TABLE products ADD COLUMN user_email TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN user_email TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE stock_logs ADD COLUMN user_email TEXT DEFAULT ""'); } catch (e) {}

  // Ensure default settings exist
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO settings (id, shop_name, tagline, phone, address, currency_symbol, tax_percentage)
      VALUES (1, 'MS Store', 'Smart Retail & Inventory Management', '', '', '₹', 5.0)
    `).run();
  }
  // Fresh start: No dummy products or orders are seeded!
}

function clearAllStoreData() {
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM stock_logs;
    DELETE FROM products;
  `);
}

initDatabase();

db.clearAllStoreData = clearAllStoreData;

module.exports = db;
module.exports.db = db;
module.exports.clearAllStoreData = clearAllStoreData;
