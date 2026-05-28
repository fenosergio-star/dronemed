import { getPool } from './postgres';
import { v4 as uuidv4 } from 'uuid';

const pool = () => getPool();

async function query(text: string, params?: any[]) {
  return pool().query(text, params);
}

async function now() {
  const { rows } = await query('SELECT NOW()::text AS ts');
  return rows[0].ts;
}

async function upsertTimestamp(table: string, id: string) {
  await query(`UPDATE ${table} SET updated_at = NOW() WHERE id = $1`, [id]);
}

export const HealthCenterRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM health_centers ORDER BY name');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      coordinates: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
      altitude: r.altitude,
      region: r.region,
      district: r.district,
      accessible: r.accessible,
    }));
  },
};

export const InventoryRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM inventory ORDER BY expiration_date');
    return rows.map(mapInventory);
  },
  async getById(id: string) {
    const { rows } = await query('SELECT * FROM inventory WHERE id = $1', [id]);
    return rows.length ? mapInventory(rows[0]) : null;
  },
  async create(data: any) {
    const id = data.id || uuidv4();
    await query(
      `INSERT INTO inventory (id, name, type, quantity, expiration_date, batch_number, storage_temp_min, storage_temp_max, health_center_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, data.name, data.type, data.quantity || 0, data.expirationDate, data.batchNumber,
       data.storageTempMin, data.storageTempMax, data.healthCenterId || 'hc-001']
    );
    return this.getById(id);
  },
  async remove(id: string) {
    const { rowCount } = await query('DELETE FROM inventory WHERE id = $1', [id]);
    return rowCount! > 0;
  },
  async getExpiringSoon(days: number) {
    const { rows } = await query(
      `SELECT * FROM inventory WHERE expiration_date <= (CURRENT_DATE + $1::interval) ORDER BY expiration_date`,
      [`${days} days`]
    );
    return rows.map(mapInventory);
  },
  async getExpired() {
    const { rows } = await query(
      'SELECT * FROM inventory WHERE expiration_date < CURRENT_DATE ORDER BY expiration_date'
    );
    return rows.map(mapInventory);
  },
  async getAlerts() {
    const expired = await this.getExpired();
    const expiring = await this.getExpiringSoon(30);
    return { expired, expiring };
  },
};

function mapInventory(r: any) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    quantity: r.quantity,
    expirationDate: r.expiration_date ? r.expiration_date.toISOString().slice(0, 10) : '',
    batchNumber: r.batch_number,
    storageTempMin: parseFloat(r.storage_temp_min),
    storageTempMax: parseFloat(r.storage_temp_max),
    healthCenterId: r.health_center_id,
    createdAt: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  };
}

export const DroneRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM drones ORDER BY name');
    return rows.map(mapDrone);
  },
  async getById(id: string) {
    const { rows } = await query('SELECT * FROM drones WHERE id = $1', [id]);
    return rows.length ? mapDrone(rows[0]) : null;
  },
  async create(data: any) {
    const id = data.id || uuidv4();
    await query(
      `INSERT INTO drones (id, name, model, battery_capacity, current_battery, max_range_km, payload_capacity_kg, home_base_id, status, current_lat, current_lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, data.name, data.model || 'Mavic 3 Enterprise', data.batteryCapacity || 100,
       data.currentBattery ?? 100, data.maxRange || 30, data.payloadCapacity || 5,
       data.homeBaseId || 'hc-001', data.status || 'idle', data.currentLat || null, data.currentLng || null]
    );
    return this.getById(id);
  },
  async update(id: string, data: any) {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        sets.push(`${toSnake(k)} = $${idx}`);
        vals.push(v);
        idx++;
      }
    }
    if (sets.length === 0) return this.getById(id);
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    await query(`UPDATE drones SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    return this.getById(id);
  },
  async getAvailable() {
    const { rows } = await query(
      "SELECT * FROM drones WHERE status = 'idle' AND current_battery >= 40 ORDER BY name"
    );
    return rows.map(mapDrone);
  },
};

function mapDrone(r: any) {
  return {
    id: r.id,
    name: r.name,
    model: r.model,
    batteryCapacity: r.battery_capacity,
    currentBattery: r.current_battery,
    maxRange: parseFloat(r.max_range_km),
    payloadCapacity: parseFloat(r.payload_capacity_kg),
    currentPayload: parseFloat(r.current_payload_kg),
    status: r.status,
    lastMaintenance: r.last_maintenance ? r.last_maintenance.toISOString().slice(0, 10) : '',
    homeBaseId: r.home_base_id,
    currentLat: r.current_lat ? parseFloat(r.current_lat) : undefined,
    currentLng: r.current_lng ? parseFloat(r.current_lng) : undefined,
  };
}

export const OrderRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM delivery_orders ORDER BY requested_at DESC');
    return rows.map(mapOrder);
  },
  async getById(id: string) {
    const { rows } = await query('SELECT * FROM delivery_orders WHERE id = $1', [id]);
    if (!rows.length) return null;
    const order = mapOrder(rows[0]);
    order.items = await OrderItemRepo.getByOrderId(id);
    return order;
  },
  async create(data: any) {
    const id = data.id || uuidv4();
    await query(
      `INSERT INTO delivery_orders (id, patient_id, health_center_id, urgency, status, priority_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, data.patientId || '', data.healthCenterId || '', data.urgency || 'routine',
       data.status || 'pending', data.priorityScore || 0, data.notes || null]
    );
    if (data.items?.length) {
      for (const item of data.items) {
        await OrderItemRepo.create(id, item.inventoryId, item.quantity);
      }
    }
    return this.getById(id);
  },
  async updateStatus(id: string, status: string) {
    const col = status === 'delivered' ? 'delivered_at' : status === 'validated' ? 'validated_at' : null;
    const setClause = col
      ? `status = $1, ${col} = NOW()`
      : 'status = $1';
    await query(`UPDATE delivery_orders SET ${setClause} WHERE id = $2`, [status, id]);
    return this.getById(id);
  },
  async update(id: string, data: any) {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        sets.push(`${toSnake(k)} = $${idx}`);
        vals.push(v);
        idx++;
      }
    }
    if (sets.length === 0) return this.getById(id);
    vals.push(id);
    await query(`UPDATE delivery_orders SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    return this.getById(id);
  },
  async remove(id: string) {
    const { rowCount } = await query('DELETE FROM delivery_orders WHERE id = $1', [id]);
    return rowCount! > 0;
  },
  async getByStatus(status: string) {
    const { rows } = await query('SELECT * FROM delivery_orders WHERE status = $1 ORDER BY requested_at', [status]);
    return rows.map(mapOrder);
  },
};

function mapOrder(r: any) {
  return {
    id: r.id,
    patientId: r.patient_id,
    healthCenterId: r.health_center_id,
    droneId: r.drone_id,
    items: [] as { inventoryId: string; quantity: number }[],
    urgency: r.urgency,
    status: r.status,
    priorityScore: r.priority_score,
    route: r.route_json,
    estimatedDuration: r.estimated_duration_min,
    qrCode: r.qr_code,
    verificationCode: r.verification_code,
    requestedAt: r.requested_at ? r.requested_at.toISOString() : new Date().toISOString(),
    validatedAt: r.validated_at ? r.validated_at.toISOString() : undefined,
    deliveredAt: r.delivered_at ? r.delivered_at.toISOString() : undefined,
    notes: r.notes,
  };
}

export const OrderItemRepo = {
  async getByOrderId(orderId: string) {
    const { rows } = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return rows.map(r => ({ inventoryId: r.inventory_id, quantity: r.quantity }));
  },
  async create(orderId: string, inventoryId: string, quantity: number) {
    await query(
      'INSERT INTO order_items (id, order_id, inventory_id, quantity) VALUES ($1,$2,$3,$4)',
      [uuidv4(), orderId, inventoryId, quantity]
    );
  },
};

export const PatientRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM patients ORDER BY created_at DESC');
    return rows.map(mapPatient);
  },
  async getById(id: string) {
    const { rows } = await query('SELECT * FROM patients WHERE id = $1', [id]);
    return rows.length ? mapPatient(rows[0]) : null;
  },
};

function mapPatient(r: any) {
  return {
    id: r.id,
    nom: r.nom_hash,
    age: r.age,
    sexe: r.sexe,
    contact: r.contact_hash,
    localisation: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
    conditions: r.conditions_hash ? JSON.parse(r.conditions_hash) : [],
    groupeSanguin: r.groupe_sanguin,
    allergies: r.allergies_hash ? JSON.parse(r.allergies_hash) : [],
    createdAt: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  };
}

export const IncidentRepo = {
  async getAll() {
    const { rows } = await query('SELECT * FROM incident_reports ORDER BY reported_at DESC');
    return rows.map(mapIncident);
  },
};

function mapIncident(r: any) {
  return {
    id: r.id,
    orderId: r.order_id,
    type: r.type,
    description: r.description,
    location: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
    reportedAt: r.reported_at ? r.reported_at.toISOString() : new Date().toISOString(),
    resolved: r.resolved,
  };
}

export const SyncRepo = {
  async getDevices() {
    const { rows } = await query('SELECT DISTINCT device_id, agent_name, last_sync_at, orders_pushed, orders_pulled, incidents_pushed FROM sync_log ORDER BY last_sync_at DESC NULLS LAST');
    return rows;
  },
  async upsertDevice(deviceId: string, agentName: string, ordersPushed: number, incidentsPushed: number) {
    await query(
      `INSERT INTO sync_log (id, device_id, agent_name, last_sync_at, orders_pushed, orders_pulled, incidents_pushed)
       VALUES ($1,$2,$3,NOW(),$4,0,$5)`,
      [uuidv4(), deviceId, agentName, ordersPushed, incidentsPushed]
    );
  },
  async updatePull(deviceId: string) {
    await query(
      "UPDATE sync_log SET orders_pulled = orders_pulled + 1, last_sync_at = NOW() WHERE device_id = $1",
      [deviceId]
    );
  },
  async getStats() {
    const { rows } = await query(`
      SELECT COUNT(DISTINCT device_id)::int AS total_devices,
             COALESCE(SUM(orders_pushed), 0)::int AS total_orders_pushed,
             COALESCE(SUM(incidents_pushed), 0)::int AS total_incidents
      FROM sync_log
    `);
    return rows[0];
  },
};

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}
