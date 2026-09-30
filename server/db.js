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
      phone TEXT DEFAULT '+91 98765 43210',
      address TEXT DEFAULT '124 Market Road, Commercial Hub',
      currency_symbol TEXT DEFAULT '₹',
      tax_percentage REAL DEFAULT 5.0,
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

  // Ensure default settings exist
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO settings (id, shop_name, tagline, phone, address, currency_symbol, tax_percentage)
      VALUES (1, 'MS Store', 'Smart Retail & Inventory Management', '+91 98765 43210', '124 Market Road, Commercial Hub', '₹', 5.0)
    `).run();
  }

  // Seed sample products if empty
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category, cost_price, selling_price, stock_quantity, low_stock_threshold, unit, image_emoji)
    VALUES (@name, @sku, @category, @cost_price, @selling_price, @stock_quantity, @low_stock_threshold, @unit, @image_emoji)
  `);

  const initialProducts = [
    { name: 'Wireless Optical Mouse', sku: 'ELEC-001', category: 'Electronics', cost_price: 250, selling_price: 499, stock_quantity: 28, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🖱️' },
    { name: 'USB-C Fast Charging Cable', sku: 'ELEC-002', category: 'Electronics', cost_price: 120, selling_price: 299, stock_quantity: 45, low_stock_threshold: 10, unit: 'pcs', image_emoji: '🔌' },
    { name: 'Wireless Mechanical Keyboard', sku: 'ELEC-003', category: 'Electronics', cost_price: 1400, selling_price: 2499, stock_quantity: 4, low_stock_threshold: 5, unit: 'pcs', image_emoji: '⌨️' },
    { name: 'Bluetooth Speaker 10W', sku: 'ELEC-004', category: 'Electronics', cost_price: 750, selling_price: 1399, stock_quantity: 9, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🔊' },
    { name: 'Organic Green Tea 100g', sku: 'GROC-001', category: 'Beverages', cost_price: 110, selling_price: 185, stock_quantity: 22, low_stock_threshold: 8, unit: 'box', image_emoji: '🍵' },
    { name: 'Almond Milk 1L', sku: 'GROC-002', category: 'Beverages', cost_price: 135, selling_price: 210, stock_quantity: 3, low_stock_threshold: 6, unit: 'bottle', image_emoji: '🥛' },
    { name: 'Premium Basmati Rice 5kg', sku: 'GROC-003', category: 'Groceries', cost_price: 360, selling_price: 495, stock_quantity: 15, low_stock_threshold: 5, unit: 'bag', image_emoji: '🍚' },
    { name: 'Raw Natural Honey 500g', sku: 'GROC-004', category: 'Groceries', cost_price: 175, selling_price: 280, stock_quantity: 18, low_stock_threshold: 5, unit: 'jar', image_emoji: '🍯' },
    { name: 'Stainless Steel Water Bottle 1L', sku: 'HOME-001', category: 'Lifestyle', cost_price: 190, selling_price: 380, stock_quantity: 14, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🧴' },
    { name: 'LED Desk Lamp Adjustable', sku: 'HOME-002', category: 'Lifestyle', cost_price: 320, selling_price: 620, stock_quantity: 12, low_stock_threshold: 4, unit: 'pcs', image_emoji: '💡' },
    { name: 'A5 Hardcover Journal Notebook', sku: 'STAT-001', category: 'Stationery', cost_price: 65, selling_price: 140, stock_quantity: 50, low_stock_threshold: 10, unit: 'pcs', image_emoji: '📓' },
    { name: 'Luxury Gel Pen 0.5mm Pack', sku: 'STAT-002', category: 'Stationery', cost_price: 45, selling_price: 99, stock_quantity: 60, low_stock_threshold: 15, unit: 'pack', image_emoji: '🖊️' },
  ];

  const insertStockLog = db.prepare(`
    INSERT INTO stock_logs (product_id, type, quantity_change, quantity_after, note)
    VALUES (?, 'INITIAL', ?, ?, 'Initial inventory stock')
  `);

  const seedTransaction = db.transaction(() => {
    for (const prod of initialProducts) {
      const result = insertProduct.run(prod);
      insertStockLog.run(result.lastInsertRowid, prod.stock_quantity, prod.stock_quantity);
    }

    // Seed a couple of initial sample orders to display realistic P&L metrics immediately
    const sampleOrders = [
      {
        invoice_no: 'INV-1001',
        customer_name: 'Rahul Sharma',
        customer_phone: '9876501234',
        items: [
          { sku: 'ELEC-001', name: 'Wireless Optical Mouse', cost_price: 250, selling_price: 499, quantity: 1 },
          { sku: 'ELEC-002', name: 'USB-C Fast Charging Cable', cost_price: 120, selling_price: 299, quantity: 2 }
        ],
        payment_method: 'UPI',
        discount: 20,
        tax_rate: 0.05,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        invoice_no: 'INV-1002',
        customer_name: 'Priya Patel',
        customer_phone: '9822334455',
        items: [
          { sku: 'GROC-003', name: 'Premium Basmati Rice 5kg', cost_price: 360, selling_price: 495, quantity: 2 },
          { sku: 'GROC-004', name: 'Raw Natural Honey 500g', cost_price: 175, selling_price: 280, quantity: 1 }
        ],
        payment_method: 'Card',
        discount: 50,
        tax_rate: 0.05,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        invoice_no: 'INV-1003',
        customer_name: 'Amit Verma',
        customer_phone: '9123456789',
        items: [
          { sku: 'ELEC-004', name: 'Bluetooth Speaker 10W', cost_price: 750, selling_price: 1399, quantity: 1 },
          { sku: 'HOME-001', name: 'Stainless Steel Water Bottle 1L', cost_price: 190, selling_price: 380, quantity: 1 }
        ],
        payment_method: 'Cash',
        discount: 0,
        tax_rate: 0.05,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ];

    const insertOrder = db.prepare(`
      INSERT INTO orders (invoice_no, customer_name, customer_phone, subtotal, discount_amount, tax_amount, total_amount, total_cost, profit, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, sku, cost_price, selling_price, quantity, subtotal, profit)
      VALUES (?, (SELECT id FROM products WHERE sku = ?), ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const order of sampleOrders) {
      let subtotal = 0;
      let totalCost = 0;
      for (const item of order.items) {
        subtotal += item.selling_price * item.quantity;
        totalCost += item.cost_price * item.quantity;
      }
      const taxable = Math.max(0, subtotal - order.discount);
      const tax = parseFloat((taxable * order.tax_rate).toFixed(2));
      const totalAmount = parseFloat((taxable + tax).toFixed(2));
      const profit = parseFloat((totalAmount - tax - totalCost).toFixed(2));

      const orderResult = insertOrder.run(
        order.invoice_no,
        order.customer_name,
        order.customer_phone,
        subtotal,
        order.discount,
        tax,
        totalAmount,
        totalCost,
        profit,
        order.payment_method,
        order.created_at
      );

      const orderId = orderResult.lastInsertRowid;
      for (const item of order.items) {
        const itemSubtotal = item.selling_price * item.quantity;
        const itemProfit = (item.selling_price - item.cost_price) * item.quantity;
        insertOrderItem.run(
          orderId,
          item.sku,
          item.name,
          item.sku,
          item.cost_price,
          item.selling_price,
          item.quantity,
          itemSubtotal,
          itemProfit
        );
      }
    }
  });

  seedTransaction();
}

initDatabase();

module.exports = db;
