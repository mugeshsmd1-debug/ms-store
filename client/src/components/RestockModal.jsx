import React, { useState } from 'react';
import { X, Plus, PackageCheck, AlertCircle, ArrowRight } from 'lucide-react';
import ProductIcon from './ProductIcon';

export default function RestockModal({ product, isOpen, onClose, onRestock }) {
  const [mode, setMode] = useState('add'); // 'add' or 'set'
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('Stock shipment replenishment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const currentStock = product.stock_quantity;
  const parsedAmount = parseInt(String(amount).trim(), 10) || 0;
  const newStock = mode === 'add' ? currentStock + parsedAmount : parsedAmount;

  const quickAmounts = [5, 10, 20, 50, 100];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(parsedAmount)) {
      setError('Please enter a valid whole number for quantity.');
      return;
    }

    if (newStock < 0) {
      setError('Projected stock cannot be negative.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (mode === 'add') {
        await onRestock(product.id, { delta: parsedAmount, note, type: 'RESTOCK' });
      } else {
        await onRestock(product.id, { newStock: parsedAmount, note, type: 'ADJUSTMENT' });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center p-0.5 bg-slate-800 rounded-xl border border-slate-700/60 overflow-hidden">
              <ProductIcon icon={product.image_emoji} className="w-8 h-8 object-cover" textClassName="text-2xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Update Stock</h2>
              <p className="text-xs text-slate-400 font-mono">{product.name} ({product.sku})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with noValidate */}
        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs Projected Stock Banner */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex items-center justify-around">
            <div className="text-center">
              <p className="text-[11px] text-slate-400">Current Stock</p>
              <p className="text-xl font-extrabold text-slate-200">
                {currentStock} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400" />
            <div className="text-center">
              <p className="text-[11px] text-slate-400">Projected Stock</p>
              <p className="text-2xl font-black text-emerald-400">
                {newStock} <span className="text-xs font-normal text-emerald-500">{product.unit}</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setMode('add'); setAmount('10'); }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'add' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              + Add to Current Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('set'); setAmount(String(currentStock)); }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'set' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Set Exact Count
            </button>
          </div>

          {/* Quick Amount Chips */}
          {mode === 'add' && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-medium">Quick Quantity Add:</p>
              <div className="flex gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                      parseInt(amount, 10) === q
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {mode === 'add' ? 'Quantity to Add' : 'New Exact Stock Total'}
            </label>
            <input
              type="number"
              step="1"
              min={mode === 'add' ? 1 : 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Restock Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Restock Note / Reason
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Supplier delivery, batch #402"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              {loading ? 'Updating...' : 'Confirm Stock Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
