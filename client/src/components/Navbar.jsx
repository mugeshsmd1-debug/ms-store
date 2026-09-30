import React from 'react';
import { ShoppingBag, Package, TrendingUp, Settings, AlertTriangle, Sparkles, LogOut, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, cartCount = 0, lowStockCount = 0, settings, user, onLogout }) {
  const tabs = [
    { id: 'billing', label: 'POS Billing', icon: ShoppingBag, badge: cartCount > 0 ? cartCount : null, badgeColor: 'bg-indigo-500' },
    { id: 'inventory', label: 'Stock & Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null, badgeColor: 'bg-amber-500' },
    { id: 'pnl', label: 'Reports & P&L', icon: TrendingUp },
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
                  {settings?.shop_name || user?.shop_name || 'MS Store'}
                </h1>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  POS PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 truncate max-w-[160px] sm:max-w-xs m-0">
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

          {/* Right Section: Low Stock Warning & Owner Profile Chip */}
          <div className="flex items-center gap-2 sm:gap-3">
            {lowStockCount > 0 && (
              <div
                onClick={() => setActiveTab('inventory')}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition"
                title="Click to view low stock items"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockCount} items low!</span>
              </div>
            )}

            {/* Owner Email ID Profile Chip with Log Out Button */}
            {user?.email && (
              <div className="flex items-center gap-2 p-1 pl-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/80">
                <div className="flex items-center gap-2 max-w-[130px] sm:max-w-[200px]">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(user.name || user.email || 'O')[0].toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-200 truncate m-0 leading-tight">
                      {user.name || 'Store Owner'}
                    </p>
                    <p className="text-[10px] text-indigo-400 truncate m-0 leading-tight">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Log Out of this Account"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-700/80 hover:bg-rose-600 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
