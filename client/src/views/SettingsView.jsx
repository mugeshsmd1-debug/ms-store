import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Store,
  Phone,
  MapPin,
  Percent,
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsView({ settings, onSettingsUpdated, auth, onAuthUpdated, onResetData }) {
  const [formData, setFormData] = useState({
    shop_name: 'MS Store',
    tagline: 'Smart Retail & Inventory Management',
    phone: '',
    address: '',
    currency_symbol: '₹',
    tax_percentage: 5.0,
  });

  const [authFormData, setAuthFormData] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_pin: '',
  });

  const [saving, setSaving] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedAuthSuccess, setSavedAuthSuccess] = useState(false);

  // Danger zone state
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || '',
        tagline: settings.tagline || '',
        phone: settings.phone || '',
        address: settings.address || '',
        currency_symbol: settings.currency_symbol || '₹',
        tax_percentage: settings.tax_percentage ?? 5.0,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (auth) {
      setAuthFormData({
        owner_name: auth.owner_name || settings?.owner_name || '',
        owner_email: auth.owner_email || settings?.owner_email || '',
        owner_phone: auth.owner_phone || settings?.phone || '',
        owner_pin: auth.owner_pin || settings?.owner_pin || '',
      });
    }
  }, [auth, settings]);

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateSettings(formData);
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAuth = async (e) => {
    e.preventDefault();
    try {
      setSavingAuth(true);
      const updatedAuth = await api.saveAuth({
        ...auth,
        ...authFormData,
        shop_name: formData.shop_name,
      });
      if (onAuthUpdated) onAuthUpdated(updatedAuth);
      setSavedAuthSuccess(true);
      setTimeout(() => setSavedAuthSuccess(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAuth(false);
    }
  };

  const handleResetAllData = async () => {
    try {
      setResetting(true);
      await api.clearAllData();
      if (onResetData) await onResetData();
      setShowResetConfirm(false);
      alert('All products and sales data have been wiped clean. Your store is now starting 100% fresh!');
    } catch (err) {
      alert(err.message || 'Failed to reset store data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Store Owner Profile & Gmail Authentication */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white m-0">Store Owner & Gmail Profile</h2>
            <p className="text-xs text-slate-400 m-0">
              Your registered Gmail credentials and 4-digit POS terminal security PIN
            </p>
          </div>
        </div>

        {savedAuthSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Owner authentication profile updated successfully!</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmitAuth} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Owner Gmail Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-indigo-400" />
                <input
                  type="email"
                  required
                  value={authFormData.owner_email}
                  onChange={(e) => setAuthFormData({ ...authFormData, owner_email: e.target.value })}
                  placeholder="e.g. owner@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Owner Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={authFormData.owner_name}
                  onChange={(e) => setAuthFormData({ ...authFormData, owner_name: e.target.value })}
                  placeholder="e.g. Mugesh"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Owner Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={authFormData.owner_phone}
                  onChange={(e) => setAuthFormData({ ...authFormData, owner_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Terminal PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                POS Terminal Security PIN (4-6 digits) *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-amber-400" />
                <input
                  type="password"
                  maxLength={6}
                  value={authFormData.owner_pin}
                  onChange={(e) => setAuthFormData({ ...authFormData, owner_pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white tracking-widest font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingAuth}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {savingAuth ? 'Updating Profile...' : 'Save Owner Profile & PIN'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Shop & POS Configuration */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white m-0">Store Details & Billing Settings</h2>
            <p className="text-xs text-slate-400 m-0">
              Store branding, address for printed invoice receipts, and taxation defaults
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Store settings saved successfully! Your receipts and POS have been updated.</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmitSettings} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shop Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shop / Business Name *
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store Tagline / Slogan
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Phone / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Currency Symbol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Currency Symbol *
              </label>
              <div className="flex gap-2">
                {['₹', '$', '€', '£', 'AED', '¥'].map((sym) => (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => setFormData({ ...formData, currency_symbol: sym })}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
                      formData.currency_symbol === sym
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shop Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Store Address (Printed on Bills)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tax Percentage */}
          <div className="sm:w-1/2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default Tax / GST Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={formData.tax_percentage}
                onChange={(e) => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Submit Settings */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Store Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Danger Zone: Factory Reset / Start Fresh (Zero Dummy Data) */}
      <div className="bg-slate-900/90 border border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-rose-950/80">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-rose-400 m-0">Reset Store / Start Fresh</h2>
            <p className="text-xs text-slate-400 m-0">
              Clear all inventory products, order transactions, and stock logs to start completely fresh
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs text-slate-300 m-0">
            Need to start with zero dummy items? This action wipes all sales history and inventory items so you can begin adding your real products and records from scratch.
          </p>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Store Data & Start Fresh</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-700/60 space-y-3">
              <p className="text-xs font-bold text-rose-300 m-0 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Are you absolutely sure? This will permanently delete all products and invoices!
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={resetting}
                  onClick={handleResetAllData}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{resetting ? 'Wiping Store Data...' : 'Yes, Wipe Everything & Start Fresh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
