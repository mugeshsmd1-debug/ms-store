import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Tag, DollarSign, Package, AlertTriangle, Layers, Upload, Image as ImageIcon, Smile, Trash2, Camera, Link as LinkIcon } from 'lucide-react';
import ProductIcon from './ProductIcon';

const EMOJI_OPTIONS = ['📦', '🖱️', '🔌', '⌨️', '🔊', '🍵', '🥛', '🍚', '🍯', '🧴', '💡', '📓', '🖊️', '🎧', '🍫', '🍎', '👕', '📱', '🧼', '☕'];

const compressImage = (file, maxSize = 256, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

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
    gst_percentage: '5',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [iconTab, setIconTab] = useState('upload'); // 'upload' | 'emoji' | 'url'
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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
        gst_percentage: String(product.gst_percentage ?? 5),
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
        gst_percentage: '5',
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
        gst_percentage: parseNum(formData.gst_percentage) || 0,
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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image file is too large (maximum 15 MB).');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      const compressedDataUrl = await compressImage(file, 256, 0.85);
      setFormData((prev) => ({
        ...prev,
        image_emoji: compressedDataUrl,
      }));
    } catch (err) {
      console.error('Failed to compress image:', err);
      setError('Failed to process image. Please try another photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image_emoji: '📦',
    }));
  };

  const handleApplyUrl = () => {
    if (!customUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      image_emoji: customUrl.trim(),
    }));
    setCustomUrl('');
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
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-500/20 rounded-xl border border-indigo-500/30 overflow-hidden">
              <ProductIcon icon={formData.image_emoji} className="w-10 h-10 object-cover" textClassName="text-2xl" />
            </div>
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

          {/* Product Icon Selection (Gallery / Files / Emoji / URL) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Product Icon / Image
              </label>
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setIconTab('upload')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                    iconTab === 'upload' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Gallery / Files
                </button>
                <button
                  type="button"
                  onClick={() => setIconTab('emoji')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                    iconTab === 'emoji' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  Emojis
                </button>
                <button
                  type="button"
                  onClick={() => setIconTab('url')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                    iconTab === 'url' ? 'bg-indigo-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Web URL
                </button>
              </div>
            </div>

            {/* Hidden file input supporting camera & gallery */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {iconTab === 'upload' && (
              <div>
                {formData.image_emoji && (formData.image_emoji.startsWith('data:image') || formData.image_emoji.startsWith('http') || formData.image_emoji.startsWith('/')) ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <img
                      src={formData.image_emoji}
                      alt="Product preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-600 shadow-md bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> Custom Image Attached
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        Compressed & ready to save with product
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {uploadingImage ? 'Loading...' : 'Change'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition"
                        title="Remove custom image and reset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 transition">
                      {uploadingImage ? (
                        <Sparkles className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      {uploadingImage ? 'Compressing image...' : 'Click to select from Gallery or Files'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 text-center">
                      Upload from phone camera, photo gallery, or PC files (PNG, JPG, WebP)
                    </p>
                  </div>
                )}
              </div>
            )}

            {iconTab === 'emoji' && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800/60 rounded-xl border border-slate-700/60 max-h-36 overflow-y-auto">
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
            )}

            {iconTab === 'url' && (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/product-image.png"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Paste any public direct image URL link
                </p>
              </div>
            )}
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

          {/* Stock, Unit & Default GST Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default GST %</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">%</span>
              </div>
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
