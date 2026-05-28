const store: Record<string, any[]> = {};

export async function initDatabase(): Promise<void> {
  store['pending_orders'] = [];
  store['incidents'] = [];
  store['cached_centers'] = [];
  store['sync_log'] = [];
}

export async function saveOrderOffline(order: any): Promise<void> {
  if (!store['pending_orders']) store['pending_orders'] = [];
  store['pending_orders'].push({ ...order, synced: 0, created_at: new Date().toISOString() });
}

export async function getPendingOrders(): Promise<any[]> {
  return (store['pending_orders'] || []).filter((o: any) => o.synced === 0);
}

export async function getAllOrders(): Promise<any[]> {
  return store['pending_orders'] || [];
}

export async function markOrderSynced(id: string): Promise<void> {
  if (!store['pending_orders']) return;
  store['pending_orders'] = store['pending_orders'].map((o: any) => o.id === id ? { ...o, synced: 1 } : o);
}

export async function saveIncidentOffline(incident: any): Promise<void> {
  if (!store['incidents']) store['incidents'] = [];
  store['incidents'].push({ ...incident, synced: 0, reported_at: new Date().toISOString() });
}

export async function getUnsyncedIncidents(): Promise<any[]> {
  return (store['incidents'] || []).filter((i: any) => i.synced === 0);
}

export async function markIncidentSynced(id: string): Promise<void> {
  if (!store['incidents']) return;
  store['incidents'] = store['incidents'].map((i: any) => i.id === id ? { ...i, synced: 1 } : i);
}

export async function cacheCenters(centers: any[]): Promise<void> {
  store['cached_centers'] = centers;
}

export async function getCachedCenters(): Promise<any[]> {
  return store['cached_centers'] || [];
}

export async function getLastSync(): Promise<string | null> {
  return null;
}
