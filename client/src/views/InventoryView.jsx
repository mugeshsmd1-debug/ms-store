import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, ArrowUpDown, Edit, Trash2, Box, Eye, Layers, Clock, CheckCircle2 } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import RestockModal from '../components/RestockModal';
import Warehouse3D from '../components/Warehouse3D';
import TiltCard from '../components/TiltCard';
import { api } from '../services/api';

export default function InventoryView({ products = [], categories = [], settings, refreshProducts }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'
  const [viewMode, setViewMode] = useState('list'); // 'list' or '3d'
  
  // Modals state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [activeStockLogs, setActiveStockLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const currency = settings?.currency_symbol || '₹';

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0;
      } else if (stockFilter === 'out') {
        matchStock = p.stock_quantity === 0;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, search, selectedCategory, stockFilter]);

  // Inventory Metrics
  const metrics = useMemo(() => {
    const totalTypes = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);
    const lowStockCount = products.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
    ).length;
    const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;
    const totalCostValue = products.reduce((acc, p) => acc + p.cost_price * p.stock_quantity, 0);
    const totalRetailValue = products.reduce((acc, p) => acc + p.selling_price * p.stock_quantity, 0);

    return {
      totalTypes,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      totalCostValue,
      totalRetailValue,
    };
  }, [products]);

  // Quick Inline Stock Update (+1, +5, -1)
  const handleQuickAdjust = async (product, delta) => {
    try {
      await api.adjustStock(product.id, {
        delta,
        note: `Quick ${delta > 0 ? '+' + delta : delta} adjustment`,
        type: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
      });
      refreshProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveProduct = async (productData) => {
    if (editingProduct) {
      await api.updateProduct(editingProduct.id, productData);
    } else {
      await api.createProduct(productData);
    }
    refreshProducts();
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.deleteProduct(id);
        refreshProducts();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRestockSubmit = async (productId, restockData) => {
    await api.adjustStock(productId, restockData);
    refreshProducts();
  };

  const handleSelectFrom3D = (product) => {
    setRestockProduct(product);
    setIsRestockModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Inventory KPI Cards with 3D Tilt */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stock Units */}
        <TiltCard className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Inventory Units</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono m-0">
            {metrics.totalUnits} <span className="text-xs font-normal text-slate-400">units</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 m-0">
            Across {metrics.totalTypes} product varieties
          </p>
        </TiltCard>

        {/* Low Stock Alerts */}
        <TiltCard
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`p-4 rounded-2xl border shadow-lg cursor-pointer transition ${
            stockFilter === 'low'
              ? 'bg-amber-950/40 border-amber-500'
              : 'bg-slate-900/90 border-slate-700/80 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-semibold">Low Stock Warnings</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono m-0">
            {metrics.lowStockCount} <span className="text-xs font-normal text-amber-500">items</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 m-0">
            {stockFilter === 'low' ? 'Filtering active (click to reset)' : 'Click to filter low stock items'}
          </p>
        </TiltCard>

        {/* Inventory Cost Valuation */}
        <TiltCard className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Inventory Cost Asset</span>
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-400 font-mono m-0">
            {currency}{metrics.totalCostValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 m-0">
            Capital invested in current stock
          </p>
        </TiltCard>

        {/* Potential Retail Value */}
        <TiltCard className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Estimated Retail Value</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono m-0">
            {currency}{metrics.totalRetailValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-400/80 mt-1 m-0">
            +{currency}{(metrics.totalRetailValue - metrics.totalCostValue).toLocaleString()} potential profit
          </p>
        </TiltCard>
      </div>

      {/* Control Bar & 3D Visualizer Toggle */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Stock status filter */}
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                stockFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                stockFilter === 'low' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Low ({metrics.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                stockFilter === 'out' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Out ({metrics.outOfStockCount})
            </button>
          </div>
        </div>

        {/* View Switcher (3D Warehouse vs Table) & Add Product */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Warehouse</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 3D Warehouse Visualizer Mode */}
      {viewMode === '3d' ? (
        <div className="space-y-3">
          <Warehouse3D
            products={products}
            currencySymbol={currency}
            onSelectProduct={handleSelectFrom3D}
          />
        </div>
      ) : (
        /* Inventory Table List View */
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Cost Price</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Available Stock</th>
                  <th className="py-3.5 px-4 text-center">Quick Stock Adjust</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stock_quantity === 0;
                  const isLow = p.stock_quantity <= p.low_stock_threshold && !isOutOfStock;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/50 transition group"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-1 bg-slate-800 rounded-lg">
                            {p.image_emoji}
                          </span>
                          <div>
                            <p className="font-bold text-white text-sm m-0">{p.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono m-0">{p.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {currency}{parseFloat(p.cost_price).toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {currency}{parseFloat(p.selling_price).toFixed(2)}
                      </td>

                      {/* Stock Quantity Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono ${
                            isOutOfStock
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          {p.stock_quantity} {p.unit}
                          {isLow && ' (Low)'}
                          {isOutOfStock && ' (Empty)'}
                        </span>
                      </td>

                      {/* Inline Quick Stock Adjust (+1, +5, -1) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            title="Decrease 1 unit"
                            disabled={p.stock_quantity <= 0}
                            onClick={() => handleQuickAdjust(p, -1)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-rose-600 text-slate-300 hover:text-white font-mono font-bold text-xs disabled:opacity-40 transition"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            title="Add 1 unit"
                            onClick={() => handleQuickAdjust(p, 1)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white font-mono font-bold text-xs transition"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            title="Restock 5 units"
                            onClick={() => handleQuickAdjust(p, 5)}
                            className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-mono font-bold text-xs transition"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            title="Open Restock Dialog"
                            onClick={() => {
                              setRestockProduct(p);
                              setIsRestockModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold transition"
                          >
                            Custom
                          </button>
                        </div>
                      </td>

                      {/* Edit & Delete Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                            title="Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm font-semibold">No inventory items matched your criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <ProductModal
        product={editingProduct}
        categories={categories}
        currencySymbol={currency}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* Restock Modal */}
      <RestockModal
        product={restockProduct}
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockProduct(null);
        }}
        onRestock={handleRestockSubmit}
      />
    </div>
  );
}
