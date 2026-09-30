import React, { useState, useEffect } from 'react';
import { X, Sparkles, Tag, DollarSign, Package, AlertTriangle, Layers } from 'lucide-react';

const EMOJI_OPTIONS = ['📦', '🖱️', '🔌', '⌨️', '🔊', '🍵', '🥛', '🍚', '🍯', '🧴', '💡', '📓', '🖊️', '🎧', '🍫', '🍎', '👕', '📱', '🧼', '☕'];

export default function ProductModal({ product, categories = [], currencySymbol = '₹', isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'General',
    cost_price: '',
    selling_price: '',
    stock_quantity: '10',
    low_stock_threshold: '5',
    unit: 'pcs',
    image_emoji: '📦',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || 'General',
        cost_price: String(product.cost_price ?? ''),
        selling_price: String(product.selling_price ?? ''),
        stock_quantity: String(product.stock_quantity ?? 0),
        low_stock_threshold: String(product.low_stock_threshold ?? 5),
        unit: product.unit || 'pcs',
        image_emoji: product.image_emoji || '📦',
      });
    } else {
      // Auto generate a SKU for new product
      const randomSku = 'PROD-' + Math.floor(1000 + Math.random() * 9000);
      setFormData({
        name: '',
        sku: randomSku,
        category: categories[0] || 'General',
        cost_price: '',
        selling_price: '',
        stock_quantity: '15',
        low_stock_threshold: '5',
        unit: 'pcs',
        image_emoji: '📦',
      });
    }
    setError('');
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  // Clean parse helper
  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    const clean = String(val).replace(/,/g, '.').trim();
    return parseFloat(clean);
  };

  const cost = parseNum(formData.cost_price);
  const sell = parseNum(formData.selling_price);
  const validCost = !isNaN(cost) && cost >= 0 ? cost : 0;
  const validSell = !isNaN(sell) && sell >= 0 ? sell : 0;
  const margin = validSell > 0 ? (((validSell - validCost) / validSell) * 100).toFixed(1) : '0.0';
  const profitPerItem = (validSell - validCost).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.name.trim();
    const cleanSku = formData.sku.trim();

    if (!cleanName) {
      setError('Please enter a product name.');
      return;
    }

    if (!cleanSku) {
      setError('Please enter a valid SKU / Code.');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      setError('Please enter a valid cost price (0 or greater).');
      return;
    }

    if (isNaN(sell) || sell < 0) {
      setError('Please enter a valid selling price (0 or greater).');
      return;
    }

    const stockQty = parseInt(String(formData.stock_quantity).trim(), 10);
    if (isNaN(stockQty) || stockQty < 0) {
      setError('Stock quantity must be a non-negative whole number.');
      return;
    }

    const threshold = parseInt(String(formData.low_stock_threshold).trim(), 10);
    const validThreshold = isNaN(threshold) || threshold < 1 ? 5 : threshold;

    try {
      setLoading(true);
      await onSave({
        name: cleanName,
        sku: cleanSku,
        category: formData.category ? formData.category.trim() : 'General',
        cost_price: cost,
        selling_price: sell,
        stock_quantity: stockQty,
        low_stock_threshold: validThreshold,
        unit: formData.unit || 'pcs',
        image_emoji: formData.image_emoji || '📦',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const generateNewSku = () => {
    const prefix = formData.category ? formData.category.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') : 'SKU';
    setFormData((prev) => ({
      ...prev,
      sku: `${prefix || 'PROD'}-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  };

  // Unique category suggestions
  const uniqueCategories = Array.from(
    new Set([...categories, 'Electronics', 'Groceries', 'Beverages', 'Lifestyle', 'Stationery', 'General'])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              {formData.image_emoji}
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-400">
                Update product information, pricing, and stock inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form with noValidate to prevent native browser regex failures */}
        <form noValidate onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Emoji Selection Bar */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Product Icon
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setFormData({ ...formData, image_emoji: emoji })}
                  className={`w-9 h-9 text-lg flex items-center justify-center rounded-lg transition ${
                    formData.image_emoji === emoji
                      ? 'bg-indigo-600 text-white shadow-md scale-110'
                      : 'hover:bg-slate-700/70 text-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Wireless Mouse Pro"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* SKU & Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">SKU / Code *</label>
                <button
                  type="button"
                  onClick={generateNewSku}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="ELEC-001"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                list="category-suggestions-list"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <datalist id="category-suggestions-list">
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Pricing & Profit Calculator */}
          <div className="p-4 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Pricing & Profit Calculator
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                  validSell >= validCost
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                Profit: {currencySymbol}{profitPerItem} ({margin}%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Cost Price (Buy Price) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Selling Price (Retail) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold text-emerald-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Unit Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Low Stock Alert
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="pcs">pcs</option>
                <option value="box">box</option>
                <option value="pack">pack</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="bottle">bottle</option>
                <option value="meter">meter</option>
              </select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : product ? 'Update Product' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
