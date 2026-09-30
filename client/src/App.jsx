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
  const [auth, setAuth] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all initial store data and auth profile
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsData, productsData, categoriesData, authData] = await Promise.all([
        api.getSettings(),
        api.getProducts(),
        api.getCategories(),
        api.getAuth(),
      ]);
      setSettings(settingsData);
      setProducts(productsData);
      setCategories(categoriesData);
      setAuth(authData);

      // If no owner profile is set up, terminal is locked / requires setup
      if (!authData?.owner_email || !authData?.owner_pin) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
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

  const handleAuthenticated = async (authRecord) => {
    try {
      const saved = await api.saveAuth(authRecord);
      setAuth(saved);
      setIsLocked(false);
      if (saved.shop_name && settings) {
        setSettings((prev) => ({ ...prev, shop_name: saved.shop_name }));
      }
    } catch (err) {
      console.error('Failed to save auth:', err);
      setAuth(authRecord);
      setIsLocked(false);
    }
  };

  // Count low stock items for navbar warning badge
  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
  ).length;

  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Loading MS Store POS & Inventory Engine...</p>
      </div>
    );
  }

  // Show Auth Modal if not authenticated or terminal is locked
  const shouldShowAuthModal = isLocked || !auth?.owner_email || !auth?.owner_pin;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        settings={settings}
        auth={auth}
        onLock={() => setIsLocked(true)}
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
            auth={auth}
            onAuthUpdated={(newAuth) => setAuth(newAuth)}
            onResetData={loadInitialData}
          />
        )}
      </main>

      {/* Owner Authentication / Terminal Lock Modal */}
      {shouldShowAuthModal && (
        <AuthModal
          auth={auth}
          settings={settings}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {/* Footer */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="m-0">
            {settings?.shop_name || 'MS Store'} • POS, Stock & Profit/Loss Management
          </p>
          <p className="m-0 text-[11px] text-slate-400">
            Authenticated for: {auth?.owner_email || 'Owner Setup Pending'}
          </p>
        </div>
      </footer>
    </div>
  );
}
