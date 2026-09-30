import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ShoppingCart, Award, Receipt, ArrowUpRight, BarChart3, PieChart, ShieldCheck } from 'lucide-react';
import TiltCard from '../components/TiltCard';
import ReceiptModal from '../components/ReceiptModal';
import { api } from '../services/api';

export default function ProfitLossView({ settings }) {
  const [range, setRange] = useState('all'); // 'today', 'week', 'month', 'all'
  const [pnlData, setPnlData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  const currency = settings?.currency_symbol || '₹';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analytics, orderList] = await Promise.all([
        api.getPnL(range),
        api.getOrders({ limit: 50 }),
      ]);
      setPnlData(analytics);
      setOrders(orderList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const handleViewReceipt = async (orderId) => {
    try {
      const detailedOrder = await api.getOrderById(orderId);
      setSelectedReceipt({
        ...detailedOrder,
        invoiceNo: detailedOrder.invoice_no,
      });
    } catch (err) {
      alert('Failed to load invoice receipt.');
    }
  };

  if (loading && !pnlData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
        <p className="text-sm">Calculating Profit & Loss statement...</p>
      </div>
    );
  }

  const summary = pnlData?.summary || {};
  const isNetProfit = summary.net_profit >= 0;
  const dailyTrend = pnlData?.dailyTrend || [];
  const topProfitable = pnlData?.topProfitable || [];

  // Max value for chart scaling
  const maxDayRevenue = Math.max(...dailyTrend.map((d) => d.daily_revenue || 0), 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Date Range Selector Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight m-0">
              Profit & Loss (P&L) Statement
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                isNetProfit
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isNetProfit ? 'PROFITABLE' : 'NET LOSS'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 m-0">
            Real-time financial performance, revenue breakdown, COGS, and net margins
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-slate-800 p-1.5 rounded-2xl border border-slate-700 text-xs font-semibold">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl transition ${
                range === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metric Cards with 3D Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <TiltCard className="p-5 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono m-0">
            {currency}{summary.total_revenue?.toLocaleString()}
          </p>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Gross Sales: {currency}{summary.gross_sales?.toFixed(2)}</span>
            <span>Tax: {currency}{summary.total_tax?.toFixed(2)}</span>
          </div>
        </TiltCard>

        {/* Cost of Goods Sold (COGS) */}
        <TiltCard className="p-5 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400 font-mono m-0">
            {currency}{summary.total_cost?.toLocaleString()}
          </p>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Discounts: {currency}{summary.total_discounts?.toFixed(2)}</span>
            <span className="text-rose-400/80">Product acquisition cost</span>
          </div>
        </TiltCard>

        {/* Net Profit / Loss */}
        <TiltCard
          className={`p-5 rounded-3xl border shadow-xl ${
            isNetProfit
              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/50'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net {isNetProfit ? 'Profit' : 'Loss'}
            </span>
            <div
              className={`p-2.5 rounded-2xl ${
                isNetProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isNetProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <p
            className={`text-3xl font-black font-mono m-0 ${
              isNetProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isNetProfit ? '+' : ''}
            {currency}{summary.net_profit?.toLocaleString()}
          </p>
          <div className="mt-2 text-[11px] flex items-center justify-between border-t border-slate-800 pt-2">
            <span className={isNetProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Net Margin: {summary.profit_margin}%
            </span>
            <span className="text-slate-400">{summary.total_orders} Orders</span>
          </div>
        </TiltCard>

        {/* Profit Margin & Efficiency */}
        <TiltCard className="p-5 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Profit Margin %
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 font-mono m-0">
            {summary.profit_margin}%
          </p>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Avg Order Value:</span>
            <span className="font-mono text-white font-bold">
              {currency}
              {summary.total_orders > 0
                ? (summary.total_revenue / summary.total_orders).toFixed(2)
                : '0.00'}
            </span>
          </div>
        </TiltCard>
      </div>

      {/* Visual Analytics Grid: Sales & Profit Daily Chart + Top Profit Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Sales & Profit Trend (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white m-0">Daily Revenue & Profit Trend</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          {/* Interactive Bar Visualization */}
          {dailyTrend.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No sales recorded for the selected timeline.
            </div>
          ) : (
            <div className="pt-6">
              <div className="flex items-end justify-between gap-2 h-44 border-b border-slate-800 pb-2">
                {dailyTrend.map((day, idx) => {
                  const revHeight = Math.max(10, Math.min(100, (day.daily_revenue / maxDayRevenue) * 100));
                  const profitHeight = Math.max(
                    5,
                    Math.min(100, (Math.max(0, day.daily_profit) / maxDayRevenue) * 100)
                  );

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Floating Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-14 bg-slate-800 border border-slate-600 px-2.5 py-1.5 rounded-xl shadow-xl text-[10px] text-white z-30 whitespace-nowrap transition">
                        <p className="font-bold text-indigo-300">{day.date}</p>
                        <p>Rev: {currency}{day.daily_revenue} | Profit: +{currency}{day.daily_profit}</p>
                      </div>

                      {/* Dual Bar pair */}
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${revHeight}%` }}
                          className="w-1/2 max-w-[16px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        />
                        {/* Profit Bar */}
                        <div
                          style={{ height: `${profitHeight}%` }}
                          className="w-1/2 max-w-[16px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        />
                      </div>

                      <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top Profitable Items (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white m-0">Top Profit Drivers</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">By Net Gain</span>
          </div>

          <div className="space-y-3">
            {topProfitable.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-slate-200 truncate m-0">{item.product_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono m-0">
                      {item.units_sold} sold • Sales: {currency}{item.total_sales}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-black text-emerald-400 text-sm m-0">
                    +{currency}{item.total_profit}
                  </p>
                  <p className="text-[10px] text-emerald-500/80 m-0">Net Gain</p>
                </div>
              </div>
            ))}

            {topProfitable.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No product profit data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Transaction History with Profit Column */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white m-0">Recent Order History & Profit</h3>
            <p className="text-xs text-slate-400 m-0">
              Itemized billing log with individual invoice profit calculations
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing latest {orders.length} orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Cost (COGS)</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                    {o.invoice_no}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    {o.customer_name || 'Walk-in'}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(o.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300">
                      {o.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {currency}{o.total_amount?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400">
                    {currency}{o.total_cost?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    +{currency}{o.profit?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewReceipt(o.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          settings={settings}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
