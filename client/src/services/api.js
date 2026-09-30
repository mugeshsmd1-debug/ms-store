const SESSION_KEY = 'ms_store_active_user';
const CUSTOM_API_KEY = 'ms_store_backend_url';

export const DEFAULT_SUPABASE_BACKEND = 'https://thjfjhekmqwgtypbhlar.supabase.co/functions/v1/api';

export function normalizeApiUrl(raw) {
  if (!raw) return '';
  let url = raw.trim();
  url = url.replace(/\/+$/, '');
  return url;
}

export function getEffectiveApiBase() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }
  try {
    const custom = (localStorage.getItem(CUSTOM_API_KEY) || '').trim();
    if (custom) {
      return normalizeApiUrl(custom);
    }
  } catch {}
  return DEFAULT_SUPABASE_BACKEND;
}

export function setCustomApiUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(CUSTOM_API_KEY);
    } else {
      localStorage.setItem(CUSTOM_API_KEY, normalizeApiUrl(url));
    }
  } catch {}
}

export function getCustomApiUrl() {
  try {
    return localStorage.getItem(CUSTOM_API_KEY) || '';
  } catch {
    return '';
  }
}

function getSessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSessionUser(user) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to store session:', e);
  }
}

async function request(path, options = {}) {
  const currentUser = getSessionUser();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(currentUser?.email ? { 'x-user-email': currentUser.email } : {}),
  };

  const apiBase = getEffectiveApiBase();
  const url = `${apiBase}${path.startsWith('/') ? path : '/' + path}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(`Supabase backend returned invalid response format (${contentType}, Status: ${res.status}).`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error(`Cannot reach Supabase backend at ${apiBase}. Please check your internet connection.`);
    }
    throw err;
  }
}

export const api = {
  // Session Authentication
  getCurrentUser() {
    return getSessionUser();
  },

  async signup(userData) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data?.user) {
      setSessionUser(data.user);
    }
    return data.user;
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.user) {
      setSessionUser(data.user);
    }
    return data.user;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {}
    setSessionUser(null);
    return { success: true };
  },

  // Settings
  async getSettings() {
    return request('/settings');
  },

  async updateSettings(settings) {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.lowStockOnly) query.append('lowStockOnly', 'true');

    const qs = query.toString();
    return request(`/products${qs ? '?' + qs : ''}`);
  },

  async getCategories() {
    return request('/products/categories');
  },

  async createProduct(productData) {
    return request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(id, productData) {
    return request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  async adjustStock(id, data) {
    return request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' });
  },

  // Orders / Billing
  async createOrder(orderData) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    const qs = query.toString();
    return request(`/orders${qs ? '?' + qs : ''}`);
  },

  async getOrderById(id) {
    return request(`/orders/${id}`);
  },

  // Delete all bill history alone (keeps products & catalog intact, verified by password)
  async clearBillHistory(password) {
    return request('/orders/clear', {
      method: 'DELETE',
      headers: {
        'x-auth-password': password || '',
      },
      body: JSON.stringify({ password: password || '' }),
    });
  },

  // Delete single bill / order (verified by account password)
  async deleteOrder(id, password) {
    return request(`/orders/${id}`, {
      method: 'DELETE',
      headers: {
        'x-auth-password': password || '',
      },
      body: JSON.stringify({ password: password || '' }),
    });
  },

  // Analytics & PnL
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

    return request(`/analytics/pnl${queryString ? '?' + queryString : ''}`);
  },

  // Factory Reset
  async clearAllData() {
    return request('/system/reset', { method: 'POST' });
  },

  // Backend Connectivity Diagnostics
  getEffectiveBase() {
    return getEffectiveApiBase();
  },
  setCustomBackendUrl(url) {
    setCustomApiUrl(url);
  },
  getCustomBackendUrl() {
    return getCustomApiUrl();
  },
  async testBackendConnection(testUrl) {
    const base = testUrl ? normalizeApiUrl(testUrl) : getEffectiveApiBase();
    try {
      const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      return { ok: true, data, url: base };
    } catch (e1) {
      try {
        const res2 = await fetch(base, { signal: AbortSignal.timeout(6000) });
        const data2 = await res2.json();
        return { ok: true, data: data2, url: base };
      } catch (e2) {
        return { ok: false, error: e2.message || e1.message, url: base };
      }
    }
  },
};
