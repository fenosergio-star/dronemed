import {
  getPendingOrders, markOrderSynced,
  getUnsyncedIncidents, markIncidentSynced,
  cacheCenters, cacheMedications,
  setLastSync,
} from './database';
import { syncPush, getCenters, getMedications } from './api';

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
    const pendingIncidents = await getUnsyncedIncidents();
    if (pendingOrders.length > 0 || pendingIncidents.length > 0) {
      const res = await syncPush(pendingOrders, pendingIncidents);
      if (res?.synced) {
        for (const o of pendingOrders) { await markOrderSynced(o.id); result.orders++; }
        for (const i of pendingIncidents) { await markIncidentSynced(i.id); result.incidents++; }
      }
    }
    const [centers, meds] = await Promise.all([getCenters(), getMedications()]);
    if (centers?.length) { await cacheCenters(centers); }
    if (meds?.length) { await cacheMedications(meds); }
    await setLastSync(new Date().toISOString());
  } catch {
    console.warn('Sync failed (offline)');
  }
  return result;
}
