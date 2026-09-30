// Client-side persistent storage engine for Netlify deployments and offline mode
const STORAGE_KEYS = {
  SETTINGS: 'ms_store_settings',
  PRODUCTS: 'ms_store_products',
  ORDERS: 'ms_store_orders',
  STOCK_LOGS: 'ms_store_stock_logs',
};

const DEFAULT_SETTINGS = {
  id: 1,
  shop_name: 'MS Store',
  tagline: 'Smart Retail & Inventory Management',
  phone: '+91 98765 43210',
  address: '124 Market Road, Commercial Hub',
  currency_symbol: '₹',
  tax_percentage: 5.0,
};

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Wireless Optical Mouse', sku: 'ELEC-001', category: 'Electronics', cost_price: 250, selling_price: 499, stock_quantity: 28, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🖱️' },
  { id: 2, name: 'USB-C Fast Charging Cable', sku: 'ELEC-002', category: 'Electronics', cost_price: 120, selling_price: 299, stock_quantity: 45, low_stock_threshold: 10, unit: 'pcs', image_emoji: '🔌' },
  { id: 3, name: 'Wireless Mechanical Keyboard', sku: 'ELEC-003', category: 'Electronics', cost_price: 1400, selling_price: 2499, stock_quantity: 4, low_stock_threshold: 5, unit: 'pcs', image_emoji: '⌨️' },
  { id: 4, name: 'Bluetooth Speaker 10W', sku: 'ELEC-004', category: 'Electronics', cost_price: 750, selling_price: 1399, stock_quantity: 9, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🔊' },
  { id: 5, name: 'Organic Green Tea 100g', sku: 'GROC-001', category: 'Beverages', cost_price: 110, selling_price: 185, stock_quantity: 22, low_stock_threshold: 8, unit: 'box', image_emoji: '🍵' },
  { id: 6, name: 'Almond Milk 1L', sku: 'GROC-002', category: 'Beverages', cost_price: 135, selling_price: 210, stock_quantity: 3, low_stock_threshold: 6, unit: 'bottle', image_emoji: '🥛' },
  { id: 7, name: 'Premium Basmati Rice 5kg', sku: 'GROC-003', category: 'Groceries', cost_price: 360, selling_price: 495, stock_quantity: 15, low_stock_threshold: 5, unit: 'bag', image_emoji: '🍚' },
  { id: 8, name: 'Raw Natural Honey 500g', sku: 'GROC-004', category: 'Groceries', cost_price: 175, selling_price: 280, stock_quantity: 18, low_stock_threshold: 5, unit: 'jar', image_emoji: '🍯' },
  { id: 9, name: 'Stainless Steel Water Bottle 1L', sku: 'HOME-001', category: 'Lifestyle', cost_price: 190, selling_price: 380, stock_quantity: 14, low_stock_threshold: 5, unit: 'pcs', image_emoji: '🧴' },
  { id: 10, name: 'LED Desk Lamp Adjustable', sku: 'HOME-002', category: 'Lifestyle', cost_price: 320, selling_price: 620, stock_quantity: 12, low_stock_threshold: 4, unit: 'pcs', image_emoji: '💡' },
  { id: 11, name: 'A5 Hardcover Journal Notebook', sku: 'STAT-001', category: 'Stationery', cost_price: 65, selling_price: 140, stock_quantity: 48, low_stock_threshold: 10, unit: 'pcs', image_emoji: '📓' },
  { id: 12, name: 'Luxury Gel Pen 0.5mm Pack', sku: 'STAT-002', category: 'Stationery', cost_price: 45, selling_price: 99, stock_quantity: 60, low_stock_threshold: 15, unit: 'pack', image_emoji: '🖊️' },
];

const DEFAULT_ORDERS = [
  {
    id: 1,
    invoice_no: 'INV-1001',
    customer_name: 'Rahul Sharma',
    customer_phone: '9876501234',
    subtotal: 1097,
    discount_amount: 20,
    tax_amount: 53.85,
    total_amount: 1130.85,
    total_cost: 490,
    profit: 587,
    payment_method: 'UPI',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      { product_name: 'Wireless Optical Mouse', sku: 'ELEC-001', cost_price: 250, selling_price: 499, quantity: 1, subtotal: 499, profit: 249 },
      { product_name: 'USB-C Fast Charging Cable', sku: 'ELEC-002', cost_price: 120, selling_price: 299, quantity: 2, subtotal: 598, profit: 358 }
    ]
  },
  {
    id: 2,
    invoice_no: 'INV-1002',
    customer_name: 'Priya Patel',
    customer_phone: '9822334455',
    subtotal: 1270,
    discount_amount: 50,
    tax_amount: 61,
    total_amount: 1281,
    total_cost: 895,
    profit: 325,
    payment_method: 'Card',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { product_name: 'Premium Basmati Rice 5kg', sku: 'GROC-003', cost_price: 360, selling_price: 495, quantity: 2, subtotal: 990, profit: 270 },
      { product_name: 'Raw Natural Honey 500g', sku: 'GROC-004', cost_price: 175, selling_price: 280, quantity: 1, subtotal: 280, profit: 105 }
    ]
  }
];

function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export const localStore = {
  getSettings() {
    return getStored(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  getProducts({ search = '', category = 'All', lowStockOnly = false } = {}) {
    let prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);

    if (search) {
      const q = search.toLowerCase();
      prods = prods.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    if (category && category !== 'All') {
      prods = prods.filter((p) => p.category === category);
    }

    if (lowStockOnly) {
      prods = prods.filter((p) => p.stock_quantity <= p.low_stock_threshold);
    }

    return prods.sort((a, b) => a.name.localeCompare(b.name));
  },

  getCategories() {
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const set = new Set(prods.map((p) => p.category));
    return Array.from(set).sort();
  },

  createProduct(productData) {
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const cleanSku = String(productData.sku).trim().toUpperCase();

    if (prods.some((p) => p.sku.toUpperCase() === cleanSku)) {
      throw new Error(`Product SKU "${cleanSku}" already exists.`);
    }

    const newId = prods.length > 0 ? Math.max(...prods.map((p) => p.id || 0)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: productData.name.trim(),
      sku: cleanSku,
      category: productData.category?.trim() || 'General',
      cost_price: parseFloat(productData.cost_price) || 0,
      selling_price: parseFloat(productData.selling_price) || 0,
      stock_quantity: parseInt(productData.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(productData.low_stock_threshold, 10) || 5,
      unit: productData.unit || 'pcs',
      image_emoji: productData.image_emoji || '📦',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    prods.push(newProduct);
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return newProduct;
  },

  updateProduct(id, productData) {
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const index = prods.findIndex((p) => p.id === Number(id));
    if (index === -1) throw new Error('Product not found.');

    const cleanSku = productData.sku ? String(productData.sku).trim().toUpperCase() : prods[index].sku;
    if (cleanSku !== prods[index].sku && prods.some((p) => p.sku.toUpperCase() === cleanSku && p.id !== Number(id))) {
      throw new Error(`SKU "${cleanSku}" is already taken.`);
    }

    const updated = {
      ...prods[index],
      ...productData,
      sku: cleanSku,
      cost_price: productData.cost_price !== undefined ? parseFloat(productData.cost_price) : prods[index].cost_price,
      selling_price: productData.selling_price !== undefined ? parseFloat(productData.selling_price) : prods[index].selling_price,
      stock_quantity: productData.stock_quantity !== undefined ? parseInt(productData.stock_quantity, 10) : prods[index].stock_quantity,
      low_stock_threshold: productData.low_stock_threshold !== undefined ? parseInt(productData.low_stock_threshold, 10) : prods[index].low_stock_threshold,
      updated_at: new Date().toISOString(),
    };

    prods[index] = updated;
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return updated;
  },

  adjustStock(id, { delta, newStock, note, type }) {
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const index = prods.findIndex((p) => p.id === Number(id));
    if (index === -1) throw new Error('Product not found.');

    const prod = prods[index];
    let updatedQty;
    if (delta !== undefined) {
      updatedQty = prod.stock_quantity + parseInt(delta, 10);
    } else if (newStock !== undefined) {
      updatedQty = parseInt(newStock, 10);
    } else {
      throw new Error('Provide delta or newStock.');
    }

    if (updatedQty < 0) throw new Error('Stock quantity cannot be negative.');

    prod.stock_quantity = updatedQty;
    prod.updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return prod;
  },

  deleteProduct(id) {
    let prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const target = prods.find((p) => p.id === Number(id));
    if (!target) throw new Error('Product not found.');

    prods = prods.filter((p) => p.id !== Number(id));
    setStored(STORAGE_KEYS.PRODUCTS, prods);
    return { message: 'Product deleted', product: target };
  },

  createOrder({ items, customer_name, customer_phone, discount_amount = 0, tax_percentage, payment_method = 'Cash' }) {
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const settings = this.getSettings();
    const effectiveTaxRate = (tax_percentage !== undefined ? parseFloat(tax_percentage) : settings.tax_percentage) / 100;

    let subtotal = 0;
    let totalCost = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prod = prods.find((p) => p.id === Number(item.id));
      if (!prod) throw new Error(`Product not found: ID ${item.id}`);

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) throw new Error(`Invalid quantity for ${prod.name}`);
      if (prod.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qty}`);
      }

      const itemSubtotal = prod.selling_price * qty;
      const itemCost = prod.cost_price * qty;
      const itemProfit = (prod.selling_price - prod.cost_price) * qty;

      const itemGst = item.gst_percentage !== undefined
        ? parseFloat(item.gst_percentage)
        : (prod.gst_percentage !== undefined ? parseFloat(prod.gst_percentage) : (effectiveTaxRate * 100));

      subtotal += itemSubtotal;
      totalCost += itemCost;

      verifiedItems.push({
        product: prod,
        quantity: qty,
        selling_price: prod.selling_price,
        cost_price: prod.cost_price,
        subtotal: itemSubtotal,
        profit: itemProfit,
        gst_percentage: isNaN(itemGst) ? 0 : itemGst,
      });

      // Deduct stock
      prod.stock_quantity -= qty;
      prod.updated_at = new Date().toISOString();
    }

    setStored(STORAGE_KEYS.PRODUCTS, prods);

    const discount = Math.min(subtotal, Math.max(0, parseFloat(discount_amount) || 0));
    const discountRatio = subtotal > 0 ? (subtotal - discount) / subtotal : 1;

    let totalTaxAmount = 0;
    for (const vItem of verifiedItems) {
      const itemTaxable = vItem.subtotal * discountRatio;
      vItem.tax_amount = parseFloat((itemTaxable * (vItem.gst_percentage / 100)).toFixed(2));
      totalTaxAmount += vItem.tax_amount;
    }
    totalTaxAmount = parseFloat(totalTaxAmount.toFixed(2));

    const taxable = Math.max(0, subtotal - discount);
    const totalAmount = parseFloat((taxable + totalTaxAmount).toFixed(2));
    const netProfit = parseFloat((taxable - totalCost).toFixed(2));

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orders = getStored(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
    const invoiceNo = `INV-${dateStr}-${String(orders.length + 1).padStart(4, '0')}`;

    const newOrder = {
      id: orders.length > 0 ? Math.max(...orders.map((o) => o.id || 0)) + 1 : 1,
      invoice_no: invoiceNo,
      invoiceNo,
      customer_name: customer_name ? customer_name.trim() : 'Walk-in Customer',
      customer_phone: customer_phone ? customer_phone.trim() : '',
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_amount: discount,
      tax_amount: totalTaxAmount,
      total_amount: totalAmount,
      total_cost: parseFloat(totalCost.toFixed(2)),
      profit: netProfit,
      payment_method,
      status: 'Completed',
      created_at: new Date().toISOString(),
      items: verifiedItems.map((vi) => ({
        name: vi.product.name,
        product_name: vi.product.name,
        sku: vi.product.sku,
        quantity: vi.quantity,
        selling_price: vi.selling_price,
        cost_price: vi.cost_price,
        subtotal: vi.subtotal,
        gst_percentage: vi.gst_percentage,
        tax_amount: vi.tax_amount,
        profit: vi.profit,
      })),
    };

    orders.unshift(newOrder);
    setStored(STORAGE_KEYS.ORDERS, orders);
    return newOrder;
  },

  getOrders({ limit = 50, offset = 0 } = {}) {
    const orders = getStored(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
    return orders.slice(offset, offset + limit).map((o) => ({
      ...o,
      total_items: o.items?.length || 1,
    }));
  },

  getOrderById(id) {
    const orders = getStored(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
    const found = orders.find((o) => o.id === Number(id) || o.invoice_no === id);
    if (!found) throw new Error('Order not found.');
    return found;
  },

  getPnL(range = 'all') {
    const orders = getStored(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
    const prods = getStored(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);

    let filteredOrders = orders;
    const now = new Date();

    if (range === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      filteredOrders = orders.filter((o) => o.created_at.slice(0, 10) === todayStr);
    } else if (range === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      filteredOrders = orders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
    } else if (range === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      filteredOrders = orders.filter((o) => new Date(o.created_at) >= thirtyDaysAgo);
    }

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const grossSales = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0);
    const totalTax = filteredOrders.reduce((sum, o) => sum + (o.tax_amount || 0), 0);
    const totalCost = filteredOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
    const netProfit = filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const profitMargin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Daily trend
    const dailyMap = {};
    for (const o of filteredOrders) {
      const dateKey = o.created_at.slice(0, 10);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, order_count: 0, daily_revenue: 0, daily_cost: 0, daily_profit: 0 };
      }
      dailyMap[dateKey].order_count += 1;
      dailyMap[dateKey].daily_revenue += o.total_amount || 0;
      dailyMap[dateKey].daily_cost += o.total_cost || 0;
      dailyMap[dateKey].daily_profit += o.profit || 0;
    }
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top profitable
    const itemMap = {};
    for (const o of filteredOrders) {
      for (const item of o.items || []) {
        const key = item.sku || item.name;
        if (!itemMap[key]) {
          itemMap[key] = { product_name: item.name || item.product_name, sku: item.sku, units_sold: 0, total_sales: 0, total_profit: 0 };
        }
        itemMap[key].units_sold += item.quantity || 1;
        itemMap[key].total_sales += item.subtotal || 0;
        itemMap[key].total_profit += item.profit || 0;
      }
    }
    const topProfitable = Object.values(itemMap)
      .sort((a, b) => b.total_profit - a.total_profit)
      .slice(0, 6);

    const totalStock = prods.reduce((sum, p) => sum + p.stock_quantity, 0);
    const costVal = prods.reduce((sum, p) => sum + p.cost_price * p.stock_quantity, 0);
    const retailVal = prods.reduce((sum, p) => sum + p.selling_price * p.stock_quantity, 0);

    return {
      summary: {
        total_orders: totalOrders,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        gross_sales: parseFloat(grossSales.toFixed(2)),
        total_discounts: parseFloat(totalDiscounts.toFixed(2)),
        total_tax: parseFloat(totalTax.toFixed(2)),
        total_cost: parseFloat(totalCost.toFixed(2)),
        net_profit: parseFloat(netProfit.toFixed(2)),
        profit_margin: profitMargin,
        is_profit: netProfit >= 0,
      },
      dailyTrend,
      topProfitable,
      inventoryStats: {
        total_product_types: prods.length,
        total_items_in_stock: totalStock,
        inventory_cost_value: parseFloat(costVal.toFixed(2)),
        inventory_retail_value: parseFloat(retailVal.toFixed(2)),
        potential_profit: parseFloat((retailVal - costVal).toFixed(2)),
        low_stock_count: prods.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length,
        out_of_stock_count: prods.filter((p) => p.stock_quantity === 0).length,
      },
      recentStockLogs: [],
    };
  },
};
