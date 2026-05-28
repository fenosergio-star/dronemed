import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool;

export async function initPostgres(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL;
  pool = connectionString
    ? new Pool({ connectionString, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })
    : new Pool({
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
        user: process.env.PGUSER || process.env.DB_USER || 'droneadmin',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'DroneMed2035!',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'drone_med_mada',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

  const schemaPath = path.join(__dirname, 'schema-postgres.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const client = await pool.connect();
    try {
      await client.query(schema);
      console.log('[PostgreSQL] Schéma initialisé');
    } finally {
      client.release();
    }
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM health_centers');
  if (rows[0].count === 0) {
    await seedDefaults(pool);
  }

  console.log(`[PostgreSQL] Connecté - ${rows[0].count} centres de santé`);
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('PostgreSQL non initialisé');
  return pool;
}

async function seedDefaults(client: PoolClient | Pool): Promise<void> {
  const healthCenters = [
    { id: 'hc-001', name: 'CHU Antananarivo', type: 'hospital', lat: -18.9100, lng: 47.5250, altitude: 1276, region: 'Analamanga', district: 'Antananarivo', accessible: true },
    { id: 'hc-002', name: 'CSB2 Toamasina', type: 'csb2', lat: -18.1443, lng: 49.3958, altitude: 6, region: 'Atsinanana', district: 'Toamasina', accessible: true },
    { id: 'hc-003', name: 'CSB1 Mahajanga', type: 'csb1', lat: -15.7167, lng: 46.3167, altitude: 6, region: 'Boeny', district: 'Mahajanga', accessible: true },
    { id: 'hc-004', name: 'CHR Fianarantsoa', type: 'chr', lat: -21.4333, lng: 47.0833, altitude: 1150, region: 'Haute Matsiatra', district: 'Fianarantsoa', accessible: true },
    { id: 'hc-005', name: 'CSB2 Antsiranana', type: 'csb2', lat: -12.3000, lng: 49.2833, altitude: 5, region: 'Diana', district: 'Antsiranana', accessible: false },
  ];

  const drones = [
    { id: 'drone-001', name: 'Drone-Alpha', model: 'Mavic 3 Enterprise', battery_capacity: 100, current_battery: 85, max_range_km: 30, payload_capacity_kg: 5, home_base_id: 'hc-001', status: 'idle' },
    { id: 'drone-002', name: 'Drone-Beta', model: 'Mavic 3 Enterprise', battery_capacity: 100, current_battery: 72, max_range_km: 30, payload_capacity_kg: 5, home_base_id: 'hc-002', status: 'idle' },
    { id: 'drone-003', name: 'Drone-Gamma', model: 'Mavic 3 Enterprise', battery_capacity: 100, current_battery: 60, max_range_km: 30, payload_capacity_kg: 5, home_base_id: 'hc-003', status: 'charging' },
    { id: 'drone-004', name: 'Drone-Delta', model: 'Mavic 3 Enterprise', battery_capacity: 100, current_battery: 95, max_range_km: 30, payload_capacity_kg: 5, home_base_id: 'hc-004', status: 'idle' },
  ];

  for (const hc of healthCenters) {
    await client.query(
      `INSERT INTO health_centers (id, name, type, lat, lng, altitude, region, district, accessible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [hc.id, hc.name, hc.type, hc.lat, hc.lng, hc.altitude, hc.region, hc.district, hc.accessible]
    );
  }
  for (const d of drones) {
    await client.query(
      `INSERT INTO drones (id, name, model, battery_capacity, current_battery, max_range_km, payload_capacity_kg, home_base_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [d.id, d.name, d.model, d.battery_capacity, d.current_battery, d.max_range_km, d.payload_capacity_kg, d.home_base_id, d.status]
    );
  }

  const medications = [
    { id: 'med-001', name: 'Artésunate 60mg', type: 'medicament', category: 'Antipaludéen', default_storage_temp_min: 2, default_storage_temp_max: 8, unit: 'ampoule' },
    { id: 'med-002', name: 'Artéméther 80mg', type: 'medicament', category: 'Antipaludéen', default_storage_temp_min: 2, default_storage_temp_max: 8, unit: 'ampoule' },
    { id: 'med-003', name: 'Quinine 500mg', type: 'medicament', category: 'Antipaludéen', default_storage_temp_min: 15, default_storage_temp_max: 25, unit: 'comprimé' },
    { id: 'med-004', name: 'Vaccin ROR', type: 'vaccin', category: 'Vaccination', default_storage_temp_min: 2, default_storage_temp_max: 8, unit: 'dose' },
    { id: 'med-005', name: 'Vaccin BCG', type: 'vaccin', category: 'Vaccination', default_storage_temp_min: 2, default_storage_temp_max: 8, unit: 'dose' },
    { id: 'med-006', name: 'Poche sang O-', type: 'poche_sang', category: 'Transfusion', default_storage_temp_min: 2, default_storage_temp_max: 6, unit: 'poche' },
    { id: 'med-007', name: 'Poche sang O+', type: 'poche_sang', category: 'Transfusion', default_storage_temp_min: 2, default_storage_temp_max: 6, unit: 'poche' },
    { id: 'med-008', name: 'Amoxicilline 500mg', type: 'medicament', category: 'Antibiotique', default_storage_temp_min: 15, default_storage_temp_max: 25, unit: 'gélule' },
    { id: 'med-009', name: 'Paracétamol 500mg', type: 'medicament', category: 'Antalgique', default_storage_temp_min: 15, default_storage_temp_max: 25, unit: 'comprimé' },
    { id: 'med-010', name: 'Sérum antivenimeux', type: 'medicament', category: 'Urgence', default_storage_temp_min: 2, default_storage_temp_max: 8, unit: 'ampoule' },
  ];
  for (const m of medications) {
    await client.query(
      `INSERT INTO medications (id, name, type, category, default_storage_temp_min, default_storage_temp_max, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.name, m.type, m.category, m.default_storage_temp_min, m.default_storage_temp_max, m.unit]
    );
  }

  console.log('[PostgreSQL] Données par défaut insérées');
}
