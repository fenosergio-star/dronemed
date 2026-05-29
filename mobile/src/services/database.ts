import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  pendingOrders: '@pending_orders',
  incidents: '@incidents',
  cachedCenters: '@cached_centers',
  cachedMedications: '@cached_medications',
  syncLog: '@sync_log',
  lastSync: '@last_sync',
  authUser: '@auth_user',
};

export { KEYS };

export async function initDatabase(): Promise<void> {
  const keys = Object.values(KEYS);
  for (const key of keys) {
    const val = await AsyncStorage.getItem(key);
    if (val === null) {
      if (key === KEYS.lastSync || key === KEYS.authUser) {
        await AsyncStorage.setItem(key, '');
      } else {
        await AsyncStorage.setItem(key, JSON.stringify([]));
      }
    }
  }
}

async function getArray(key: string): Promise<any[]> {
  const val = await AsyncStorage.getItem(key);
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

async function setArray(key: string, arr: any[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}

export async function saveOrderOffline(order: any): Promise<void> {
  const orders = await getArray(KEYS.pendingOrders);
  orders.push({ ...order, synced: 0, created_at: new Date().toISOString() });
  await setArray(KEYS.pendingOrders, orders);
}

export async function getPendingOrders(): Promise<any[]> {
  const orders = await getArray(KEYS.pendingOrders);
  return orders.filter((o: any) => o.synced === 0);
}

export async function getAllOrders(): Promise<any[]> {
  return getArray(KEYS.pendingOrders);
}

export async function markOrderSynced(id: string): Promise<void> {
  const orders = await getArray(KEYS.pendingOrders);
  const updated = orders.map((o: any) => (o.id === id ? { ...o, synced: 1 } : o));
  await setArray(KEYS.pendingOrders, updated);
}

export async function saveIncidentOffline(incident: any): Promise<void> {
  const incidents = await getArray(KEYS.incidents);
  incidents.push({ ...incident, synced: 0, reported_at: new Date().toISOString() });
  await setArray(KEYS.incidents, incidents);
}

export async function getUnsyncedIncidents(): Promise<any[]> {
  const incidents = await getArray(KEYS.incidents);
  return incidents.filter((i: any) => i.synced === 0);
}

export async function markIncidentSynced(id: string): Promise<void> {
  const incidents = await getArray(KEYS.incidents);
  const updated = incidents.map((i: any) => (i.id === id ? { ...i, synced: 1 } : i));
  await setArray(KEYS.incidents, updated);
}

export async function cacheCenters(centers: any[]): Promise<void> {
  await setArray(KEYS.cachedCenters, centers);
}

export async function getCachedCenters(): Promise<any[]> {
  return getArray(KEYS.cachedCenters);
}

export async function cacheMedications(medications: any[]): Promise<void> {
  await setArray(KEYS.cachedMedications, medications);
}

export async function getCachedMedications(): Promise<any[]> {
  return getArray(KEYS.cachedMedications);
}

export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastSync);
}

export async function setLastSync(time: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastSync, time);
}
