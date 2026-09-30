import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, User, Phone, Tag, Check, Sparkles, AlertCircle } from 'lucide-react';
import TiltCard from '../components/TiltCard';
import ProductIcon from '../components/ProductIcon';
import StoreScene3D from '../components/StoreScene3D';
import ReceiptModal from '../components/ReceiptModal';
import { api } from '../services/api';

export default function BillingView({ products = [], categories = [], settings, onOrderCompleted, refreshProducts }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const currency = settings?.currency_symbol || '₹';
  const taxPercentage = settings?.tax_percentage || 5.0;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  // Cart operations
  const addToCart = (product) => {
    if (product.stock_quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setError(`Cannot add more than available stock (${product.stock_quantity} ${product.unit}).`);
          setTimeout(() => setError(''), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const initialGst = product.gst_percentage !== undefined ? product.gst_percentage : (settings?.tax_percentage ?? 5.0);
      return [...prev, { ...product, quantity: 1, gst_percentage: initialGst }];
    });
  };

  const updateItemGst = (productId, newGst) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, gst_percentage: newGst } : item
      )
    );
  };

  const updateQuantity = (productId, delta) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (product && nextQty > product.stock_quantity) {
              setError(`Maximum available stock is ${product.stock_quantity}.`);
              setTimeout(() => setError(''), 3000);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setCustomerName('');
    setCustomerPhone('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.selling_price * item.quantity, 0);
  const totalCost = cart.reduce((acc, item) => acc + item.cost_price * item.quantity, 0);
  const discountAmount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;

  // Itemized GST calculation
  const totalTaxAmount = cart.reduce((sum, item) => {
    const itemSubtotal = item.selling_price * item.quantity;
    const itemTaxable = itemSubtotal * discountRatio;
    const pct = parseFloat(item.gst_percentage) || 0;
    return sum + (itemTaxable * (pct / 100));
  }, 0);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const grandTotal = taxableAmount + totalTaxAmount;
  const estimatedProfit = taxableAmount - totalCost;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setProcessing(true);
      setError('');

      const orderPayload = {
        items: cart.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          gst_percentage: parseFloat(i.gst_percentage) || 0,
        })),
        customer_name: customerName,
        customer_phone: customerPhone,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        tax_percentage: taxPercentage,
      };

      const receipt = await api.createOrder(orderPayload);
      setLastReceipt(receipt);
      clearCart();
      if (onOrderCompleted) onOrderCompleted();
      if (refreshProducts) refreshProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 3D Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/20 shadow-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Point of Sale System</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight m-0">
            Quick Billing & Stock POS
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md m-0">
            Select products, add customer details, check real-time stock availability, and issue instant printable receipts.
          </p>
        </div>

        {/* 3D Interactive Shop Scene Widget */}
        <div className="w-full md:w-64 h-36 relative flex items-center justify-center">
          <StoreScene3D className="w-full h-full" />
          <span className="absolute bottom-1 right-2 text-[10px] text-indigo-300/70 font-mono bg-slate-900/60 px-2 py-0.5 rounded">
            Interactive 3D Hub
          </span>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>

            {/* Category Select Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Cards Grid with 3D Tilt */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => {
              const inStock = product.stock_quantity > 0;
              const isLow = product.stock_quantity <= product.low_stock_threshold && inStock;
              const inCart = cart.find((i) => i.id === product.id);

              return (
                <TiltCard
                  key={product.id}
                  onClick={() => inStock && addToCart(product)}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                    !inStock
                      ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                      : inCart
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/90 border-slate-700/60 hover:border-slate-500/80 shadow-md'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-hidden">
                      <ProductIcon icon={product.image_emoji} className="w-10 h-10 object-cover" textClassName="text-3xl" />
                    </div>

                    {/* Stock Available Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono tracking-tight flex items-center gap-1 ${
                        !inStock
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          !inStock ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      {!inStock ? 'Out of stock' : `${product.stock_quantity} ${product.unit}`}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1 mb-3">
                    <h3 className="text-sm font-bold text-white line-clamp-1 m-0">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono m-0">
                      {product.sku}
                    </p>
                  </div>

                  {/* Price & Add to Cart button */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-indigo-400 font-mono m-0">
                        {currency}{product.selling_price}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                        !inStock
                          ? 'bg-slate-800 text-slate-600'
                          : inCart
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                      }`}
                    >
                      {inCart ? (
                        <span className="font-mono text-xs px-1">+{inCart.quantity}</span>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </TiltCard>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs text-slate-500">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: POS Cart & Register (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-5 flex flex-col space-y-4 backdrop-blur-xl">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white m-0">Current Order</h3>
                  <p className="text-xs text-slate-400 m-0">
                    {cart.reduce((a, b) => a + b.quantity, 0)} items selected
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-rose-400 transition"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-xs">Your cart is empty.</p>
                  <p className="text-[11px] text-slate-600">Click products on the left to add items.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemSubtotal = item.selling_price * item.quantity;
                  const itemTaxable = itemSubtotal * discountRatio;
                  const itemGst = parseFloat(item.gst_percentage) || 0;
                  const itemTax = itemTaxable * (itemGst / 100);

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-800/70 rounded-2xl border border-slate-700/70 space-y-2 text-xs"
                    >
                      {/* Top Row: Product details, Qty, Subtotal & Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-slate-900/80 border border-slate-700/50">
                            <ProductIcon icon={item.image_emoji} className="w-7 h-7 object-cover" textClassName="text-base" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 truncate m-0">{item.name}</p>
                            <p className="text-[11px] text-indigo-400 font-mono m-0">
                              {currency}{item.selling_price} × {item.quantity}
                            </p>
                          </div>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <p className="font-bold text-white font-mono min-w-[50px] text-right m-0">
                          {currency}{itemSubtotal.toFixed(2)}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bottom Row: Editable GST % for this product */}
                      <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/60 px-2.5 py-1.5 rounded-xl">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                            GST:
                          </span>
                          <div className="relative inline-flex items-center">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              value={item.gst_percentage ?? 0}
                              onChange={(e) => updateItemGst(item.id, e.target.value)}
                              className="w-12 px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[10px] text-slate-400 ml-1">%</span>
                          </div>

                          {/* Quick GST Preset Chips */}
                          <div className="flex items-center gap-0.5 ml-1">
                            {[0, 5, 12, 18, 28].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => updateItemGst(item.id, pct)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                  Number(item.gst_percentage) === pct
                                    ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold'
                                    : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-300 font-mono">
                          Tax: <strong className="text-amber-400">+{currency}{itemTax.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer Details Form */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Customer Details (Optional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Phone No."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Payment Method
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI/QR', icon: QrCode },
                  { id: 'Card', label: 'Card', icon: CreditCard },
                  { id: 'Credit', label: 'Credit', icon: Tag },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-center transition ${
                        paymentMethod === pm.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-white">{currency}{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-slate-400">
                <span>Discount ({currency})</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-lg text-right text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-between text-slate-400">
                <span>GST / Tax (Itemized)</span>
                <span className="font-mono text-amber-400 font-bold">+{currency}{totalTaxAmount.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-black text-white">
                <span>Grand Total</span>
                <span className="text-xl font-mono text-indigo-400">
                  {currency}{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Live Profit Preview for Owner */}
              {cart.length > 0 && (
                <div className="pt-1 text-[11px] flex justify-between text-emerald-400 font-semibold">
                  <span>Est. Profit from this sale:</span>
                  <span className="font-mono">+{currency}{estimatedProfit.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              disabled={cart.length === 0 || processing}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Generate Bill ({currency}{grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          settings={settings}
          onClose={() => setLastReceipt(null)}
        />
      )}
    </div>
  );
}
