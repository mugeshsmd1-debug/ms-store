import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import BillingView from './views/BillingView';
import InventoryView from './views/InventoryView';
import ProfitLossView from './views/ProfitLossView';
import SettingsView from './views/SettingsView';
import AuthModal from './components/AuthModal';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'inventory', 'pnl', 'settings'
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [loading, setLoading] = useState(true);

  // Fetch all initial store data from backend for the logged-in user
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = api.getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      const [settingsData, productsData, categoriesData] = await Promise.all([
        api.getSettings(),
        api.getProducts(),
        api.getCategories(),
      ]);
      setSettings(settingsData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load store data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to refresh products:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When user signs up or logs in
  const handleAuthenticated = async (userSession) => {
    setUser(userSession);
    await loadInitialData();
  };

  // When user logs out
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setProducts([]);
    setCategories([]);
    setSettings(null);
  };

  // Count low stock items for navbar warning badge
  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
  ).length;

  if (loading && user && !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Connecting to MS Store Cloud Backend...</p>
      </div>
    );
  }

  // If user is not logged in, show Sign Up / Log In Modal
  if (!user?.email) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        <AuthModal onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        settings={settings}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Tab View Content */}
      <main className="flex-1 pb-12">
        {activeTab === 'billing' && (
          <BillingView
            products={products}
            categories={categories}
            settings={settings}
            refreshProducts={refreshProducts}
            onOrderCompleted={refreshProducts}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            categories={categories}
            settings={settings}
            refreshProducts={refreshProducts}
          />
        )}

        {activeTab === 'pnl' && (
          <ProfitLossView
            settings={settings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            user={user}
            onResetData={loadInitialData}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="m-0">
            {settings?.shop_name || user?.shop_name || 'MS Store'} • POS, Stock & Profit/Loss Management
          </p>
          <p className="m-0 text-[11px] text-slate-400">
            Logged in as: <span className="text-indigo-400 font-mono font-semibold">{user.email}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
