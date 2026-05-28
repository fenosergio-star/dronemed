export type UrgencyLevel = 'routine' | 'urgent' | 'vitale' | 'critique';
export type DroneStatus = 'idle' | 'charging' | 'en_route' | 'returning' | 'maintenance' | 'emergency';
export type OrderStatus = 'pending' | 'validated' | 'in_transit' | 'delivered' | 'cancelled';
export type IncidentType = 'weather' | 'drone_damage' | 'battery' | 'obstacle' | 'other';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface HealthCenter {
  id: string;
  name: string;
  type: 'hospital' | 'csb1' | 'csb2' | 'chr';
  coordinates: Coordinates;
  altitude: number;
  region: string;
  district: string;
  accessible: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'medicament' | 'vaccin' | 'poche_sang';
  quantity: number;
  expirationDate: string;
  batchNumber: string;
  storageTempMin: number;
  storageTempMax: number;
  createdAt: string;
}

export interface Drone {
  id: string;
  name: string;
  model: string;
  batteryCapacity: number;
  currentBattery: number;
  maxRange: number;
  payloadCapacity: number;
  currentPayload: number;
  status: DroneStatus;
  lastMaintenance: string;
  homeBaseId: string;
}

export interface Patient {
  id: string;
  nom: string;
  age: number;
  sexe: 'M' | 'F';
  contact: string;
  localisation: Coordinates;
  conditions: string[];
  groupeSanguin?: string;
  allergies?: string[];
  createdAt: string;
}

export interface DeliveryOrder {
  id: string;
  patientId: string;
  healthCenterId: string;
  droneId?: string;
  items: OrderItem[];
  urgency: UrgencyLevel;
  status: OrderStatus;
  priorityScore: number;
  route?: Coordinates[];
  estimatedDuration?: number;
  qrCode?: string;
  verificationCode?: string;
  requestedAt: string;
  validatedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface OrderItem {
  inventoryId: string;
  quantity: number;
}

export interface RouteResult {
  path: Coordinates[];
  distance: number;
  duration: number;
  batteryRequired: number;
  obstacles: string[];
  safeToFly: boolean;
}

export interface SyncPayload {
  orders: DeliveryOrder[];
  incidents: IncidentReport[];
  lastSyncAt: string;
}

export interface IncidentReport {
  id: string;
  orderId: string;
  type: IncidentType;
  description: string;
  location: Coordinates;
  reportedAt: string;
  resolved: boolean;
}

export interface BatteryStatus {
  droneId: string;
  currentLevel: number;
  estimatedFlightTime: number;
  needsCharge: boolean;
  canCompleteMission: boolean;
}
