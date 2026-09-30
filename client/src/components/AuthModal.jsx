import React, { useState } from 'react';
import { Mail, Lock, User, Store, Phone, ShieldCheck, KeyRound, Sparkles, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function AuthModal({ auth, onAuthenticated, settings }) {
  const isProfileConfigured = Boolean(auth?.owner_email && auth?.owner_pin);

  const [mode, setMode] = useState(isProfileConfigured ? 'unlock' : 'setup'); // 'setup' | 'unlock'
  
  // Setup fields
  const [formData, setFormData] = useState({
    owner_name: auth?.owner_name || '',
    owner_email: auth?.owner_email || '',
    owner_phone: auth?.owner_phone || settings?.phone || '',
    shop_name: auth?.shop_name || settings?.shop_name || 'MS Store',
    owner_pin: auth?.owner_pin || '',
    confirm_pin: auth?.owner_pin || '',
  });

  // Unlock field
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form submit for setup/register
  const handleSetupSubmit = (e) => {
    e.preventDefault();
    setError('');

    const email = formData.owner_email.trim();
    const name = formData.owner_name.trim();
    const shop = formData.shop_name.trim();
    const pin = formData.owner_pin.trim();
    const confirmPin = formData.confirm_pin.trim();

    if (!email) {
      setError('Please enter your Gmail address.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    if (!name) {
      setError('Please enter your full name.');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('Security PIN must be at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Security PINs do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const authRecord = {
        owner_name: name,
        owner_email: email,
        owner_phone: formData.owner_phone.trim(),
        shop_name: shop || 'MS Store',
        owner_pin: pin,
        authenticated_at: new Date().toISOString(),
      };
      onAuthenticated(authRecord);
    } catch (err) {
      setError(err.message || 'Failed to save authentication profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit for PIN unlock
  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (enteredPin.trim() === String(auth?.owner_pin || '').trim()) {
      onAuthenticated({
        ...auth,
        authenticated_at: new Date().toISOString(),
      });
    } else {
      setError('Incorrect Security PIN. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 preserve-3d">
        {/* Decorative Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-xl shadow-indigo-600/30 mb-3 preserve-3d">
            {mode === 'setup' ? (
              <Sparkles className="w-7 h-7 animate-pulse" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight m-0">
            {mode === 'setup' ? 'Owner Setup & Authentication' : 'Terminal Locked'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm m-0">
            {mode === 'setup'
              ? 'Enter your Gmail and store details to activate your secure POS & Inventory terminal'
              : `Welcome back, ${auth?.owner_name || 'Owner'}. Enter your 4-digit PIN to access terminal.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Setup / Register Form */}
        {mode === 'setup' && (
          <form noValidate onSubmit={handleSetupSubmit} className="space-y-4">
            {/* Gmail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Gmail Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-indigo-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="e.g. Mugesh"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Shop / Business Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Shop Name *
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="MS Store"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Phone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Security PIN Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Security PIN (4-6 digits) *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-amber-400" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={formData.owner_pin}
                    onChange={(e) => setFormData({ ...formData, owner_pin: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white tracking-widest font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Security PIN *
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={formData.confirm_pin}
                    onChange={(e) => setFormData({ ...formData, confirm_pin: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white tracking-widest font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 m-0">
              🔒 Your Gmail and Security PIN protect your sales data, stock adjustments, and profit reports.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-[0.98] disabled:opacity-50"
            >
              <span>Initialize & Access POS Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Unlock Form */}
        {mode === 'unlock' && (
          <form noValidate onSubmit={handleUnlockSubmit} className="space-y-5">
            {/* Account Card */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                {(auth?.owner_name || 'M')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm truncate m-0">{auth?.owner_name || 'Store Owner'}</p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 truncate mt-0.5">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{auth?.owner_email}</span>
                </div>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">{auth?.shop_name || 'MS Store'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                Enter 4-Digit Security PIN
              </label>
              <div className="max-w-[200px] mx-auto">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="••••"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-2.5 bg-slate-800 border-2 border-indigo-500/50 rounded-2xl text-white focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock POS Terminal</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="text-xs text-slate-400 hover:text-indigo-400 inline-flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Switch Owner Account / Update Details</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
