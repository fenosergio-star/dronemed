import { Request, Response } from 'express';
import { Drone, DroneStatus } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { droneSimulator } from './drone-simulator';

interface DroneWithMeta extends Drone {
  lastUpdated: string;
  missionCount: number;
  currentLat?: number;
  currentLng?: number;
}

const fleet: Map<string, DroneWithMeta> = new Map();

export class FleetController {
  static register(req: Request, res: Response): void {
    const drone: DroneWithMeta = {
      id: uuidv4(),
      ...req.body,
      currentPayload: 0,
      status: 'idle',
      lastUpdated: new Date().toISOString(),
      missionCount: 0,
    };
    fleet.set(drone.id, drone);
    droneSimulator.registerDrone(drone.id, drone.name, {
      lat: drone.currentLat || -18.7669,
      lng: drone.currentLng || 46.8691,
    });
    res.status(201).json({ success: true, data: drone });
  }

  static getAll(req: Request, res: Response): void {
    const drones = Array.from(fleet.values());
    res.json({ success: true, data: drones, total: drones.length });
  }

  static getById(req: Request, res: Response): void {
    const drone = fleet.get(req.params.id);
    if (!drone) { res.status(404).json({ success: false, error: 'Drone non trouvé' }); return; }
    res.json({ success: true, data: drone });
  }

  static updateStatus(req: Request, res: Response): void {
    const drone = fleet.get(req.params.id);
    if (!drone) { res.status(404).json({ success: false, error: 'Drone non trouvé' }); return; }
    const { status, currentBattery, currentLat, currentLng } = req.body;
    if (status) drone.status = status;
    if (currentBattery !== undefined) drone.currentBattery = currentBattery;
    if (currentLat !== undefined) drone.currentLat = currentLat;
    if (currentLng !== undefined) drone.currentLng = currentLng;
    drone.lastUpdated = new Date().toISOString();
    res.json({ success: true, data: drone });
  }

  static getAvailable(req: Request, res: Response): void {
    const available = Array.from(fleet.values())
      .filter(d => d.status === 'idle' && d.currentBattery >= 40);
    res.json({ success: true, data: available, total: available.length });
  }

  static getBatteryStatus(req: Request, res: Response): void {
    const drone = fleet.get(req.params.id);
    if (!drone) { res.status(404).json({ success: false }); return; }
    res.json({
      success: true,
      data: {
        droneId: drone.id,
        currentLevel: drone.currentBattery,
        estimatedFlightTime: (drone.currentBattery / 100) * drone.maxRange / 60 * 60,
        needsCharge: drone.currentBattery < 30,
        canCompleteMission: drone.currentBattery >= 40,
      },
    });
  }

  static getLiveStatus(req: Request, res: Response): void {
    const simDrones = droneSimulator.getAllDrones();
    const drones = simDrones.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      battery: Math.round(d.battery),
      position: d.position,
      lastUpdated: new Date().toISOString(),
      hasMission: !!d.mission,
    }));
    res.json({ success: true, data: drones });
  }

  static getSimulated(req: Request, res: Response): void {
    const simDrones = droneSimulator.getAllDrones().map(d => ({
      id: d.id,
      name: d.name,
      position: d.position,
      battery: Math.round(d.battery),
      status: d.status,
      mission: d.mission ? {
        orderId: d.mission.orderId,
        progress: Math.round((d.mission.pathIndex / (d.mission.returning ? d.mission.returnPath.length : d.mission.path.length)) * 100),
        returning: d.mission.returning,
      } : null,
    }));
    res.json({ success: true, data: simDrones });
  }

  static charge(req: Request, res: Response): void {
    droneSimulator.chargeDrone(req.params.id);
    const drone = droneSimulator.getDrone(req.params.id);
    res.json({ success: true, data: drone });
  }

  static maintenance(req: Request, res: Response): void {
    const inMaintenance = req.body.active !== false;
    droneSimulator.setDroneMaintenance(req.params.id, inMaintenance);
    res.json({ success: true, message: inMaintenance ? 'Drone en maintenance' : 'Drone remis en service' });
  }
}
