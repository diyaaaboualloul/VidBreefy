import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const csrfToken = localStorage.getItem('vidbreefy_csrf');
    const sessionUser = localStorage.getItem('vidbreefy_user');
    console.log('[API Request]', config.method?.toUpperCase(), config.url,
      '| has csrf:', !!csrfToken, '| has user:', !!sessionUser,
      '| csrf head:', csrfToken ? csrfToken.slice(0, 16) + '...' : 'none');
    if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, '->', response.status);
    return response;
  },
  (error) => {
    const csrfToken = localStorage.getItem('vidbreefy_csrf');
    console.log('[API Error]', error.config?.method?.toUpperCase(), error.config?.url, '->', error.response?.status, error.response?.data);
    console.log('[API Error] Stored CSRF token:', csrfToken ? 'YES (' + csrfToken.slice(0,16) + '...)' : 'NO');
    if (error.response?.status === 401) {
      localStorage.removeItem('vidbreefy_token');
      localStorage.removeItem('vidbreefy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateEmail: (data) => api.put('/auth/email', data),
  changePassword: (data) => api.put('/auth/password', data),
  upgradeToPro: () => api.put('/auth/upgrade'),
  deleteAccount: () => api.delete('/auth/account'),
};

// User API Keys (Pro users)
export const userAPI = {
  getApiKeys: () => api.get('/user/api-keys'),
  addApiKey: (data) => api.post('/user/api-keys', data),
  deleteApiKey: (provider) => api.delete(`/user/api-keys/${provider}`),
  getApiKey: (provider) => api.get(`/user/api-keys/${provider}/key`),
};

// AI Streaming API (for website SummarizePage)
export const aiAPI = {
  stream: (data) => api.post('/ai/stream', data, { responseType: 'stream' }),
};

// Summaries API
export const summariesAPI = {
  create: (data) => api.post('/summaries', data),
  getAll: (params) => api.get('/summaries', { params }),
  getOne: (id) => api.get(`/summaries/${id}`),
  delete: (id) => api.delete(`/summaries/${id}`),
  getByHash: (hash) => api.get(`/summaries/public/${hash}`),
  toggleBookmark: (id) => api.patch(`/summaries/${id}/bookmark`),
  incrementView: (hash) => api.patch(`/summaries/public/${hash}/view`),
};

// Admin API
export const adminAPI = {
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  exportUsers: () => api.get('/admin/users/export', { responseType: 'blob' }),

  // AI Models
  getModels: () => api.get('/admin/ai-models'),
  updateModel: (id, data) => api.put(`/admin/ai-models/${id}`, data),

  // Pricing
  getPricing: () => api.get('/admin/pricing'),
  updatePricing: (data) => api.put('/admin/pricing', data),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  saveYoutubeKey: (key) => api.post('/admin/settings/youtube-key', { apiKey: key }),
  updateSettings: (data) => api.put('/admin/settings', data),

  // Content
  getContent: () => api.get('/admin/content'),
  updateContent: (data) => api.put('/admin/content', data),

  // Payments
  getPayments: (params) => api.get('/admin/payments', { params }),

  // Audit Log
  getAuditLog: (params) => api.get('/admin/audit-log', { params }),

  // Trash
  getTrash: () => api.get('/admin/trash'),
  restoreTrash: (type, id) => api.post(`/admin/trash/${type}/${id}/restore`),
  permanentDelete: (type, id) => api.delete(`/admin/trash/${type}/${id}`),
};

// Public admin content API
export const publicContentAPI = {
  getContent: (key) => api.get(`/admin/content/${key}`),
};

export default api;