-- =====================================================
-- DroneMed Madagascar 2035 - Schéma MySQL (Serveur)
-- =====================================================

CREATE DATABASE IF NOT EXISTS drongmed_mada
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE drongmed_mada;

-- Centres de santé
CREATE TABLE health_centers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type ENUM('hospital','csb1','csb2','chr') NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  altitude INT NOT NULL DEFAULT 0,
  region VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  accessible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region (region),
  INDEX idx_district (district),
  INDEX idx_type (type)
) ENGINE=InnoDB;

-- Inventaire médicaments
CREATE TABLE inventory (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type ENUM('medicament','vaccin','poche_sang') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  expiration_date DATE NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  storage_temp_min DECIMAL(5,2) NOT NULL,
  storage_temp_max DECIMAL(5,2) NOT NULL,
  health_center_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (health_center_id) REFERENCES health_centers(id) ON DELETE CASCADE,
  INDEX idx_expiration (expiration_date),
  INDEX idx_batch (batch_number),
  INDEX idx_type (type),
  INDEX idx_center (health_center_id)
) ENGINE=InnoDB;

-- Drones
CREATE TABLE drones (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  battery_capacity INT NOT NULL COMMENT 'Capacité totale batterie en %',
  current_battery INT NOT NULL DEFAULT 100,
  max_range_km DECIMAL(8,2) NOT NULL,
  payload_capacity_kg DECIMAL(6,2) NOT NULL,
  current_payload_kg DECIMAL(6,2) NOT NULL DEFAULT 0,
  status ENUM('idle','charging','en_route','returning','maintenance','emergency') NOT NULL DEFAULT 'idle',
  last_maintenance DATE,
  home_base_id VARCHAR(36) NOT NULL,
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (home_base_id) REFERENCES health_centers(id),
  INDEX idx_status (status),
  INDEX idx_battery (current_battery)
) ENGINE=InnoDB;

-- Patients (données hachées)
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY,
  nom_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash du nom',
  age INT NOT NULL,
  sexe ENUM('M','F') NOT NULL,
  contact_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash du contact',
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  conditions_hash TEXT COMMENT 'JSON array haché des conditions',
  groupe_sanguin VARCHAR(5),
  allergies_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nom (nom_hash)
) ENGINE=InnoDB;

-- Commandes de livraison
CREATE TABLE delivery_orders (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  health_center_id VARCHAR(36) NOT NULL,
  drone_id VARCHAR(36),
  urgency ENUM('routine','urgent','vitale','critique') NOT NULL DEFAULT 'routine',
  priority_score INT NOT NULL DEFAULT 0,
  status ENUM('pending','validated','in_transit','delivered','cancelled') NOT NULL DEFAULT 'pending',
  route_json JSON COMMENT 'Chemin calculé par A*',
  estimated_duration_min INT,
  qr_code VARCHAR(64),
  verification_code VARCHAR(10),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validated_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (health_center_id) REFERENCES health_centers(id),
  FOREIGN KEY (drone_id) REFERENCES drones(id),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency),
  INDEX idx_priority (priority_score),
  INDEX idx_requested (requested_at)
) ENGINE=InnoDB;

-- Articles commandés
CREATE TABLE order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  inventory_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  INDEX idx_order (order_id)
) ENGINE=InnoDB;

-- Rapports d'incidents
CREATE TABLE incident_reports (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  type ENUM('weather','drone_damage','battery','obstacle','other') NOT NULL,
  description TEXT NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id),
  INDEX idx_type (type),
  INDEX idx_resolved (resolved)
) ENGINE=InnoDB;

-- Historique des vols
CREATE TABLE flight_logs (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  drone_id VARCHAR(36) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  distance_km DECIMAL(8,2),
  battery_start INT NOT NULL,
  battery_end INT,
  max_altitude INT,
  route_taken JSON,
  status ENUM('in_progress','completed','aborted','crashed') DEFAULT 'in_progress',
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id),
  FOREIGN KEY (drone_id) REFERENCES drones(id),
  INDEX idx_drone (drone_id),
  INDEX idx_start (start_time)
) ENGINE=InnoDB;

-- Synchronisation mobile
CREATE TABLE sync_log (
  id VARCHAR(36) PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(200),
  last_sync_at TIMESTAMP,
  orders_pushed INT DEFAULT 0,
  orders_pulled INT DEFAULT 0,
  incidents_pushed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device (device_id),
  INDEX idx_sync_time (last_sync_at)
) ENGINE=InnoDB;

-- Vues utiles
CREATE VIEW v_inventory_expiring AS
  SELECT i.*, h.name AS center_name, h.region,
    DATEDIFF(i.expiration_date, CURDATE()) AS days_remaining
  FROM inventory i
  JOIN health_centers h ON h.id = i.health_center_id
  WHERE i.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  ORDER BY i.expiration_date ASC;

CREATE VIEW v_drone_status AS
  SELECT d.*, h.name AS home_base_name, h.region,
    CASE
      WHEN d.current_battery < 20 THEN 'critique'
      WHEN d.current_battery < 40 THEN 'faible'
      WHEN d.current_battery < 70 THEN 'moyen'
      ELSE 'bon'
    END AS battery_status
  FROM drones d
  JOIN health_centers h ON h.id = d.home_base_id;

CREATE VIEW v_active_missions AS
  SELECT o.id, o.urgency, o.status, o.requested_at,
    d.name AS drone_name, d.current_battery,
    h.name AS destination, h.lat, h.lng
  FROM delivery_orders o
  LEFT JOIN drones d ON d.id = o.drone_id
  JOIN health_centers h ON h.id = o.health_center_id
  WHERE o.status IN ('validated', 'in_transit');
