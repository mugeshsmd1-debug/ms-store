import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Printer, CheckCircle2, X, ShoppingBag, Phone, MapPin, Receipt, Sparkles } from 'lucide-react';

export default function ReceiptModal({ receipt, settings, onClose }) {
  useEffect(() => {
    // Fire celebratory confetti on bill completion
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#38bdf8', '#f59e0b'],
    });
  }, []);

  if (!receipt) return null;

  const currency = settings?.currency_symbol || '₹';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar (no-print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/80">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Bill Generated Successfully!</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div className="overflow-y-auto p-6 text-slate-200">
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 text-sm font-sans"
          >
            {/* Shop Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 mb-2">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                {settings?.shop_name || 'MS Store'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{settings?.tagline}</p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 mt-1">
                <span>{settings?.address}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                <span>Tel: {settings?.phone}</span>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 text-xs flex justify-between items-start">
              <div>
                <p>
                  <span className="text-slate-500">Invoice:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{receipt.invoiceNo}</span>
                </p>
                <p>
                  <span className="text-slate-500">Customer:</span>{' '}
                  <span className="font-semibold text-slate-900">{receipt.customer_name || 'Walk-in'}</span>
                </p>
                {receipt.customer_phone && (
                  <p>
                    <span className="text-slate-500">Phone:</span> {receipt.customer_phone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-slate-500">
                  {new Date(receipt.created_at || Date.now()).toLocaleDateString()}
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  {new Date(receipt.created_at || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                  {receipt.payment_method || 'Cash'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="text-left pb-1 font-semibold">Item</th>
                    <th className="text-center pb-1 font-semibold">Qty</th>
                    <th className="text-right pb-1 font-semibold">Price</th>
                    <th className="text-right pb-1 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items?.map((item, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1.5 pr-2 font-medium text-slate-900">
                        {item.name || item.product_name}
                      </td>
                      <td className="py-1.5 text-center text-slate-600 font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-1.5 text-right text-slate-600 font-mono">
                        {currency}{item.selling_price}
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900 font-mono">
                        {currency}{parseFloat(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{currency}{receipt.subtotal?.toFixed(2)}</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{currency}{receipt.discount_amount?.toFixed(2)}</span>
                </div>
              )}
              {receipt.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({settings?.tax_percentage}%)</span>
                  <span className="font-mono">+{currency}{receipt.tax_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-600">{currency}{receipt.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer message */}
            <div className="text-center pt-4 text-[11px] text-slate-500">
              <p className="font-medium text-slate-700">Thank you for shopping with us!</p>
              <p className="text-[10px]">Please visit again</p>
            </div>
          </div>

          {/* Shop Owner Private Profit Indicator (No print) */}
          <div className="no-print mt-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Net Profit from this Bill:
            </span>
            <span className="font-bold text-emerald-300 font-mono text-sm">
              +{currency}{receipt.profit?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons (no-print) */}
        <div className="no-print p-4 bg-slate-800/80 border-t border-slate-700/80 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition active:scale-95"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
