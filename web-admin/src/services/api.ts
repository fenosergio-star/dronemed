import axios from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getById: (id: string) => api.get(`/inventory/${id}`),
  getExpiring: (days?: number) => api.get('/inventory/expiring', { params: { days } }),
  getExpired: () => api.get('/inventory/expired'),
  getAlerts: () => api.get('/inventory/alerts'),
  rotate: () => api.get('/inventory/rotate'),
  add: (data: any) => api.post('/inventory', data),
  remove: (id: string) => api.delete(`/inventory/${id}`),
};

export const fleetAPI = {
  getAll: () => api.get('/fleet'),
  getAvailable: () => api.get('/fleet/available'),
  getLive: () => api.get('/fleet/live'),
  getById: (id: string) => api.get(`/fleet/${id}`),
  getBattery: (id: string) => api.get(`/fleet/${id}/battery`),
  register: (data: any) => api.post('/fleet', data),
  updateStatus: (id: string, data: any) => api.patch(`/fleet/${id}/status`, data),
};

export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getQueue: () => api.get('/orders/queue'),
  getNext: () => api.get('/orders/next'),
  getUrgent: (minPriority?: number) => api.get('/orders/urgent', { params: { minPriority } }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  processNext: () => api.post('/orders/process-next'),
  updateUrgency: (id: string, urgency: string) => api.patch(`/orders/${id}/urgency`, { urgency }),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
  cancel: (id: string) => api.delete(`/orders/${id}`),
};

export const routingAPI = {
  findRoute: (data: any) => api.post('/routing/find', data),
  checkBattery: (data: any) => api.post('/routing/check-battery', data),
  estimateTime: (data: any) => api.post('/routing/estimate-time', data),
};

export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getDeliveryTimes: () => api.get('/stats/delivery-times'),
  getFleet: () => api.get('/stats/fleet'),
  getInventoryAlerts: () => api.get('/stats/inventory'),
};

export const workflowAPI = {
  getPending: () => api.get('/orders/pending'),
  getActive: () => api.get('/orders/active'),
  validate: (id: string) => api.post(`/orders/${id}/validate`),
  assignDrone: (id: string, droneId: string) => api.post(`/orders/${id}/assign`, { droneId }),
  dispatch: (id: string, data: any) => api.post(`/orders/${id}/dispatch`, data),
  confirmDelivery: (id: string, code: string) => api.post(`/orders/${id}/confirm`, { code }),
};

export const fleetSimAPI = {
  getSimulated: () => api.get('/fleet/simulated'),
  charge: (id: string) => api.post(`/fleet/${id}/charge`),
  maintenance: (id: string, active: boolean) => api.post(`/fleet/${id}/maintenance`, { active }),
};

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role?: string) =>
    api.post('/auth/register', { name, email, password, role }),
  me: () => api.get('/auth/me'),
};

export const reportsAPI = {
  userActivity: () => api.get('/reports/user-activity'),
  userTransactions: (userId: string) => api.get('/reports/user-transactions', { params: { userId } }),
  exportCSV: (params?: any) => api.get('/reports/user-transactions', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
};

export default api;
