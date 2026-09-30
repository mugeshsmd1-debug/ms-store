import { localStore } from './localStore';
import { firebaseStore } from './firebaseStore';
import {
  isFirebaseConfigured,
  getFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig
} from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
let useLocalFallback = false;

const getActiveStore = () => (isFirebaseConfigured() ? firebaseStore : localStore);

async function requestWithFallback(path, options = {}, fallbackFn) {
  // If Firebase is configured, use Firebase directly for cloud data sync across devices
  if (isFirebaseConfigured()) {
    return fallbackFn();
  }

  if (useLocalFallback) {
    return fallbackFn();
  }

  const currentUser = localStore.getCurrentUser();
  const headers = {
    ...(options.headers || {}),
    ...(currentUser?.email ? { 'x-user-email': currentUser.email } : {}),
  };
  const enrichedOptions = { ...options, headers };

  try {
    const res = await fetch(`${API_BASE}${path}`, enrichedOptions);
    
    // Check if response is valid JSON from backend
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok && res.status === 404) {
      console.warn(`Backend endpoint ${path} returned 404. Switching to persistent storage.`);
      useLocalFallback = true;
      return fallbackFn();
    }

    if (!contentType.includes('application/json')) {
      console.warn(`Backend endpoint ${path} returned non-JSON. Switching to persistent storage.`);
      useLocalFallback = true;
      return fallbackFn();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    if (!useLocalFallback && (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      console.warn('Backend server is unreachable. Seamlessly activating storage engine.');
      useLocalFallback = true;
      return fallbackFn();
    }
    throw err;
  }
}

export const api = {
  // Firebase configuration status
  isFirebaseConfigured,
  getFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,

  // Settings
  async getSettings() {
    return requestWithFallback('/settings', {}, () => getActiveStore().getSettings());
  },

  async updateSettings(settings) {
    return requestWithFallback(
      '/settings',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      },
      () => getActiveStore().updateSettings(settings)
    );
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.lowStockOnly) query.append('lowStockOnly', 'true');

    return requestWithFallback(
      `/products?${query.toString()}`,
      {},
      () => getActiveStore().getProducts(params)
    );
  },

  async getCategories() {
    return requestWithFallback('/products/categories', {}, () => getActiveStore().getCategories());
  },

  async createProduct(productData) {
    return requestWithFallback(
      '/products',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      },
      () => getActiveStore().createProduct(productData)
    );
  },

  async updateProduct(id, productData) {
    return requestWithFallback(
      `/products/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      },
      () => getActiveStore().updateProduct(id, productData)
    );
  },

  async adjustStock(id, data) {
    return requestWithFallback(
      `/products/${id}/stock`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => getActiveStore().adjustStock(id, data)
    );
  },

  async deleteProduct(id) {
    return requestWithFallback(
      `/products/${id}`,
      { method: 'DELETE' },
      () => getActiveStore().deleteProduct(id)
    );
  },

  // Orders / Billing
  async createOrder(orderData) {
    return requestWithFallback(
      '/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      },
      () => getActiveStore().createOrder(orderData)
    );
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    return requestWithFallback(
      `/orders?${query.toString()}`,
      {},
      () => getActiveStore().getOrders(params)
    );
  },

  async getOrderById(id) {
    return requestWithFallback(`/orders/${id}`, {}, () => getActiveStore().getOrderById(id));
  },

  // User Authentication & Account Registry
  async getCurrentUser() {
    if (isFirebaseConfigured()) {
      return firebaseStore.getCurrentUser();
    }
    return requestWithFallback('/auth/me', {}, () => localStore.getCurrentUser());
  },

  async signup(userData) {
    if (isFirebaseConfigured()) {
      return firebaseStore.signup(userData);
    }
    return requestWithFallback(
      '/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      },
      () => localStore.signup(userData)
    );
  },

  async login(email, password) {
    if (isFirebaseConfigured()) {
      return firebaseStore.login(email, password);
    }
    return requestWithFallback(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      () => localStore.login(email, password)
    );
  },

  async logout() {
    if (isFirebaseConfigured()) {
      return firebaseStore.logout();
    }
    localStore.logout();
    return requestWithFallback(
      '/auth/logout',
      { method: 'POST' },
      () => ({ success: true })
    );
  },

  // Legacy auth compatibility
  async getAuth() {
    return this.getCurrentUser();
  },

  async saveAuth(authData) {
    return this.signup(authData);
  },

  async clearAuth() {
    return this.logout();
  },

  // Wipe all store data to start fresh (Zero dummy data)
  async clearAllData() {
    return requestWithFallback(
      '/system/reset',
      { method: 'POST' },
      () => getActiveStore().clearAllData()
    );
  },

  // Profit and Loss Analytics (Multi-horizon: calendar date, month, year, today, week, all)
  async getPnL(params = 'all') {
    let queryString = '';
    if (typeof params === 'string') {
      queryString = `range=${encodeURIComponent(params)}`;
    } else if (typeof params === 'object' && params !== null) {
      const q = new URLSearchParams();
      if (params.mode) q.append('mode', params.mode);
      if (params.range) q.append('range', params.range);
      if (params.date) q.append('date', params.date);
      if (params.month) q.append('month', params.month);
      if (params.year) q.append('year', params.year);
      queryString = q.toString();
    }

    return requestWithFallback(
      `/analytics/pnl${queryString ? '?' + queryString : ''}`,
      {},
      () => getActiveStore().getPnL(params)
    );
  },
};
