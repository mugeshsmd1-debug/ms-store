import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Store, Phone, MapPin, DollarSign, Percent } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsView({ settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({
    shop_name: 'MS Store',
    tagline: 'Smart Retail & Inventory Management',
    phone: '+91 98765 43210',
    address: '124 Market Road, Commercial Hub',
    currency_symbol: '₹',
    tax_percentage: 5.0,
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSubmit = async (e) => {
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white m-0">Shop & POS Configuration</h2>
            <p className="text-xs text-slate-400 m-0">
              Customize shop branding, contact information, receipt headers, and taxation
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Store settings saved successfully! Your receipts and POS have been updated.</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-6">
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

          {/* Submit */}
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
    </div>
  );
}
