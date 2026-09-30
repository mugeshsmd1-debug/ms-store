const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------
// SETTINGS ENDPOINTS
// ---------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const { shop_name, tagline, phone, address, currency_symbol, tax_percentage } = req.body;
    db.prepare(`
      UPDATE settings
      SET shop_name = COALESCE(?, shop_name),
          tagline = COALESCE(?, tagline),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          currency_symbol = COALESCE(?, currency_symbol),
          tax_percentage = COALESCE(?, tax_percentage),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(shop_name, tagline, phone, address, currency_symbol, tax_percentage);

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// PRODUCTS ENDPOINTS
// ---------------------------------------------
app.get('/api/products', (req, res) => {
  try {
    const { search, category, lowStockOnly } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (lowStockOnly === 'true') {
      query += ' AND stock_quantity <= low_stock_threshold';
    }

    query += ' ORDER BY name ASC';

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category ASC').all();
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, sku, category, cost_price, selling_price, stock_quantity, low_stock_threshold, unit, image_emoji } = req.body;
    if (!name || !sku || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({ error: 'Name, SKU, cost price, and selling price are required.' });
    }

    const cleanSku = String(sku).trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(cleanSku);
    if (existing) {
      return res.status(400).json({ error: `Product SKU "${cleanSku}" already exists.` });
    }

    const initialStock = parseInt(stock_quantity, 10) || 0;
    const threshold = parseInt(low_stock_threshold, 10) || 5;

    const insert = db.prepare(`
      INSERT INTO products (name, sku, category, cost_price, selling_price, stock_quantity, low_stock_threshold, unit, image_emoji)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      cleanSku,
      category ? category.trim() : 'General',
      parseFloat(cost_price),
      parseFloat(selling_price),
      initialStock,
      threshold,
      unit || 'pcs',
      image_emoji || '📦'
    );

    const productId = result.lastInsertRowid;

    if (initialStock > 0) {
      db.prepare(`
        INSERT INTO stock_logs (product_id, type, quantity_change, quantity_after, note)
        VALUES (?, 'INITIAL', ?, ?, 'Initial inventory stock')
      `).run(productId, initialStock, initialStock);
    }

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, cost_price, selling_price, stock_quantity, low_stock_threshold, unit, image_emoji } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const cleanSku = sku ? String(sku).trim().toUpperCase() : existing.sku;
    if (cleanSku !== existing.sku) {
      const duplicate = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(cleanSku, id);
      if (duplicate) {
        return res.status(400).json({ error: `SKU "${cleanSku}" is already taken by another product.` });
      }
    }

    const newStock = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : existing.stock_quantity;
    const stockDiff = newStock - existing.stock_quantity;

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          category = COALESCE(?, category),
          cost_price = COALESCE(?, cost_price),
          selling_price = COALESCE(?, selling_price),
          stock_quantity = COALESCE(?, stock_quantity),
          low_stock_threshold = COALESCE(?, low_stock_threshold),
          unit = COALESCE(?, unit),
          image_emoji = COALESCE(?, image_emoji),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      cleanSku,
      category ? category.trim() : null,
      cost_price !== undefined ? parseFloat(cost_price) : null,
      selling_price !== undefined ? parseFloat(selling_price) : null,
      newStock,
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : null,
      unit || null,
      image_emoji || null,
      id
    );

    if (stockDiff !== 0) {
      db.prepare(`
        INSERT INTO stock_logs (product_id, type, quantity_change, quantity_after, note)
        VALUES (?, 'ADJUSTMENT', ?, ?, 'Manual stock edit')
      `).run(id, stockDiff, newStock);
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick stock adjustment (+ or - or direct restock)
app.patch('/api/products/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { delta, newStock, note, type } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    let updatedQuantity;
    let change;

    if (delta !== undefined) {
      change = parseInt(delta, 10);
      updatedQuantity = product.stock_quantity + change;
    } else if (newStock !== undefined) {
      updatedQuantity = parseInt(newStock, 10);
      change = updatedQuantity - product.stock_quantity;
    } else {
      return res.status(400).json({ error: 'Provide delta or newStock.' });
    }

    if (updatedQuantity < 0) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
    }

    const logType = type || (change > 0 ? 'RESTOCK' : 'ADJUSTMENT');

    const updateTx = db.transaction(() => {
      db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(updatedQuantity, id);

      db.prepare(`
        INSERT INTO stock_logs (product_id, type, quantity_change, quantity_after, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, logType, change, updatedQuantity, note || `Quick stock ${change >= 0 ? '+' + change : change}`);
    });

    updateTx();

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted successfully.', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// BILLING / ORDERS ENDPOINTS
// ---------------------------------------------
app.post('/api/orders', (req, res) => {
  try {
    const { items, customer_name, customer_phone, discount_amount = 0, tax_percentage, payment_method = 'Cash' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Add items to create a bill.' });
    }

    // Settings for default tax
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const effectiveTaxRate = (tax_percentage !== undefined ? parseFloat(tax_percentage) : (settings?.tax_percentage || 5.0)) / 100;

    // Transaction for atomic order processing & stock deduction
    const processOrderTx = db.transaction(() => {
      let subtotal = 0;
      let totalCost = 0;
      const verifiedItems = [];

      // 1. Verify stock and calculate totals
      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
        if (!product) {
          throw new Error(`Product not found: ID ${item.id}`);
        }

        const qty = parseInt(item.quantity, 10);
        if (qty <= 0) {
          throw new Error(`Invalid quantity for ${product.name}`);
        }

        if (product.stock_quantity < qty) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${qty}`);
        }

        const sellingPrice = parseFloat(product.selling_price);
        const costPrice = parseFloat(product.cost_price);
        const itemSubtotal = sellingPrice * qty;
        const itemCost = costPrice * qty;
        const itemProfit = (sellingPrice - costPrice) * qty;

        subtotal += itemSubtotal;
        totalCost += itemCost;

        verifiedItems.push({
          product,
          qty,
          sellingPrice,
          costPrice,
          itemSubtotal,
          itemProfit
        });
      }

      // Calculations
      const discount = Math.min(subtotal, Math.max(0, parseFloat(discount_amount) || 0));
      const taxable = Math.max(0, subtotal - discount);
      const taxAmount = parseFloat((taxable * effectiveTaxRate).toFixed(2));
      const totalAmount = parseFloat((taxable + taxAmount).toFixed(2));
      // Net profit = (total revenue without tax) - total cost of goods
      const netProfit = parseFloat((taxable - totalCost).toFixed(2));

      // Generate invoice number e.g. INV-20260930-1042
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE invoice_no LIKE ?`).get(`INV-${dateStr}%`).count;
      const invoiceNo = `INV-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

      // Insert Order
      const insertOrder = db.prepare(`
        INSERT INTO orders (invoice_no, customer_name, customer_phone, subtotal, discount_amount, tax_amount, total_amount, total_cost, profit, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
      `);

      const orderResult = insertOrder.run(
        invoiceNo,
        customer_name ? customer_name.trim() : 'Walk-in Customer',
        customer_phone ? customer_phone.trim() : '',
        parseFloat(subtotal.toFixed(2)),
        discount,
        taxAmount,
        totalAmount,
        parseFloat(totalCost.toFixed(2)),
        netProfit,
        payment_method
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert Order Items and Deduct Stock
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, sku, cost_price, selling_price, quantity, subtotal, profit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products
        SET stock_quantity = stock_quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const insertStockLog = db.prepare(`
        INSERT INTO stock_logs (product_id, type, quantity_change, quantity_after, note)
        VALUES (?, 'SALE', ?, ?, ?)
      `);

      for (const vItem of verifiedItems) {
        insertItem.run(
          orderId,
          vItem.product.id,
          vItem.product.name,
          vItem.product.sku,
          vItem.costPrice,
          vItem.sellingPrice,
          vItem.qty,
          parseFloat(vItem.itemSubtotal.toFixed(2)),
          parseFloat(vItem.itemProfit.toFixed(2))
        );

        updateStock.run(vItem.qty, vItem.product.id);

        const newStock = vItem.product.stock_quantity - vItem.qty;
        insertStockLog.run(
          vItem.product.id,
          -vItem.qty,
          newStock,
          `Sale in ${invoiceNo}`
        );
      }

      return {
        orderId,
        invoiceNo,
        customer_name: customer_name || 'Walk-in Customer',
        customer_phone: customer_phone || '',
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_amount: discount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        total_cost: parseFloat(totalCost.toFixed(2)),
        profit: netProfit,
        payment_method,
        created_at: new Date().toISOString(),
        items: verifiedItems.map(vi => ({
          name: vi.product.name,
          sku: vi.product.sku,
          quantity: vi.qty,
          selling_price: vi.sellingPrice,
          subtotal: vi.itemSubtotal
        }))
      };
    });

    const receipt = processOrderTx();
    res.status(201).json(receipt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const orders = db.prepare(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit, 10), parseInt(offset, 10));

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR invoice_no = ?').get(req.params.id, req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// PROFIT & LOSS (P&L) ANALYTICS ENDPOINTS
// ---------------------------------------------
app.get('/api/analytics/pnl', (req, res) => {
  try {
    const { range = 'all' } = req.query; // 'today', 'week', 'month', 'all'

    let dateFilter = '';
    if (range === 'today') {
      dateFilter = `WHERE date(created_at, 'localtime') = date('now', 'localtime')`;
    } else if (range === 'week') {
      dateFilter = `WHERE date(created_at, 'localtime') >= date('now', '-7 days', 'localtime')`;
    } else if (range === 'month') {
      dateFilter = `WHERE date(created_at, 'localtime') >= date('now', '-30 days', 'localtime')`;
    }

    // Overall Revenue, Cost, Profit from completed orders
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(profit), 0) as net_profit
      FROM orders
      ${dateFilter}
    `).get();

    const revenue = summary.total_revenue;
    const profit = summary.net_profit;
    const margin = revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : 0;

    // Daily Sales & Profit Trend (Last 14 days)
    const dailyTrend = db.prepare(`
      SELECT 
        date(created_at, 'localtime') as date,
        COUNT(*) as order_count,
        ROUND(SUM(total_amount), 2) as daily_revenue,
        ROUND(SUM(total_cost), 2) as daily_cost,
        ROUND(SUM(profit), 2) as daily_profit
      FROM orders
      WHERE date(created_at, 'localtime') >= date('now', '-14 days', 'localtime')
      GROUP BY date(created_at, 'localtime')
      ORDER BY date ASC
    `).all();

    // Top Profit Contribution Products
    const topProfitable = db.prepare(`
      SELECT 
        oi.product_name,
        oi.sku,
        SUM(oi.quantity) as units_sold,
        ROUND(SUM(oi.subtotal), 2) as total_sales,
        ROUND(SUM(oi.profit), 2) as total_profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${dateFilter.replace('WHERE', 'WHERE o.')}
      GROUP BY oi.sku, oi.product_name
      ORDER BY total_profit DESC
      LIMIT 6
    `).all();

    // Inventory Valuation & Stock Health (Current snapshot)
    const inventoryStats = db.prepare(`
      SELECT 
        COUNT(*) as total_product_types,
        COALESCE(SUM(stock_quantity), 0) as total_items_in_stock,
        COALESCE(SUM(cost_price * stock_quantity), 0) as inventory_cost_value,
        COALESCE(SUM(selling_price * stock_quantity), 0) as inventory_retail_value,
        COALESCE(SUM((selling_price - cost_price) * stock_quantity), 0) as potential_profit,
        (SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0) as low_stock_count,
        (SELECT COUNT(*) FROM products WHERE stock_quantity = 0) as out_of_stock_count
      FROM products
    `).get();

    // Recent Stock Activity Log
    const recentStockLogs = db.prepare(`
      SELECT sl.*, p.name as product_name, p.sku
      FROM stock_logs sl
      JOIN products p ON p.id = sl.product_id
      ORDER BY sl.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      summary: {
        total_orders: summary.total_orders,
        total_revenue: parseFloat(summary.total_revenue.toFixed(2)),
        gross_sales: parseFloat(summary.gross_sales.toFixed(2)),
        total_discounts: parseFloat(summary.total_discounts.toFixed(2)),
        total_tax: parseFloat(summary.total_tax.toFixed(2)),
        total_cost: parseFloat(summary.total_cost.toFixed(2)),
        net_profit: parseFloat(summary.net_profit.toFixed(2)),
        profit_margin: margin,
        is_profit: summary.net_profit >= 0
      },
      dailyTrend,
      topProfitable,
      inventoryStats: {
        total_product_types: inventoryStats.total_product_types,
        total_items_in_stock: inventoryStats.total_items_in_stock,
        inventory_cost_value: parseFloat(inventoryStats.inventory_cost_value.toFixed(2)),
        inventory_retail_value: parseFloat(inventoryStats.inventory_retail_value.toFixed(2)),
        potential_profit: parseFloat(inventoryStats.potential_profit.toFixed(2)),
        low_stock_count: inventoryStats.low_stock_count,
        out_of_stock_count: inventoryStats.out_of_stock_count
      },
      recentStockLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`MS Store API Server running on http://localhost:${PORT}`);
});
