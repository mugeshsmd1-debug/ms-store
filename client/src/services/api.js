import { localStore } from './localStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
let useLocalFallback = false;

async function requestWithFallback(path, options, fallbackFn) {
  if (useLocalFallback) {
    return fallbackFn();
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    
    // Check if response is valid JSON from backend
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok && res.status === 404) {
      // Backend not present (e.g. static Netlify deployment)
      console.warn(`Backend endpoint ${path} returned 404. Switching to browser persistent storage.`);
      useLocalFallback = true;
      return fallbackFn();
    }

    if (!contentType.includes('application/json')) {
      // Returned HTML (e.g. Netlify fallback redirect to index.html)
      console.warn(`Backend endpoint ${path} returned non-JSON. Switching to browser persistent storage.`);
      useLocalFallback = true;
      return fallbackFn();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // If network connection failed or server not running (e.g. static Netlify)
    if (!useLocalFallback && (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      console.warn('Backend server is unreachable. Seamlessly activating browser storage engine for Netlify.');
      useLocalFallback = true;
      return fallbackFn();
    }
    throw err;
  }
}

export const api = {
  // Settings
  async getSettings() {
    return requestWithFallback('/settings', {}, () => localStore.getSettings());
  },

  async updateSettings(settings) {
    return requestWithFallback(
      '/settings',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      },
      () => localStore.updateSettings(settings)
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
      () => localStore.getProducts(params)
    );
  },

  async getCategories() {
    return requestWithFallback('/products/categories', {}, () => localStore.getCategories());
  },

  async createProduct(productData) {
    return requestWithFallback(
      '/products',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      },
      () => localStore.createProduct(productData)
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
      () => localStore.updateProduct(id, productData)
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
      () => localStore.adjustStock(id, data)
    );
  },

  async deleteProduct(id) {
    return requestWithFallback(
      `/products/${id}`,
      { method: 'DELETE' },
      () => localStore.deleteProduct(id)
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
      () => localStore.createOrder(orderData)
    );
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    return requestWithFallback(
      `/orders?${query.toString()}`,
      {},
      () => localStore.getOrders(params)
    );
  },

  async getOrderById(id) {
    return requestWithFallback(`/orders/${id}`, {}, () => localStore.getOrderById(id));
  },

  // Profit and Loss Analytics
  async getPnL(range = 'all') {
    return requestWithFallback(
      `/analytics/pnl?range=${range}`,
      {},
      () => localStore.getPnL(range)
    );
  },
};
