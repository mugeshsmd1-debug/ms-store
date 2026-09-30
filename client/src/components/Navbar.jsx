import React from 'react';
import { ShoppingBag, LayoutGrid, Package, TrendingUp, Settings, AlertTriangle, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, cartCount = 0, lowStockCount = 0, settings }) {
  const tabs = [
    { id: 'billing', label: 'POS Billing', icon: ShoppingBag, badge: cartCount > 0 ? cartCount : null, badgeColor: 'bg-indigo-500' },
    { id: 'inventory', label: 'Stock & Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null, badgeColor: 'bg-amber-500' },
    { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Shop Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/25 preserve-3d group cursor-pointer">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white m-0">
                  {settings?.shop_name || 'MS Store'}
                </h1>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  POS PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 truncate max-w-[200px] sm:max-w-xs m-0">
                {settings?.tagline || 'Smart Retail & Billing'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>

                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Low Stock Warning Alert Pill */}
          {lowStockCount > 0 && (
            <div
              onClick={() => setActiveTab('inventory')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition"
              title="Click to view low stock items"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockCount} items low on stock!</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
