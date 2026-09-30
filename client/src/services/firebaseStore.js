import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';

const DEFAULT_SETTINGS = {
  shop_name: 'MS Store',
  tagline: 'Smart Retail & Inventory Management',
  phone: '',
  address: '',
  currency_symbol: '₹',
  tax_percentage: 5.0,
  owner_name: '',
  owner_email: '',
  owner_pin: '',
};

function getUid() {
  if (!auth?.currentUser) {
    throw new Error('User not logged in.');
  }
  return auth.currentUser.uid;
}

export const firebaseStore = {
  // Authentication
  async signup({ email, password, name, shop_name, phone }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await updateProfile(user, { displayName: name });

    const userProfile = {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      name,
      shop_name: shop_name || 'MS Store',
      phone: phone || '',
      created_at: new Date().toISOString(),
    };

    // Save profile doc
    await setDoc(doc(firestore, 'users', user.uid), userProfile);

    // Save initial settings
    const initialSettings = {
      ...DEFAULT_SETTINGS,
      shop_name: shop_name || 'MS Store',
      owner_name: name,
      owner_email: email,
      phone: phone || '',
    };
    await setDoc(doc(firestore, 'users', user.uid, 'settings', 'config'), initialSettings);

    return userProfile;
  },

  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const profileSnap = await getDoc(doc(firestore, 'users', user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    return {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      name: profile.name || user.displayName || 'Store Owner',
      shop_name: profile.shop_name || 'MS Store',
      phone: profile.phone || '',
    };
  },

  async logout() {
    await signOut(auth);
    return { success: true };
  },

  async getCurrentUser() {
    if (!auth?.currentUser) return null;
    const user = auth.currentUser;
    const profileSnap = await getDoc(doc(firestore, 'users', user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    return {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      name: profile.name || user.displayName || 'Store Owner',
      shop_name: profile.shop_name || 'MS Store',
      phone: profile.phone || '',
    };
  },

  // Settings
  async getSettings() {
    const uid = getUid();
    const snap = await getDoc(doc(firestore, 'users', uid, 'settings', 'config'));
    if (!snap.exists()) {
      return DEFAULT_SETTINGS;
    }
    return snap.data();
  },

  async updateSettings(newSettings) {
    const uid = getUid();
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings, updated_at: new Date().toISOString() };
    await setDoc(doc(firestore, 'users', uid, 'settings', 'config'), updated);
    return updated;
  },

  // Products
  async getProducts({ search = '', category = 'All', lowStockOnly = false } = {}) {
    const uid = getUid();
    const prodsRef = collection(firestore, 'users', uid, 'products');
    const snap = await getDocs(prodsRef);

    let prods = [];
    snap.forEach((d) => {
      prods.push({ id: d.id, ...d.data() });
    });

    if (search) {
      const q = search.toLowerCase();
      prods = prods.filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }

    if (category && category !== 'All') {
      prods = prods.filter((p) => p.category === category);
    }

    if (lowStockOnly) {
      prods = prods.filter((p) => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5));
    }

    return prods.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async getCategories() {
    const prods = await this.getProducts();
    const set = new Set(prods.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  },

  async createProduct(productData) {
    const uid = getUid();
    const cleanSku = String(productData.sku).trim().toUpperCase();

    // Check unique sku
    const existing = await this.getProducts();
    if (existing.some((p) => (p.sku || '').toUpperCase() === cleanSku)) {
      throw new Error(`Product SKU "${cleanSku}" already exists.`);
    }

    const prodsRef = collection(firestore, 'users', uid, 'products');
    const newDocRef = doc(prodsRef);

    const newProduct = {
      name: productData.name.trim(),
      sku: cleanSku,
      category: productData.category?.trim() || 'General',
      cost_price: parseFloat(productData.cost_price) || 0,
      selling_price: parseFloat(productData.selling_price) || 0,
      stock_quantity: parseInt(productData.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(productData.low_stock_threshold, 10) || 5,
      unit: productData.unit || 'pcs',
      image_emoji: productData.image_emoji || '📦',
      gst_percentage: productData.gst_percentage !== undefined ? parseFloat(productData.gst_percentage) : 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(newDocRef, newProduct);
    return { id: newDocRef.id, ...newProduct };
  },

  async updateProduct(id, productData) {
    const uid = getUid();
    const docRef = doc(firestore, 'users', uid, 'products', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Product not found.');
    }

    const updated = {
      ...productData,
      cost_price: parseFloat(productData.cost_price) || 0,
      selling_price: parseFloat(productData.selling_price) || 0,
      stock_quantity: parseInt(productData.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(productData.low_stock_threshold, 10) || 5,
      gst_percentage: productData.gst_percentage !== undefined ? parseFloat(productData.gst_percentage) : 5.0,
      updated_at: new Date().toISOString(),
    };

    await updateDoc(docRef, updated);
    return { id, ...updated };
  },

  async adjustStock(id, { delta, newStock, note, type }) {
    const uid = getUid();
    const docRef = doc(firestore, 'users', uid, 'products', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Product not found.');

    const current = snap.data();
    let updatedQty;
    if (newStock !== undefined) {
      updatedQty = parseInt(newStock, 10);
    } else if (delta !== undefined) {
      updatedQty = (current.stock_quantity || 0) + parseInt(delta, 10);
    } else {
      throw new Error('Provide delta or newStock.');
    }

    if (updatedQty < 0) throw new Error('Stock quantity cannot be negative.');

    await updateDoc(docRef, {
      stock_quantity: updatedQty,
      updated_at: new Date().toISOString(),
    });

    return { id, ...current, stock_quantity: updatedQty };
  },

  async deleteProduct(id) {
    const uid = getUid();
    await deleteDoc(doc(firestore, 'users', uid, 'products', String(id)));
    return { success: true };
  },

  // Orders & Billing
  async createOrder(orderData) {
    const uid = getUid();
    const {
      customer_name,
      customer_phone,
      items,
      payment_method = 'Cash',
      discount_amount = 0,
    } = orderData;

    if (!items || items.length === 0) {
      throw new Error('Cart is empty. Please add products.');
    }

    const allProducts = await this.getProducts();
    let subtotal = 0;
    let totalCost = 0;
    const verifiedItems = [];

    const batch = writeBatch(firestore);

    for (const item of items) {
      const prod = allProducts.find((p) => p.id === item.productId || p.id === item.id || p.sku === item.sku);
      if (!prod) throw new Error(`Product not found.`);

      const qty = parseInt(item.quantity, 10);
      if (prod.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, requested: ${qty}.`);
      }

      const itemGst = item.gst_percentage !== undefined ? parseFloat(item.gst_percentage) : prod.gst_percentage ?? 5.0;
      const itemSubtotal = prod.selling_price * qty;
      const itemCost = prod.cost_price * qty;
      const itemProfit = itemSubtotal - itemCost;

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

      // Deduct stock in batch
      const prodRef = doc(firestore, 'users', uid, 'products', prod.id);
      batch.update(prodRef, {
        stock_quantity: prod.stock_quantity - qty,
        updated_at: new Date().toISOString(),
      });
    }

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
    const ordersSnap = await getDocs(collection(firestore, 'users', uid, 'orders'));
    const invoiceNo = `INV-${dateStr}-${String(ordersSnap.size + 1).padStart(4, '0')}`;

    const orderRef = doc(collection(firestore, 'users', uid, 'orders'));
    const newOrder = {
      id: orderRef.id,
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

    batch.set(orderRef, newOrder);
    await batch.commit();

    return newOrder;
  },

  async getOrders({ limit = 100, offset = 0 } = {}) {
    const uid = getUid();
    const ordersRef = collection(firestore, 'users', uid, 'orders');
    const snap = await getDocs(ordersRef);

    const orders = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...d.data(), total_items: d.data().items?.length || 1 });
    });

    return orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
  },

  async getOrderById(id) {
    const uid = getUid();
    const snap = await getDoc(doc(firestore, 'users', uid, 'orders', String(id)));
    if (!snap.exists()) {
      // Try search by invoice_no
      const orders = await this.getOrders();
      const found = orders.find((o) => o.invoice_no === id || o.id === id);
      if (!found) throw new Error('Order not found.');
      return found;
    }
    return { id: snap.id, ...snap.data() };
  },

  // Reset current account data
  async clearAllData() {
    const uid = getUid();
    const prodsSnap = await getDocs(collection(firestore, 'users', uid, 'products'));
    const ordersSnap = await getDocs(collection(firestore, 'users', uid, 'orders'));

    const batch = writeBatch(firestore);
    prodsSnap.forEach((d) => batch.delete(d.ref));
    ordersSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    return { success: true };
  },

  // Reporting Engine in Firestore
  async getPnL(params = {}) {
    const orders = await this.getOrders({ limit: 1000 });
    const prods = await this.getProducts();
    const now = new Date();

    const mode = typeof params === 'string' ? params : (params.mode || 'all');
    let filteredOrders = orders;
    let reportTitle = 'All Time Summary';

    if (mode === 'calendar' && params.date) {
      filteredOrders = orders.filter((o) => o.created_at?.slice(0, 10) === params.date);
      reportTitle = `Daily Report for ${params.date}`;
    } else if (mode === 'month' && params.month) {
      filteredOrders = orders.filter((o) => o.created_at?.slice(0, 7) === params.month);
      reportTitle = `Monthly Report for ${params.month}`;
    } else if (mode === 'year' && params.year) {
      filteredOrders = orders.filter((o) => o.created_at?.slice(0, 4) === String(params.year));
      reportTitle = `Annual Report for ${params.year}`;
    } else if (mode === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      filteredOrders = orders.filter((o) => o.created_at?.slice(0, 10) === todayStr);
      reportTitle = `Today's Daily Report`;
    } else if (mode === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      filteredOrders = orders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
      reportTitle = `Last 7 Days Report`;
    }

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const grossSales = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0);
    const totalTax = filteredOrders.reduce((sum, o) => sum + (o.tax_amount || 0), 0);
    const totalCost = filteredOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
    const netProfit = filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const profitMargin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Daily breakdown for trend
    const dailyMap = {};
    for (const o of filteredOrders) {
      const dateKey = o.created_at ? o.created_at.slice(0, 10) : '';
      if (!dateKey) continue;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, order_count: 0, daily_revenue: 0, daily_cost: 0, daily_profit: 0 };
      }
      dailyMap[dateKey].order_count += 1;
      dailyMap[dateKey].daily_revenue += o.total_amount || 0;
      dailyMap[dateKey].daily_cost += o.total_cost || 0;
      dailyMap[dateKey].daily_profit += o.profit || 0;
    }
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 1-Year Monthly Breakdown (Jan through Dec)
    const targetYear = params.year || now.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const annualMonthlyBreakdown = months.map((mName, mIdx) => {
      const monthPrefix = `${targetYear}-${String(mIdx + 1).padStart(2, '0')}`;
      const mOrders = orders.filter((o) => o.created_at?.slice(0, 7) === monthPrefix);
      const mRevenue = mOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const mCost = mOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
      const mProfit = mOrders.reduce((s, o) => s + (o.profit || 0), 0);
      const mMargin = mRevenue > 0 ? parseFloat(((mProfit / mRevenue) * 100).toFixed(1)) : 0;

      return {
        month: mName,
        monthKey: monthPrefix,
        orders_count: mOrders.length,
        revenue: parseFloat(mRevenue.toFixed(2)),
        cost: parseFloat(mCost.toFixed(2)),
        profit: parseFloat(mProfit.toFixed(2)),
        margin: mMargin,
      };
    });

    // Top profitable products
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
      .slice(0, 8);

    const totalStock = prods.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    const costVal = prods.reduce((sum, p) => sum + (p.cost_price || 0) * (p.stock_quantity || 0), 0);
    const retailVal = prods.reduce((sum, p) => sum + (p.selling_price || 0) * (p.stock_quantity || 0), 0);

    return {
      title: reportTitle,
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
      annualMonthlyBreakdown,
      topProfitable,
      orders: filteredOrders,
      inventoryStats: {
        total_product_types: prods.length,
        total_items_in_stock: totalStock,
        inventory_cost_value: parseFloat(costVal.toFixed(2)),
        inventory_retail_value: parseFloat(retailVal.toFixed(2)),
        potential_profit: parseFloat((retailVal - costVal).toFixed(2)),
        low_stock_count: prods.filter((p) => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5) && (p.stock_quantity || 0) > 0).length,
        out_of_stock_count: prods.filter((p) => (p.stock_quantity || 0) === 0).length,
      },
    };
  },
};
