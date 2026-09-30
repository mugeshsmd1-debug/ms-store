import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-email",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function errJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/functions\/v1\/api/, "");
  if (!path.startsWith("/")) path = "/" + path;
  const normPath = path.startsWith("/api") ? path.slice(4) || "/" : path;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! || Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const userEmail = (
    req.headers.get("x-user-email") ||
    url.searchParams.get("email") ||
    ""
  ).trim().toLowerCase();

  try {
    // ----------------------------------------------------
    // ROOT / HEALTH CHECK
    // ----------------------------------------------------
    if (req.method === "GET" && (normPath === "/" || normPath === "")) {
      return json({
        status: "ok",
        service: "MS Store Backend on Supabase",
        version: "1.0.0",
        provider: "Supabase Edge Functions + PostgreSQL",
        time: new Date().toISOString(),
      });
    }

    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    if (req.method === "POST" && normPath === "/auth/signup") {
      const body = await req.json();
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();
      const name = (body.name || "").trim();
      const shop_name = (body.shop_name || "MS Store").trim();
      const phone = (body.phone || "").trim();

      if (!email || !email.includes("@")) return errJson("Valid email is required.");
      if (!password || password.length < 4) return errJson("Password must be at least 4 characters.");
      if (!name) return errJson("Full name is required.");

      const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
      if (existing) return errJson(`An account with email "${email}" already exists. Please Log In.`);

      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({ email, password, name, shop_name, phone })
        .select()
        .single();

      if (insertErr) return errJson(insertErr.message);

      // Default settings
      const { data: existingSettings } = await supabase.from("settings").select("id").eq("user_email", email).maybeSingle();
      if (!existingSettings) {
        await supabase.from("settings").insert({
          user_email: email,
          shop_name,
          owner_name: name,
          owner_email: email,
          phone,
          currency_symbol: "₹",
          tax_percentage: 5.0,
        });
      }

      return json({
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          shop_name: newUser.shop_name,
          phone: newUser.phone,
        },
      }, 201);
    }

    if (req.method === "POST" && normPath === "/auth/login") {
      const body = await req.json();
      const email = (body.email || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      if (!email || !password) return errJson("Please enter both email and password.");

      const { data: user, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (error) return errJson(error.message);
      if (!user || user.password !== password) return errJson("Invalid email or password. Please verify and try again.", 401);

      return json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          shop_name: user.shop_name,
          phone: user.phone,
        },
      });
    }

    if (req.method === "GET" && normPath === "/auth/me") {
      if (!userEmail) return json({ user: null });
      const { data: user } = await supabase.from("users").select("id, email, name, shop_name, phone").eq("email", userEmail).maybeSingle();
      return json({ user: user || null });
    }

    if (req.method === "POST" && normPath === "/auth/logout") {
      return json({ success: true });
    }

    // ----------------------------------------------------
    // SETTINGS
    // ----------------------------------------------------
    if (req.method === "GET" && normPath === "/settings") {
      const email = userEmail || "default";
      const { data, error } = await supabase.from("settings").select("*").eq("user_email", email).maybeSingle();
      if (error && error.code !== "PGRST116") return errJson(error.message);

      if (data) {
        return json({ ...data, tax_percentage: parseFloat(data.tax_percentage) || 5.0 });
      }

      const defaultSettings = {
        shop_name: "MS Store",
        tagline: "Smart Retail & Inventory Management",
        phone: "",
        address: "",
        currency_symbol: "₹",
        tax_percentage: 5.0,
        owner_name: "",
        owner_email: email,
        owner_pin: "",
      };

      if (userEmail) {
        const { data: created } = await supabase.from("settings").insert({ user_email: email, ...defaultSettings }).select().single();
        if (created) return json({ ...created, tax_percentage: parseFloat(created.tax_percentage) || 5.0 });
      }

      return json(defaultSettings);
    }

    if (req.method === "PUT" && normPath === "/settings") {
      if (!userEmail) return errJson("Authentication required (x-user-email)", 401);
      const body = await req.json();

      const { data, error } = await supabase
        .from("settings")
        .upsert(
          {
            user_email: userEmail,
            shop_name: body.shop_name,
            tagline: body.tagline,
            phone: body.phone,
            address: body.address,
            currency_symbol: body.currency_symbol || "₹",
            tax_percentage: parseFloat(body.tax_percentage) || 0,
            owner_name: body.owner_name,
            owner_email: body.owner_email || userEmail,
            owner_pin: body.owner_pin,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_email" }
        )
        .select()
        .single();

      if (error) return errJson(error.message);
      return json({ ...data, tax_percentage: parseFloat(data.tax_percentage) || 5.0 });
    }

    // ----------------------------------------------------
    // PRODUCTS
    // ----------------------------------------------------
    if (req.method === "GET" && normPath === "/products") {
      if (!userEmail) return json([]);

      let query = supabase.from("products").select("*").eq("user_email", userEmail);
      const search = url.searchParams.get("search");
      const category = url.searchParams.get("category");
      const lowStockOnly = url.searchParams.get("lowStockOnly");

      if (search) {
        const q = search.trim();
        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
      }
      if (category && category !== "All") {
        query = query.eq("category", category);
      }

      query = query.order("name", { ascending: true });
      const { data, error } = await query;
      if (error) return errJson(error.message);

      let list = (data || []).map((p: any) => ({
        ...p,
        cost_price: parseFloat(p.cost_price),
        selling_price: parseFloat(p.selling_price),
        gst_percentage: parseFloat(p.gst_percentage),
      }));

      if (lowStockOnly === "true") {
        list = list.filter((p: any) => p.stock_quantity <= p.low_stock_threshold);
      }

      return json(list);
    }

    if (req.method === "GET" && normPath === "/products/categories") {
      if (!userEmail) return json([]);
      const { data, error } = await supabase.from("products").select("category").eq("user_email", userEmail);
      if (error) return errJson(error.message);

      const set = new Set((data || []).map((r: any) => r.category).filter(Boolean));
      return json(Array.from(set).sort());
    }

    if (req.method === "POST" && normPath === "/products") {
      if (!userEmail) return errJson("Authentication required", 401);
      const body = await req.json();
      const cleanSku = String(body.sku || "").trim().toUpperCase();

      if (!body.name || !cleanSku) return errJson("Product name and SKU are required.");

      const initialStock = parseInt(body.stock_quantity, 10) || 0;
      const threshold = parseInt(body.low_stock_threshold, 10) || 5;
      const gstPct = body.gst_percentage !== undefined ? parseFloat(body.gst_percentage) : 5.0;

      const { data: newProd, error } = await supabase
        .from("products")
        .insert({
          user_email: userEmail,
          name: body.name.trim(),
          sku: cleanSku,
          category: (body.category || "General").trim(),
          cost_price: parseFloat(body.cost_price) || 0,
          selling_price: parseFloat(body.selling_price) || 0,
          stock_quantity: initialStock,
          low_stock_threshold: threshold,
          unit: body.unit || "pcs",
          image_emoji: body.image_emoji || "📦",
          gst_percentage: gstPct,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") return errJson(`Product SKU "${cleanSku}" already exists.`);
        return errJson(error.message);
      }

      if (initialStock > 0) {
        await supabase.from("stock_logs").insert({
          user_email: userEmail,
          product_id: newProd.id,
          type: "INITIAL",
          quantity_change: initialStock,
          quantity_after: initialStock,
          note: "Initial inventory stock",
        });
      }

      return json({
        ...newProd,
        cost_price: parseFloat(newProd.cost_price),
        selling_price: parseFloat(newProd.selling_price),
        gst_percentage: parseFloat(newProd.gst_percentage),
      }, 201);
    }

    // Single product routes: /products/:id or /products/:id/stock
    const stockMatch = normPath.match(/^\/products\/(\d+)\/stock$/);
    if (stockMatch && req.method === "PATCH") {
      if (!userEmail) return errJson("Authentication required", 401);
      const id = parseInt(stockMatch[1], 10);
      const body = await req.json();

      const { data: product, error: getErr } = await supabase.from("products").select("*").eq("id", id).eq("user_email", userEmail).single();
      if (getErr || !product) return errJson("Product not found.", 404);

      let updatedQty: number;
      let change: number;

      if (body.delta !== undefined) {
        change = parseInt(body.delta, 10);
        updatedQty = product.stock_quantity + change;
      } else if (body.newStock !== undefined) {
        updatedQty = parseInt(body.newStock, 10);
        change = updatedQty - product.stock_quantity;
      } else {
        return errJson("Provide delta or newStock.");
      }

      if (updatedQty < 0) return errJson("Stock quantity cannot be negative.");

      const { data: updated, error: updateErr } = await supabase
        .from("products")
        .update({ stock_quantity: updatedQty, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (updateErr) return errJson(updateErr.message);

      const logType = body.type || (change > 0 ? "RESTOCK" : "ADJUSTMENT");
      await supabase.from("stock_logs").insert({
        user_email: userEmail,
        product_id: id,
        type: logType,
        quantity_change: change,
        quantity_after: updatedQty,
        note: body.note || `Quick stock ${change >= 0 ? "+" + change : change}`,
      });

      return json({
        ...updated,
        cost_price: parseFloat(updated.cost_price),
        selling_price: parseFloat(updated.selling_price),
        gst_percentage: parseFloat(updated.gst_percentage),
      });
    }

    const prodIdMatch = normPath.match(/^\/products\/(\d+)$/);
    if (prodIdMatch) {
      const id = parseInt(prodIdMatch[1], 10);

      if (req.method === "PUT") {
        if (!userEmail) return errJson("Authentication required", 401);
        const body = await req.json();

        const { data: current, error: getErr } = await supabase.from("products").select("*").eq("id", id).eq("user_email", userEmail).single();
        if (getErr || !current) return errJson("Product not found.", 404);

        const cleanSku = body.sku ? String(body.sku).trim().toUpperCase() : current.sku;
        const newStock = body.stock_quantity !== undefined ? parseInt(body.stock_quantity, 10) : current.stock_quantity;
        const stockDiff = newStock - current.stock_quantity;

        const updatePayload: any = { sku: cleanSku, updated_at: new Date().toISOString() };
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
          .from("products")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (updateErr) {
          if (updateErr.code === "23505") return errJson(`SKU "${cleanSku}" is already taken.`);
          return errJson(updateErr.message);
        }

        if (stockDiff !== 0) {
          await supabase.from("stock_logs").insert({
            user_email: userEmail,
            product_id: id,
            type: "ADJUSTMENT",
            quantity_change: stockDiff,
            quantity_after: newStock,
            note: "Manual stock edit",
          });
        }

        return json({
          ...updated,
          cost_price: parseFloat(updated.cost_price),
          selling_price: parseFloat(updated.selling_price),
          gst_percentage: parseFloat(updated.gst_percentage),
        });
      }

      if (req.method === "DELETE") {
        if (!userEmail) return errJson("Authentication required", 401);
        const { data, error } = await supabase.from("products").delete().eq("id", id).eq("user_email", userEmail).select().single();
        if (error) return errJson(error.message);
        return json({ message: "Product deleted successfully.", product: data });
      }
    }

    // ----------------------------------------------------
    // ORDERS & BILLING
    // ----------------------------------------------------
    if (req.method === "POST" && normPath === "/orders") {
      if (!userEmail) return errJson("Authentication required", 401);
      const body = await req.json();
      const { items, customer_name, customer_phone, discount_amount = 0, tax_percentage, payment_method = "Cash" } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return errJson("Cart is empty. Add items to create a bill.");
      }

      const { data: settings } = await supabase.from("settings").select("*").eq("user_email", userEmail).maybeSingle();
      const effectiveTaxRate = (tax_percentage !== undefined ? parseFloat(tax_percentage) : (settings?.tax_percentage || 5.0)) / 100;

      const itemIds = items.map((i: any) => i.id);
      const { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .in("id", itemIds)
        .eq("user_email", userEmail);

      if (prodErr) return errJson(prodErr.message);
      const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

      let subtotal = 0;
      let totalCost = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const prod = productMap.get(item.id);
        if (!prod) return errJson(`Product not found (ID: ${item.id})`);

        const qty = parseInt(item.quantity, 10);
        if (qty <= 0) return errJson(`Invalid quantity for ${prod.name}`);
        if (prod.stock_quantity < qty) {
          return errJson(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qty}`);
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

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .ilike("invoice_no", `INV-${dateStr}%`);

      const nextSeq = (count || 0) + 1;
      const invoiceNo = `INV-${dateStr}-${String(nextSeq).padStart(4, "0")}`;

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("process_order_checkout", {
        p_user_email: userEmail,
        p_customer_name: customer_name ? customer_name.trim() : "Walk-in Customer",
        p_customer_phone: customer_phone ? customer_phone.trim() : "",
        p_subtotal: parseFloat(subtotal.toFixed(2)),
        p_discount_amount: discount,
        p_tax_amount: totalTaxAmount,
        p_total_amount: totalAmount,
        p_total_cost: parseFloat(totalCost.toFixed(2)),
        p_profit: netProfit,
        p_payment_method: payment_method || "Cash",
        p_invoice_no: invoiceNo,
        p_items: verifiedItems,
      });

      if (rpcErr) return errJson(rpcErr.message);

      return json({
        orderId: rpcRes?.orderId,
        invoiceNo,
        invoice_no: invoiceNo,
        customer_name: customer_name || "Walk-in Customer",
        customer_phone: customer_phone || "",
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_amount: discount,
        tax_amount: totalTaxAmount,
        total_amount: totalAmount,
        total_cost: parseFloat(totalCost.toFixed(2)),
        profit: netProfit,
        payment_method: payment_method || "Cash",
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
      }, 201);
    }

    if (req.method === "GET" && normPath === "/orders") {
      if (!userEmail) return json([]);
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(count)")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return errJson(error.message);

      return json((data || []).map((o: any) => ({
        ...o,
        subtotal: parseFloat(o.subtotal),
        discount_amount: parseFloat(o.discount_amount),
        tax_amount: parseFloat(o.tax_amount),
        total_amount: parseFloat(o.total_amount),
        total_cost: parseFloat(o.total_cost),
        profit: parseFloat(o.profit),
        total_items: o.order_items?.[0]?.count || 1,
      })));
    }

    const orderIdMatch = normPath.match(/^\/orders\/(.+)$/);
    if (orderIdMatch && req.method === "GET") {
      if (!userEmail) return errJson("Authentication required", 401);
      const idOrInv = orderIdMatch[1];

      let query = supabase.from("orders").select("*").eq("user_email", userEmail);
      if (!isNaN(Number(idOrInv)) && !idOrInv.startsWith("INV-")) {
        query = query.eq("id", parseInt(idOrInv, 10));
      } else {
        query = query.eq("invoice_no", idOrInv);
      }

      const { data: order, error } = await query.single();
      if (error || !order) return errJson("Order not found.", 404);

      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (itemsErr) return errJson(itemsErr.message);

      return json({
        ...order,
        subtotal: parseFloat(order.subtotal),
        discount_amount: parseFloat(order.discount_amount),
        tax_amount: parseFloat(order.tax_amount),
        total_amount: parseFloat(order.total_amount),
        total_cost: parseFloat(order.total_cost),
        profit: parseFloat(order.profit),
        items: (items || []).map((i: any) => ({
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
    }

    // DELETE /orders/clear or DELETE /orders - Delete ALL bill history alone
    if (
      ((req.method === "DELETE" || req.method === "POST") && (normPath === "/orders/clear" || normPath === "/orders")) ||
      (orderIdMatch && orderIdMatch[1] === "clear" && (req.method === "DELETE" || req.method === "POST"))
    ) {
      if (!userEmail) return errJson("Authentication required", 401);

      // Verify account password
      let password = req.headers.get("x-auth-password") || url.searchParams.get("password") || "";
      if (!password && req.headers.get("content-type")?.includes("application/json")) {
        try {
          const body = await req.json();
          password = body.password || "";
        } catch {}
      }

      if (!password) {
        return errJson("Account password is required to delete bill history.", 401);
      }

      const { data: userRec, error: userErr } = await supabase
        .from("users")
        .select("password")
        .eq("email", userEmail)
        .maybeSingle();

      if (userErr || !userRec) return errJson("User account not found.", 404);

      if (userRec.password !== password.trim()) {
        return errJson("Incorrect account password. Bill history was not deleted.", 403);
      }

      const { error: delErr } = await supabase
        .from("orders")
        .delete()
        .eq("user_email", userEmail);

      if (delErr) return errJson(delErr.message, 500);

      // Clean up sales logs from stock_logs
      await supabase
        .from("stock_logs")
        .delete()
        .eq("user_email", userEmail)
        .eq("type", "SALE");

      return json({ success: true, message: "All bill history and sales transactions cleared successfully." });
    }

    // DELETE /orders/:id or POST /orders/:id/delete - Delete single invoice with password verification & stock restoration
    if (orderIdMatch && (req.method === "DELETE" || req.method === "POST")) {
      if (!userEmail) return errJson("Authentication required", 401);
      const idOrInv = orderIdMatch[1];

      // Verify account password
      let password = req.headers.get("x-auth-password") || url.searchParams.get("password") || "";
      if (!password && req.headers.get("content-type")?.includes("application/json")) {
        try {
          const body = await req.json();
          password = body.password || "";
        } catch {}
      }

      if (!password) {
        return errJson("Account password is required to delete this invoice.", 401);
      }

      const { data: userRec, error: userErr } = await supabase
        .from("users")
        .select("password")
        .eq("email", userEmail)
        .maybeSingle();

      if (userErr || !userRec) return errJson("User account not found.", 404);

      if (userRec.password !== password.trim()) {
        return errJson("Incorrect account password. Invoice was not deleted.", 403);
      }

      // Find the order
      let query = supabase.from("orders").select("*").eq("user_email", userEmail);
      if (!isNaN(Number(idOrInv)) && !idOrInv.startsWith("INV-")) {
        query = query.eq("id", parseInt(idOrInv, 10));
      } else {
        query = query.eq("invoice_no", idOrInv);
      }

      const { data: orderToDel, error: findErr } = await query.maybeSingle();
      if (findErr) return errJson(findErr.message, 500);
      if (!orderToDel) return errJson(`Invoice ${idOrInv} not found.`, 404);

      // Restore inventory stock for items in this invoice
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderToDel.id);

      for (const it of orderItems || []) {
        if (it.product_id && it.quantity > 0) {
          const { data: p } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", it.product_id)
            .maybeSingle();

          if (p) {
            const restored = p.stock_quantity + it.quantity;
            await supabase.from("products").update({ stock_quantity: restored }).eq("id", it.product_id);
            await supabase.from("stock_logs").insert({
              user_email: userEmail,
              product_id: it.product_id,
              type: "RESTOCK",
              quantity_change: it.quantity,
              quantity_after: restored,
              note: `Restored stock from deleted invoice ${orderToDel.invoice_no}`,
            });
          }
        }
      }

      // Delete the order (cascades to order_items)
      const { error: delErr } = await supabase.from("orders").delete().eq("id", orderToDel.id);
      if (delErr) return errJson(delErr.message, 500);

      // Delete sale stock logs for this invoice
      await supabase
        .from("stock_logs")
        .delete()
        .eq("user_email", userEmail)
        .ilike("note", `%${orderToDel.invoice_no}%`);

      return json({ success: true, message: `Invoice ${orderToDel.invoice_no} deleted successfully and inventory stock restored.` });
    }

    // ----------------------------------------------------
    // ANALYTICS & PnL
    // ----------------------------------------------------
    if (req.method === "GET" && normPath === "/analytics/pnl") {
      if (!userEmail) {
        return json({
          title: "All Time Financial Summary",
          summary: { total_orders: 0, total_revenue: 0, gross_sales: 0, total_discounts: 0, total_tax: 0, total_cost: 0, net_profit: 0, profit_margin: 0, is_profit: true },
          dailyTrend: [],
          annualMonthlyBreakdown: [],
          topProfitable: [],
          orders: [],
          inventoryStats: { total_product_types: 0, total_items_in_stock: 0, inventory_cost_value: 0, inventory_retail_value: 0, potential_profit: 0, low_stock_count: 0, out_of_stock_count: 0 },
        });
      }

      const mode = url.searchParams.get("mode") || url.searchParams.get("range") || "all";
      const selectedDate = url.searchParams.get("date");
      const selectedMonth = url.searchParams.get("month");
      const selectedYear = url.searchParams.get("year");

      const { data: allOrders, error: orderErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false });

      if (orderErr) return errJson(orderErr.message);

      const { data: allProducts, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .eq("user_email", userEmail);

      if (prodErr) return errJson(prodErr.message);

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      let filteredOrders = allOrders || [];
      let reportTitle = "All Time Financial Summary";

      if (mode === "calendar" && selectedDate) {
        filteredOrders = filteredOrders.filter((o: any) => o.created_at.slice(0, 10) === selectedDate);
        reportTitle = `Daily Report for ${selectedDate}`;
      } else if (mode === "month" && selectedMonth) {
        filteredOrders = filteredOrders.filter((o: any) => o.created_at.slice(0, 7) === selectedMonth);
        reportTitle = `Monthly Report for ${selectedMonth}`;
      } else if (mode === "year" && selectedYear) {
        filteredOrders = filteredOrders.filter((o: any) => o.created_at.slice(0, 4) === String(selectedYear));
        reportTitle = `Annual Report for ${selectedYear}`;
      } else if (mode === "today") {
        filteredOrders = filteredOrders.filter((o: any) => o.created_at.slice(0, 10) === todayStr);
        reportTitle = "Today's Daily Report";
      } else if (mode === "week") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        filteredOrders = filteredOrders.filter((o: any) => new Date(o.created_at) >= sevenDaysAgo);
        reportTitle = "Last 7 Days Report";
      }

      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
      const grossSales = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.subtotal) || 0), 0);
      const totalDiscounts = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.discount_amount) || 0), 0);
      const totalTax = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.tax_amount) || 0), 0);
      const totalCost = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_cost) || 0), 0);
      const netProfit = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.profit) || 0), 0);
      const profitMargin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

      const dailyMap: Record<string, any> = {};
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
        .map((d: any) => ({
          ...d,
          daily_revenue: parseFloat(d.daily_revenue.toFixed(2)),
          daily_cost: parseFloat(d.daily_cost.toFixed(2)),
          daily_profit: parseFloat(d.daily_profit.toFixed(2)),
        }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));

      const targetYear = selectedYear || now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const annualMonthlyBreakdown = monthNames.map((mName, mIdx) => {
        const monthPrefix = `${targetYear}-${String(mIdx + 1).padStart(2, "0")}`;
        const mOrders = (allOrders || []).filter((o: any) => o.created_at.slice(0, 7) === monthPrefix);
        const mRev = mOrders.reduce((s: number, o: any) => s + (parseFloat(o.total_amount) || 0), 0);
        const mCost = mOrders.reduce((s: number, o: any) => s + (parseFloat(o.total_cost) || 0), 0);
        const mProfit = mOrders.reduce((s: number, o: any) => s + (parseFloat(o.profit) || 0), 0);
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

      const itemMap: Record<string, any> = {};
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
        .map((i: any) => ({
          ...i,
          total_sales: parseFloat(i.total_sales.toFixed(2)),
          total_profit: parseFloat(i.total_profit.toFixed(2)),
        }))
        .sort((a: any, b: any) => b.total_profit - a.total_profit)
        .slice(0, 8);

      const prods = allProducts || [];
      const totalStock = prods.reduce((sum: number, p: any) => sum + (p.stock_quantity || 0), 0);
      const costVal = prods.reduce((sum: number, p: any) => sum + ((parseFloat(p.cost_price) || 0) * (p.stock_quantity || 0)), 0);
      const retailVal = prods.reduce((sum: number, p: any) => sum + ((parseFloat(p.selling_price) || 0) * (p.stock_quantity || 0)), 0);

      return json({
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
        orders: filteredOrders.map((o: any) => ({
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
          low_stock_count: prods.filter((p: any) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length,
          out_of_stock_count: prods.filter((p: any) => p.stock_quantity === 0).length,
        },
      });
    }

    // ----------------------------------------------------
    // SYSTEM RESET (Factory Reset - Password Protected)
    // ----------------------------------------------------
    if (req.method === "POST" && normPath === "/system/reset") {
      if (!userEmail) return errJson("Authentication required", 401);

      // Verify account password
      let password = req.headers.get("x-auth-password") || url.searchParams.get("password") || "";
      if (!password && req.headers.get("content-type")?.includes("application/json")) {
        try {
          const body = await req.json();
          password = body.password || "";
        } catch {}
      }

      if (!password) {
        return errJson("Account password is required to reset store data.", 401);
      }

      const { data: userRec, error: userErr } = await supabase
        .from("users")
        .select("password")
        .eq("email", userEmail)
        .maybeSingle();

      if (userErr || !userRec) return errJson("User account not found.", 404);

      if (userRec.password !== password.trim()) {
        return errJson("Incorrect account password. Store was not reset.", 403);
      }

      await supabase.from("orders").delete().eq("user_email", userEmail);
      await supabase.from("stock_logs").delete().eq("user_email", userEmail);
      await supabase.from("products").delete().eq("user_email", userEmail);
      return json({ success: true, message: "All store inventory and sales data wiped clean." });
    }

    return errJson(`Endpoint not found: ${req.method} ${normPath}`, 404);
  } catch (err: any) {
    return errJson(err.message || "Internal server error", 500);
  }
});
