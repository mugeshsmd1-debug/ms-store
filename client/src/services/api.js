const API_BASE = import.meta.env.VITE_API_URL || '/api';
const SESSION_KEY = 'ms_store_active_user';

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

  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Backend server returned non-JSON response from ${path}. If you are on Netlify, please ensure your backend URL is set via VITE_API_URL.`
      );
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error(
        `Cannot connect to MS Store backend server at ${API_BASE}. Please verify your cloud backend is online.`
      );
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

  // Factory Reset (Zero Dummy Data)
  async clearAllData() {
    return request('/system/reset', { method: 'POST' });
  },
};
