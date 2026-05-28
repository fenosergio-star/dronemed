import { Request, Response } from 'express';
import { DroneRepo } from '../../database/repository';
import { droneSimulator } from './drone-simulator';

export class FleetController {
  static async register(req: Request, res: Response): Promise<void> {
    const drone = await DroneRepo.create(req.body);
    if (!drone) { res.status(400).json({ success: false, error: 'Création échouée' }); return; }
    droneSimulator.registerDrone(drone.id, drone.name, {
      lat: (drone as any).currentLat || -18.7669,
      lng: (drone as any).currentLng || 46.8691,
    });
    res.status(201).json({ success: true, data: drone });
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    const drones = await DroneRepo.getAll();
    res.json({ success: true, data: drones, total: drones.length });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const drone = await DroneRepo.getById(req.params.id);
    if (!drone) { res.status(404).json({ success: false, error: 'Drone non trouvé' }); return; }
    res.json({ success: true, data: drone });
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const drone = await DroneRepo.update(req.params.id, req.body);
    if (!drone) { res.status(404).json({ success: false, error: 'Drone non trouvé' }); return; }
    res.json({ success: true, data: drone });
  }

  static async getAvailable(req: Request, res: Response): Promise<void> {
    const available = await DroneRepo.getAvailable();
    res.json({ success: true, data: available, total: available.length });
  }

  static async getBatteryStatus(req: Request, res: Response): Promise<void> {
    const drone = await DroneRepo.getById(req.params.id);
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
