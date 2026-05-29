import axios from 'axios';
import Constants from 'expo-constants';
import { getToken } from './auth';

const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'http://10.225.103.33:3000/api';

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -- Orders --
export async function submitOrder(order: any) {
  const { data } = await api.post('/orders', order);
  return data;
}

export async function confirmDelivery(orderId: string, code: string) {
  const { data } = await api.post(`/orders/${orderId}/confirm`, { code });
  return data;
}

export async function getMyOrders() {
  const { data } = await api.get('/orders/my');
  return data;
}

// -- Incidents --
export async function reportIncident(incident: any) {
  const { data } = await api.post('/incidents', incident);
  return data;
}

// -- Fleet --
export async function getActiveDeliveries() {
  const { data } = await api.get('/fleet/active');
  return data;
}

// -- Sync --
export async function syncOrders(orders: any[]) {
  const { data } = await api.post('/sync/orders', { orders });
  return data;
}

export async function syncIncidents(incidents: any[]) {
  const { data } = await api.post('/sync/incidents', { incidents });
  return data;
}

// -- Centers --
export async function getCenters() {
  const { data } = await api.get('/centers');
  return data;
}

// -- Medications --
export async function getMedications() {
  const { data } = await api.get('/medications');
  return data;
}
