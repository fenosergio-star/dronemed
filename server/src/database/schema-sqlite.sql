-- =====================================================
-- DroneMed Madagascar 2035 - Schéma SQLite (Mobile)
-- Mode hors-ligne avec synchronisation différée
-- =====================================================

CREATE TABLE IF NOT EXISTS health_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('hospital','csb1','csb2','chr')),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  altitude INTEGER DEFAULT 0,
  region TEXT NOT NULL,
  district TEXT NOT NULL,
  accessible INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('medicament','vaccin','poche_sang')),
  quantity INTEGER DEFAULT 0,
  expiration_date TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  storage_temp_min REAL NOT NULL,
  storage_temp_max REAL NOT NULL,
  health_center_id TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (health_center_id) REFERENCES health_centers(id)
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  age INTEGER NOT NULL,
  sexe TEXT NOT NULL CHECK(sexe IN ('M','F')),
  contact TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  conditions TEXT,
  groupe_sanguin TEXT,
  allergies TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  health_center_id TEXT NOT NULL,
  drone_id TEXT,
  urgency TEXT NOT NULL CHECK(urgency IN ('routine','urgent','vitale','critique')),
  priority_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','validated','in_transit','delivered','cancelled')),
  route_json TEXT,
  estimated_duration_min INTEGER,
  qr_code TEXT,
  verification_code TEXT,
  requested_at TEXT DEFAULT (datetime('now')),
  validated_at TEXT,
  delivered_at TEXT,
  notes TEXT,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (health_center_id) REFERENCES health_centers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_reports (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('weather','drone_damage','battery','obstacle','other')),
  description TEXT NOT NULL,
  lat REAL,
  lng REAL,
  reported_at TEXT DEFAULT (datetime('now')),
  resolved INTEGER DEFAULT 0,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  last_sync_at TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_synced ON delivery_orders(synced);
CREATE INDEX IF NOT EXISTS idx_incidents_synced ON incident_reports(synced);
CREATE INDEX IF NOT EXISTS idx_orders_urgency ON delivery_orders(urgency);
