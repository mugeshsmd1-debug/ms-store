import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  X,
  ExternalLink,
  Flame,
  ShieldCheck,
  AlertCircle,
  Copy,
  Trash2,
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';
import {
  isFirebaseConfigured,
  getFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig
} from '../services/firebase';

export default function CloudSyncModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isConfigured = isFirebaseConfigured();
  const currentConfig = getFirebaseConfig();

  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Automatically parses either JSON or JavaScript object syntax
  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    const text = rawInput.trim();
    if (!text) {
      setError('Please paste your Firebase Web Config code or JSON.');
      return;
    }

    try {
      let configObj = null;

      // Check if user pasted standard JS object: const firebaseConfig = { ... };
      const apiKeyMatch = text.match(/apiKey:\s*["']([^"']+)["']/);
      const authDomainMatch = text.match(/authDomain:\s*["']([^"']+)["']/);
      const projectIdMatch = text.match(/projectId:\s*["']([^"']+)["']/);
      const storageBucketMatch = text.match(/storageBucket:\s*["']([^"']+)["']/);
      const messagingSenderIdMatch = text.match(/messagingSenderId:\s*["']([^"']+)["']/);
      const appIdMatch = text.match(/appId:\s*["']([^"']+)["']/);

      if (apiKeyMatch && projectIdMatch) {
        configObj = {
          apiKey: apiKeyMatch[1],
          authDomain: authDomainMatch ? authDomainMatch[1] : `${projectIdMatch[1]}.firebaseapp.com`,
          projectId: projectIdMatch[1],
          storageBucket: storageBucketMatch ? storageBucketMatch[1] : `${projectIdMatch[1]}.appspot.com`,
          messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
          appId: appIdMatch ? appIdMatch[1] : '',
        };
      } else {
        // Try parsing as JSON
        configObj = JSON.parse(text);
      }

      if (!configObj || !configObj.apiKey || !configObj.projectId) {
        throw new Error('Config missing "apiKey" or "projectId". Please verify the copied snippet.');
      }

      saveFirebaseConfig(configObj);
      onClose();
    } catch (err) {
      setError('Could not parse Firebase config. Please paste the exact firebaseConfig code from Firebase Console.');
    }
  };

  const handleClear = () => {
    if (confirm('Disconnect Firebase Cloud Sync? The app will switch back to local browser storage.')) {
      clearFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/70 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 flex-shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight m-0">
              Cloud Sync & Mobile Login
            </h2>
            <p className="text-xs text-slate-400 m-0">
              Connect Google Firebase to synchronize your store across PC and Mobile
            </p>
          </div>
        </div>

        {/* Current Status Pill */}
        <div
          className={`p-4 rounded-2xl border mb-6 flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-white m-0">
              {isConfigured ? '🟢 Cloud Sync is ACTIVE (Google Firebase)' : '🟡 Local Storage Mode (Not Synced Across Devices)'}
            </p>
            <p className="m-0 text-slate-300">
              {isConfigured
                ? `Connected to project "${currentConfig?.projectId}". You can log in with the same Email and Password on your Mobile phone, PC, and any device!`
                : 'Your store is currently using the local browser storage on this device. Connect Firebase below so you can log in on your Mobile phone with the same ID.'}
            </p>
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold underline pt-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Cloud Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Device Sync diagram */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-6 text-xs flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-1">
            <Laptop className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-white">Your PC</span>
            <span className="text-[10px] text-slate-400">Add products & bills</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-0.5 bg-gradient-to-r from-indigo-500 via-amber-400 to-indigo-500 animate-pulse my-2" />
            <span className="text-[10px] text-amber-300 font-mono">Firebase Cloud</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Smartphone className="w-6 h-6 text-sky-400" />
            <span className="font-bold text-white">Your Mobile</span>
            <span className="text-[10px] text-slate-400">Real-time synced ID</span>
          </div>
        </div>

        {/* 3 Quick Setup Steps */}
        <div className="space-y-3 mb-6 text-xs text-slate-300">
          <h3 className="text-sm font-bold text-white m-0 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>How to connect in 2 minutes (100% Free):</span>
          </h3>

          <div className="space-y-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 font-mono text-[11px]">
            <p className="m-0">
              <strong className="text-indigo-400">1.</strong> Open{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 underline inline-flex items-center gap-1"
              >
                console.firebase.google.com <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and click <strong>"Create a project"</strong> (e.g. <em>ms-store</em>).
            </p>
            <p className="m-0">
              <strong className="text-indigo-400">2.</strong> In the left sidebar:
              <br />• Click <strong>Authentication</strong> &gt; <em>Get Started</em> &gt; Enable <strong>Email/Password</strong>.
              <br />• Click <strong>Firestore Database</strong> &gt; <em>Create database</em> &gt; Start in <strong>Test mode</strong>.
            </p>
            <p className="m-0">
              <strong className="text-indigo-400">3.</strong> Click the <strong>Gear icon ⚙️ (Project settings)</strong> &gt; General, scroll down to <strong>"Your apps"</strong>, click the <strong>Web icon &lt;/&gt;</strong>, and copy the <strong>firebaseConfig</strong> code snippet.
            </p>
          </div>
        </div>

        {/* Paste Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Paste your <code className="text-amber-400">firebaseConfig</code> code snippet here:
            </label>
            <textarea
              rows={4}
              required
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "ms-store.firebaseapp.com",\n  projectId: "ms-store",\n  ...\n};`}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Continue with Local Mode
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center gap-2 transition transform active:scale-95"
            >
              <Flame className="w-4 h-4" />
              <span>Connect Firebase Cloud Sync</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
