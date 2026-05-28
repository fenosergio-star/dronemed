CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('pharmacien','agent','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS health_centers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('hospital','csb1','csb2','chr')),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  altitude INTEGER NOT NULL DEFAULT 0,
  region VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  accessible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_centers_region ON health_centers(region);
CREATE INDEX IF NOT EXISTS idx_health_centers_district ON health_centers(district);

CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('medicament','vaccin','poche_sang')),
  quantity INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  storage_temp_min NUMERIC(5,2) NOT NULL,
  storage_temp_max NUMERIC(5,2) NOT NULL,
  health_center_id VARCHAR(36) NOT NULL REFERENCES health_centers(id) ON DELETE CASCADE,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_expiration ON inventory(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batch ON inventory(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_center ON inventory(health_center_id);

CREATE TABLE IF NOT EXISTS drones (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  battery_capacity INTEGER NOT NULL,
  current_battery INTEGER NOT NULL DEFAULT 100,
  max_range_km NUMERIC(8,2) NOT NULL,
  payload_capacity_kg NUMERIC(6,2) NOT NULL,
  current_payload_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','charging','en_route','returning','maintenance','emergency')),
  last_maintenance DATE,
  home_base_id VARCHAR(36) NOT NULL REFERENCES health_centers(id),
  current_lat NUMERIC(10,7),
  current_lng NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drones_status ON drones(status);
CREATE INDEX IF NOT EXISTS idx_drones_battery ON drones(current_battery);

CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY,
  nom_hash VARCHAR(64) NOT NULL,
  age INTEGER NOT NULL,
  sexe VARCHAR(1) NOT NULL CHECK (sexe IN ('M','F')),
  contact_hash VARCHAR(64) NOT NULL,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  conditions_hash TEXT,
  groupe_sanguin VARCHAR(5),
  allergies_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_nom ON patients(nom_hash);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
  health_center_id VARCHAR(36) NOT NULL REFERENCES health_centers(id),
  drone_id VARCHAR(36) REFERENCES drones(id),
  urgency VARCHAR(10) NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine','urgent','vitale','critique')),
  priority_score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','in_transit','delivered','cancelled')),
  route_json JSONB,
  estimated_duration_min INTEGER,
  qr_code VARCHAR(64),
  verification_code VARCHAR(10),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_by VARCHAR(36) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_urgency ON delivery_orders(urgency);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON delivery_orders(priority_score);
CREATE INDEX IF NOT EXISTS idx_orders_requested ON delivery_orders(requested_at);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  inventory_id VARCHAR(36) NOT NULL REFERENCES inventory(id),
  quantity INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS incident_reports (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL REFERENCES delivery_orders(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('weather','drone_damage','battery','obstacle','other')),
  description TEXT NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incident_reports(type);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON incident_reports(resolved);

CREATE TABLE IF NOT EXISTS flight_logs (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL REFERENCES delivery_orders(id),
  drone_id VARCHAR(36) NOT NULL REFERENCES drones(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  distance_km NUMERIC(8,2),
  battery_start INTEGER NOT NULL,
  battery_end INTEGER,
  max_altitude INTEGER,
  route_taken JSONB,
  status VARCHAR(15) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','aborted','crashed'))
);
CREATE INDEX IF NOT EXISTS idx_flight_logs_drone ON flight_logs(drone_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_start ON flight_logs(start_time);

CREATE TABLE IF NOT EXISTS sync_log (
  id VARCHAR(36) PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(200),
  last_sync_at TIMESTAMPTZ,
  orders_pushed INTEGER DEFAULT 0,
  orders_pulled INTEGER DEFAULT 0,
  incidents_pushed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_device ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_time ON sync_log(last_sync_at);

CREATE OR REPLACE VIEW v_inventory_expiring AS
  SELECT i.*, h.name AS center_name, h.region,
    (i.expiration_date - CURRENT_DATE) AS days_remaining
  FROM inventory i
  JOIN health_centers h ON h.id = i.health_center_id
  WHERE i.expiration_date <= (CURRENT_DATE + INTERVAL '30 days')
  ORDER BY i.expiration_date ASC;

CREATE OR REPLACE VIEW v_drone_status AS
  SELECT d.*, h.name AS home_base_name, h.region,
    CASE
      WHEN d.current_battery < 20 THEN 'critique'
      WHEN d.current_battery < 40 THEN 'faible'
      WHEN d.current_battery < 70 THEN 'moyen'
      ELSE 'bon'
    END AS battery_status
  FROM drones d
  JOIN health_centers h ON h.id = d.home_base_id;

CREATE OR REPLACE VIEW v_active_missions AS
  SELECT o.id, o.urgency, o.status, o.requested_at,
    d.name AS drone_name, d.current_battery,
    h.name AS destination, h.lat, h.lng
  FROM delivery_orders o
  LEFT JOIN drones d ON d.id = o.drone_id
  JOIN health_centers h ON h.id = o.health_center_id
  WHERE o.status IN ('validated', 'in_transit');
