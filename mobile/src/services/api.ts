import axios from 'axios';

import Constants from 'expo-constants';

// Change this URL to your deployed backend URL (Render, Railway, etc.)
const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'http://10.225.103.33:3000/api';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

export async function submitOrder(order: any) {
  const { data } = await api.post('/orders', order);
  return data;
}

export async function confirmDelivery(orderId: string, code: string) {
  const { data } = await api.post(`/orders/${orderId}/confirm`, { code });
  return data;
}

export async function reportIncident(incident: any) {
  const { data } = await api.post('/incidents', incident);
  return data;
}

export async function getActiveDeliveries() {
  const { data } = await api.get('/fleet/active');
  return data;
}

export async function syncOrders(orders: any[]) {
  const { data } = await api.post('/sync/orders', { orders });
  return data;
}

export async function syncIncidents(incidents: any[]) {
  const { data } = await api.post('/sync/incidents', { incidents });
  return data;
}

export async function getCenters() {
  const { data } = await api.get('/centers');
  return data;
}
