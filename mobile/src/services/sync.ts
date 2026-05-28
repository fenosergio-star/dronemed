import { getPendingOrders, markOrderSynced, getUnsyncedIncidents, markIncidentSynced, saveOrderOffline, getLastSync, cacheCenters } from './database';
import { syncOrders, syncIncidents, getCenters } from './api';

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000) {
  syncTimer = setInterval(doSync, intervalMs);
}

export function stopAutoSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

export async function doSync(): Promise<{ orders: number; incidents: number }> {
  const result = { orders: 0, incidents: 0 };
  try {
    const pendingOrders = await getPendingOrders();
    if (pendingOrders.length > 0) {
      const res = await syncOrders(pendingOrders);
      if (res?.synced) {
        for (const o of pendingOrders) { await markOrderSynced(o.id); }
        result.orders = pendingOrders.length;
      }
    }
    const pendingIncidents = await getUnsyncedIncidents();
    if (pendingIncidents.length > 0) {
      const res = await syncIncidents(pendingIncidents);
      if (res?.synced) {
        for (const i of pendingIncidents) { await markIncidentSynced(i.id); }
        result.incidents = pendingIncidents.length;
      }
    }
    const centers = await getCenters();
    if (centers?.length) { await cacheCenters(centers); }
  } catch (e) {
    console.warn('Sync failed (offline):', e);
  }
  return result;
}
