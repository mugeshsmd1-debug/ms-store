require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to extract user email
function getUserEmail(req) {
  return (req.headers['x-user-email'] || req.query.email || '').trim().toLowerCase();
}

// Health check and root endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MS Store Backend on Supabase',
    version: '1.0.0',
    provider: 'Supabase PostgreSQL',
    time: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MS Store API on Supabase',
    version: '1.0.0',
    provider: 'Supabase PostgreSQL',
  });
});

// ---------------------------------------------
// SETTINGS ENDPOINTS
// ---------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const email = getUserEmail(req) || 'default';
    const { data, error } = await supabase.from('settings').select('*').eq('user_email', email).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      return res.json({ ...data, tax_percentage: parseFloat(data.tax_percentage) || 5.0 });
    }

    const defaultSettings = {
      user_email: email,
      shop_name: 'MS Store',
      tagline: 'Smart Retail & Inventory Management',
      phone: '',
      address: '',
      currency_symbol: '₹',
      tax_percentage: 5.0,
      owner_name: '',
      owner_email: email,
      owner_pin: '',
    };

    if (getUserEmail(req)) {
      const { data: created } = await supabase.from('settings').insert(defaultSettings).select().single();
      if (created) return res.json({ ...created, tax_percentage: parseFloat(created.tax_percentage) || 5.0 });
    }

    res.json(defaultSettings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const body = req.body;
    const { data, error } = await supabase
      .from('settings')
      .upsert(
        {
          user_email: userEmail,
          shop_name: body.shop_name,
          tagline: body.tagline,
          phone: body.phone,
          address: body.address,
          currency_symbol: body.currency_symbol || '₹',
          tax_percentage: parseFloat(body.tax_percentage) || 0,
          owner_name: body.owner_name,
          owner_email: body.owner_email || userEmail,
          owner_pin: body.owner_pin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ ...data, tax_percentage: parseFloat(data.tax_percentage) || 5.0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// PRODUCTS ENDPOINTS
// ---------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.json([]);

    let query = supabase.from('products').select('*').eq('user_email', userEmail);
    const { search, category, lowStockOnly } = req.query;

    if (search) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    let list = (data || []).map((p) => ({
      ...p,
      cost_price: parseFloat(p.cost_price),
      selling_price: parseFloat(p.selling_price),
      gst_percentage: parseFloat(p.gst_percentage),
    }));

    if (lowStockOnly === 'true') {
      list = list.filter((p) => p.stock_quantity <= p.low_stock_threshold);
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.json([]);

    const { data, error } = await supabase.from('products').select('category').eq('user_email', userEmail);
    if (error) throw error;

    const set = new Set((data || []).map((r) => r.category).filter(Boolean));
    res.json(Array.from(set).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const { name, sku, category, cost_price, selling_price, stock_quantity, low_stock_threshold, unit, image_emoji, gst_percentage } = req.body;
    const cleanSku = String(sku || '').trim().toUpperCase();

    if (!name || !cleanSku) {
      return res.status(400).json({ error: 'Name and SKU are required.' });
    }

    const initialStock = parseInt(stock_quantity, 10) || 0;
    const threshold = parseInt(low_stock_threshold, 10) || 5;
    const gstPct = gst_percentage !== undefined ? parseFloat(gst_percentage) : 5.0;

    const { data: newProd, error } = await supabase
      .from('products')
      .insert({
        user_email: userEmail,
        name: name.trim(),
        sku: cleanSku,
        category: (category || 'General').trim(),
        cost_price: parseFloat(cost_price) || 0,
        selling_price: parseFloat(selling_price) || 0,
        stock_quantity: initialStock,
        low_stock_threshold: threshold,
        unit: unit || 'pcs',
        image_emoji: image_emoji || '📦',
        gst_percentage: gstPct,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: `Product SKU "${cleanSku}" already exists.` });
      }
      throw error;
    }

    if (initialStock > 0) {
      await supabase.from('stock_logs').insert({
        user_email: userEmail,
        product_id: newProd.id,
        type: 'INITIAL',
        quantity_change: initialStock,
        quantity_after: initialStock,
        note: 'Initial inventory stock',
      });
    }

    res.status(201).json({
      ...newProd,
      cost_price: parseFloat(newProd.cost_price),
      selling_price: parseFloat(newProd.selling_price),
      gst_percentage: parseFloat(newProd.gst_percentage),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const id = parseInt(req.params.id, 10);
    const body = req.body;

    const { data: current, error: getErr } = await supabase.from('products').select('*').eq('id', id).eq('user_email', userEmail).single();
    if (getErr || !current) return res.status(404).json({ error: 'Product not found.' });

    const cleanSku = body.sku ? String(body.sku).trim().toUpperCase() : current.sku;
    const newStock = body.stock_quantity !== undefined ? parseInt(body.stock_quantity, 10) : current.stock_quantity;
    const stockDiff = newStock - current.stock_quantity;

    const updatePayload = { sku: cleanSku, updated_at: new Date().toISOString() };
    if (body.name !== undefined) updatePayload.name = body.name.trim();
    if (body.category !== undefined) updatePayload.category = body.category.trim();
    if (body.cost_price !== undefined) updatePayload.cost_price = parseFloat(body.cost_price);
    if (body.selling_price !== undefined) updatePayload.selling_price = parseFloat(body.selling_price);
    if (body.stock_quantity !== undefined) updatePayload.stock_quantity = newStock;
    if (body.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = parseInt(body.low_stock_threshold, 10);
    if (body.unit !== undefined) updatePayload.unit = body.unit;
    if (body.image_emoji !== undefined) updatePayload.image_emoji = body.image_emoji;
    if (body.gst_percentage !== undefined) updatePayload.gst_percentage = parseFloat(body.gst_percentage);

    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.code === '23505') {
        return res.status(400).json({ error: `SKU "${cleanSku}" is already taken.` });
      }
      throw updateErr;
    }

    if (stockDiff !== 0) {
      await supabase.from('stock_logs').insert({
        user_email: userEmail,
        product_id: id,
        type: 'ADJUSTMENT',
        quantity_change: stockDiff,
        quantity_after: newStock,
        note: 'Manual stock edit',
      });
    }

    res.json({
      ...updated,
      cost_price: parseFloat(updated.cost_price),
      selling_price: parseFloat(updated.selling_price),
      gst_percentage: parseFloat(updated.gst_percentage),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const id = parseInt(req.params.id, 10);
    const { delta, newStock, note, type } = req.body;

    const { data: product, error: getErr } = await supabase.from('products').select('*').eq('id', id).eq('user_email', userEmail).single();
    if (getErr || !product) return res.status(404).json({ error: 'Product not found.' });

    let updatedQty;
    let change;

    if (delta !== undefined) {
      change = parseInt(delta, 10);
      updatedQty = product.stock_quantity + change;
    } else if (newStock !== undefined) {
      updatedQty = parseInt(newStock, 10);
      change = updatedQty - product.stock_quantity;
    } else {
      return res.status(400).json({ error: 'Provide delta or newStock.' });
    }

    if (updatedQty < 0) return res.status(400).json({ error: 'Stock quantity cannot be negative.' });

    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update({ stock_quantity: updatedQty, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const logType = type || (change > 0 ? 'RESTOCK' : 'ADJUSTMENT');
    await supabase.from('stock_logs').insert({
      user_email: userEmail,
      product_id: id,
      type: logType,
      quantity_change: change,
      quantity_after: updatedQty,
      note: note || `Quick stock ${change >= 0 ? '+' + change : change}`,
    });

    res.json({
      ...updated,
      cost_price: parseFloat(updated.cost_price),
      selling_price: parseFloat(updated.selling_price),
      gst_percentage: parseFloat(updated.gst_percentage),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const id = parseInt(req.params.id, 10);
    const { data, error } = await supabase.from('products').delete().eq('id', id).eq('user_email', userEmail).select().single();
    if (error) throw error;
    res.json({ message: 'Product deleted successfully.', product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// ORDERS / BILLING ENDPOINTS
// ---------------------------------------------
app.post('/api/orders', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const { items, customer_name, customer_phone, discount_amount = 0, tax_percentage, payment_method = 'Cash' } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Add items to create a bill.' });
    }

    const { data: settings } = await supabase.from('settings').select('*').eq('user_email', userEmail).maybeSingle();
    const effectiveTaxRate = (tax_percentage !== undefined ? parseFloat(tax_percentage) : (settings?.tax_percentage || 5.0)) / 100;

    const itemIds = items.map((i) => i.id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .in('id', itemIds)
      .eq('user_email', userEmail);

    if (prodErr) throw prodErr;
    const productMap = new Map((dbProducts || []).map((p) => [p.id, p]));

    let subtotal = 0;
    let totalCost = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prod = productMap.get(item.id);
      if (!prod) return res.status(400).json({ error: `Product not found (ID: ${item.id})` });

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) return res.status(400).json({ error: `Invalid quantity for ${prod.name}` });
      if (prod.stock_quantity < qty) {
        return res.status(400).json({ error: `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qty}` });
      }

      const sellingPrice = parseFloat(prod.selling_price);
      const costPrice = parseFloat(prod.cost_price);
      const itemSubtotal = sellingPrice * qty;
      const itemCost = costPrice * qty;
      const itemProfit = (sellingPrice - costPrice) * qty;

      const itemGst = item.gst_percentage !== undefined
        ? parseFloat(item.gst_percentage)
        : (prod.gst_percentage !== undefined ? parseFloat(prod.gst_percentage) : (effectiveTaxRate * 100));

      subtotal += itemSubtotal;
      totalCost += itemCost;

      verifiedItems.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        selling_price: sellingPrice,
        cost_price: costPrice,
        quantity: qty,
        subtotal: itemSubtotal,
        profit: itemProfit,
        gst_percentage: isNaN(itemGst) ? 0 : itemGst,
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
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .ilike('invoice_no', `INV-${dateStr}%`);

    const nextSeq = (count || 0) + 1;
    const invoiceNo = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_order_checkout', {
      p_user_email: userEmail,
      p_customer_name: customer_name ? customer_name.trim() : 'Walk-in Customer',
      p_customer_phone: customer_phone ? customer_phone.trim() : '',
      p_subtotal: parseFloat(subtotal.toFixed(2)),
      p_discount_amount: discount,
      p_tax_amount: totalTaxAmount,
      p_total_amount: totalAmount,
      p_total_cost: parseFloat(totalCost.toFixed(2)),
      p_profit: netProfit,
      p_payment_method: payment_method || 'Cash',
      p_invoice_no: invoiceNo,
      p_items: verifiedItems,
    });

    if (rpcErr) throw rpcErr;

    res.status(201).json({
      orderId: rpcRes?.orderId,
      invoiceNo,
      invoice_no: invoiceNo,
      customer_name: customer_name || 'Walk-in Customer',
      customer_phone: customer_phone || '',
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_amount: discount,
      tax_amount: totalTaxAmount,
      total_amount: totalAmount,
      total_cost: parseFloat(totalCost.toFixed(2)),
      profit: netProfit,
      payment_method: payment_method || 'Cash',
      created_at: new Date().toISOString(),
      items: verifiedItems.map((vi) => ({
        name: vi.name,
        product_name: vi.name,
        sku: vi.sku,
        quantity: vi.quantity,
        selling_price: vi.selling_price,
        cost_price: vi.cost_price,
        subtotal: vi.subtotal,
        gst_percentage: vi.gst_percentage,
        tax_amount: vi.tax_amount,
        profit: vi.profit,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.json([]);

    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(count)')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json((data || []).map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discount_amount: parseFloat(o.discount_amount),
      tax_amount: parseFloat(o.tax_amount),
      total_amount: parseFloat(o.total_amount),
      total_cost: parseFloat(o.total_cost),
      profit: parseFloat(o.profit),
      total_items: o.order_items?.[0]?.count || 1,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const idOrInv = req.params.id;
    let query = supabase.from('orders').select('*').eq('user_email', userEmail);
    if (!isNaN(Number(idOrInv)) && !idOrInv.startsWith('INV-')) {
      query = query.eq('id', parseInt(idOrInv, 10));
    } else {
      query = query.eq('invoice_no', idOrInv);
    }

    const { data: order, error } = await query.single();
    if (error || !order) return res.status(404).json({ error: 'Order not found.' });

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsErr) throw itemsErr;

    res.json({
      ...order,
      subtotal: parseFloat(order.subtotal),
      discount_amount: parseFloat(order.discount_amount),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount),
      total_cost: parseFloat(order.total_cost),
      profit: parseFloat(order.profit),
      items: (items || []).map((i) => ({
        ...i,
        name: i.product_name,
        cost_price: parseFloat(i.cost_price),
        selling_price: parseFloat(i.selling_price),
        subtotal: parseFloat(i.subtotal),
        gst_percentage: parseFloat(i.gst_percentage),
        tax_amount: parseFloat(i.tax_amount),
        profit: parseFloat(i.profit),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all bill history alone
// Delete all bill history alone
app.delete(['/api/orders', '/api/orders/clear'], async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    const password = req.headers['x-auth-password'] || req.body?.password || req.query?.password || '';
    if (!password) {
      return res.status(401).json({ error: 'Account password is required to delete bill history.' });
    }

    const { data: userRec, error: userErr } = await supabase.from('users').select('password').eq('email', userEmail).maybeSingle();
    if (userErr || !userRec) return res.status(404).json({ error: 'User account not found.' });
    if (userRec.password !== password.trim()) {
      return res.status(403).json({ error: 'Incorrect account password. Bill history was not deleted.' });
    }

    const { error: delErr } = await supabase.from('orders').delete().eq('user_email', userEmail);
    if (delErr) throw delErr;
    await supabase.from('stock_logs').delete().eq('user_email', userEmail).eq('type', 'SALE');
    res.json({ success: true, message: 'All bill history and sales transactions cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete single bill / order with password verification
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });
    const idOrInv = req.params.id;

    const password = req.headers['x-auth-password'] || req.body?.password || req.query?.password || '';
    if (!password) {
      return res.status(401).json({ error: 'Account password is required to delete this invoice.' });
    }

    const { data: userRec, error: userErr } = await supabase.from('users').select('password').eq('email', userEmail).maybeSingle();
    if (userErr || !userRec) return res.status(404).json({ error: 'User account not found.' });
    if (userRec.password !== password.trim()) {
      return res.status(403).json({ error: 'Incorrect account password. Invoice was not deleted.' });
    }

    let query = supabase.from('orders').select('*').eq('user_email', userEmail);
    if (!isNaN(Number(idOrInv)) && !idOrInv.startsWith('INV-')) {
      query = query.eq('id', parseInt(idOrInv, 10));
    } else {
      query = query.eq('invoice_no', idOrInv);
    }
    const { data: orderToDel } = await query.maybeSingle();
    if (!orderToDel) return res.status(404).json({ error: `Invoice ${idOrInv} not found.` });

    // Restore inventory stock
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderToDel.id);
    for (const it of orderItems || []) {
      if (it.product_id && it.quantity > 0) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', it.product_id).maybeSingle();
        if (p) {
          const restored = p.stock_quantity + it.quantity;
          await supabase.from('products').update({ stock_quantity: restored }).eq('id', it.product_id);
          await supabase.from('stock_logs').insert({
            user_email: userEmail,
            product_id: it.product_id,
            type: 'RESTOCK',
            quantity_change: it.quantity,
            quantity_after: restored,
            note: `Restored stock from deleted invoice ${orderToDel.invoice_no}`
          });
        }
      }
    }

    const { error: delErr } = await supabase.from('orders').delete().eq('id', orderToDel.id);
    if (delErr) throw delErr;

    await supabase.from('stock_logs').delete().eq('user_email', userEmail).ilike('note', `%${orderToDel.invoice_no}%`);
    res.json({ success: true, message: `Invoice ${orderToDel.invoice_no} deleted successfully and inventory stock restored.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// PROFIT & LOSS (PnL) ANALYTICS ENDPOINT
// ---------------------------------------------
app.get('/api/analytics/pnl', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) {
      return res.json({
        title: 'All Time Financial Summary',
        summary: { total_orders: 0, total_revenue: 0, gross_sales: 0, total_discounts: 0, total_tax: 0, total_cost: 0, net_profit: 0, profit_margin: 0, is_profit: true },
        dailyTrend: [],
        annualMonthlyBreakdown: [],
        topProfitable: [],
        orders: [],
        inventoryStats: { total_product_types: 0, total_items_in_stock: 0, inventory_cost_value: 0, inventory_retail_value: 0, potential_profit: 0, low_stock_count: 0, out_of_stock_count: 0 },
      });
    }

    const { mode = 'all', range = 'all', date: selectedDate, month: selectedMonth, year: selectedYear } = req.query;
    const effectiveMode = mode !== 'all' ? mode : range;

    const { data: allOrders, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (orderErr) throw orderErr;

    const { data: allProducts, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('user_email', userEmail);

    if (prodErr) throw prodErr;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let filteredOrders = allOrders || [];
    let reportTitle = 'All Time Financial Summary';

    if (effectiveMode === 'calendar' && selectedDate) {
      filteredOrders = filteredOrders.filter((o) => o.created_at.slice(0, 10) === selectedDate);
      reportTitle = `Daily Report for ${selectedDate}`;
    } else if (effectiveMode === 'month' && selectedMonth) {
      filteredOrders = filteredOrders.filter((o) => o.created_at.slice(0, 7) === selectedMonth);
      reportTitle = `Monthly Report for ${selectedMonth}`;
    } else if (effectiveMode === 'year' && selectedYear) {
      filteredOrders = filteredOrders.filter((o) => o.created_at.slice(0, 4) === String(selectedYear));
      reportTitle = `Annual Report for ${selectedYear}`;
    } else if (effectiveMode === 'today') {
      filteredOrders = filteredOrders.filter((o) => o.created_at.slice(0, 10) === todayStr);
      reportTitle = "Today's Daily Report";
    } else if (effectiveMode === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      filteredOrders = filteredOrders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
      reportTitle = 'Last 7 Days Report';
    }

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const grossSales = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.subtotal) || 0), 0);
    const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0);
    const totalTax = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.tax_amount) || 0), 0);
    const totalCost = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_cost) || 0), 0);
    const netProfit = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.profit) || 0), 0);
    const profitMargin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    const dailyMap = {};
    for (const o of filteredOrders) {
      const dKey = o.created_at.slice(0, 10);
      if (!dailyMap[dKey]) {
        dailyMap[dKey] = { date: dKey, order_count: 0, daily_revenue: 0, daily_cost: 0, daily_profit: 0 };
      }
      dailyMap[dKey].order_count += 1;
      dailyMap[dKey].daily_revenue += parseFloat(o.total_amount) || 0;
      dailyMap[dKey].daily_cost += parseFloat(o.total_cost) || 0;
      dailyMap[dKey].daily_profit += parseFloat(o.profit) || 0;
    }

    const dailyTrend = Object.values(dailyMap)
      .map((d) => ({
        ...d,
        daily_revenue: parseFloat(d.daily_revenue.toFixed(2)),
        daily_cost: parseFloat(d.daily_cost.toFixed(2)),
        daily_profit: parseFloat(d.daily_profit.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const targetYear = selectedYear || now.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const annualMonthlyBreakdown = monthNames.map((mName, mIdx) => {
      const monthPrefix = `${targetYear}-${String(mIdx + 1).padStart(2, '0')}`;
      const mOrders = (allOrders || []).filter((o) => o.created_at.slice(0, 7) === monthPrefix);
      const mRev = mOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
      const mCost = mOrders.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0);
      const mProfit = mOrders.reduce((s, o) => s + (parseFloat(o.profit) || 0), 0);
      const mMargin = mRev > 0 ? parseFloat(((mProfit / mRev) * 100).toFixed(1)) : 0;

      return {
        month: mName,
        monthKey: monthPrefix,
        orders_count: mOrders.length,
        revenue: parseFloat(mRev.toFixed(2)),
        cost: parseFloat(mCost.toFixed(2)),
        profit: parseFloat(mProfit.toFixed(2)),
        margin: mMargin,
      };
    });

    const itemMap = {};
    for (const o of filteredOrders) {
      for (const item of o.order_items || []) {
        const key = item.sku || item.product_name;
        if (!itemMap[key]) {
          itemMap[key] = {
            product_name: item.product_name,
            sku: item.sku,
            units_sold: 0,
            total_sales: 0,
            total_profit: 0,
          };
        }
        itemMap[key].units_sold += item.quantity || 1;
        itemMap[key].total_sales += parseFloat(item.subtotal) || 0;
        itemMap[key].total_profit += parseFloat(item.profit) || 0;
      }
    }

    const topProfitable = Object.values(itemMap)
      .map((i) => ({
        ...i,
        total_sales: parseFloat(i.total_sales.toFixed(2)),
        total_profit: parseFloat(i.total_profit.toFixed(2)),
      }))
      .sort((a, b) => b.total_profit - a.total_profit)
      .slice(0, 8);

    const prods = allProducts || [];
    const totalStock = prods.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    const costVal = prods.reduce((sum, p) => sum + ((parseFloat(p.cost_price) || 0) * (p.stock_quantity || 0)), 0);
    const retailVal = prods.reduce((sum, p) => sum + ((parseFloat(p.selling_price) || 0) * (p.stock_quantity || 0)), 0);

    res.json({
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
      orders: filteredOrders.map((o) => ({
        ...o,
        subtotal: parseFloat(o.subtotal),
        discount_amount: parseFloat(o.discount_amount),
        tax_amount: parseFloat(o.tax_amount),
        total_amount: parseFloat(o.total_amount),
        total_cost: parseFloat(o.total_cost),
        profit: parseFloat(o.profit),
      })),
      inventoryStats: {
        total_product_types: prods.length,
        total_items_in_stock: totalStock,
        inventory_cost_value: parseFloat(costVal.toFixed(2)),
        inventory_retail_value: parseFloat(retailVal.toFixed(2)),
        potential_profit: parseFloat((retailVal - costVal).toFixed(2)),
        low_stock_count: prods.filter((p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length,
        out_of_stock_count: prods.filter((p) => p.stock_quantity === 0).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// AUTH & USERS
// ---------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, shop_name, phone } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const cleanName = (name || '').trim();
    const cleanShop = (shop_name || 'MS Store').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) return res.status(400).json({ error: 'Valid email is required.' });
    if (!cleanPassword || cleanPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    if (!cleanName) return res.status(400).json({ error: 'Full name is required.' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle();
    if (existing) return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists. Please Log In.` });

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        shop_name: cleanShop,
        phone: cleanPhone,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const { data: existingSettings } = await supabase.from('settings').select('id').eq('user_email', cleanEmail).maybeSingle();
    if (!existingSettings) {
      await supabase.from('settings').insert({
        user_email: cleanEmail,
        shop_name: cleanShop,
        owner_name: cleanName,
        owner_email: cleanEmail,
        phone: cleanPhone,
        currency_symbol: '₹',
        tax_percentage: 5.0,
      });
    }

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        shop_name: newUser.shop_name,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) return res.status(400).json({ error: 'Please enter both email and password.' });

    const { data: user, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
    if (error) throw error;
    if (!user || user.password !== cleanPassword) {
      return res.status(401).json({ error: 'Invalid email or password. Please verify and try again.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        shop_name: user.shop_name,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.json({ user: null });
    const { data: user } = await supabase.from('users').select('id, email, name, shop_name, phone').eq('email', userEmail).maybeSingle();
    res.json({ user: user || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/profile', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const { data: settings } = await supabase.from('settings').select('*').eq('user_email', userEmail || 'default').maybeSingle();
    res.json({
      owner_name: settings?.owner_name || '',
      owner_email: settings?.owner_email || '',
      owner_pin: settings?.owner_pin || '',
      owner_phone: settings?.phone || '',
      shop_name: settings?.shop_name || 'MS Store',
      is_configured: Boolean(settings?.owner_email && settings?.owner_pin),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system/reset', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ error: 'Authentication required' });

    await supabase.from('orders').delete().eq('user_email', userEmail);
    await supabase.from('stock_logs').delete().eq('user_email', userEmail);
    await supabase.from('products').delete().eq('user_email', userEmail);
    res.json({ success: true, message: 'All store inventory and sales data wiped clean.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MS Store API Server running on port ${PORT} (0.0.0.0) with Supabase Cloud DB`);
});
