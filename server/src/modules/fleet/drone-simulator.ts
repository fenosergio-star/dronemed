import { Coordinates, DroneStatus } from '../../../../shared/types';
import { AStarRouter } from '../../core/astar';

export interface SimulatedDrone {
  id: string;
  name: string;
  position: Coordinates;
  battery: number;
  status: DroneStatus;
  speed: number;
  mission?: {
    orderId: string;
    path: Coordinates[];
    pathIndex: number;
    destination: Coordinates;
    returnPath: Coordinates[];
    returning: boolean;
    startBattery: number;
  };
}

type PositionListener = (drone: SimulatedDrone) => void;

export class DroneSimulator {
  private drones: Map<string, SimulatedDrone> = new Map();
  private listeners: PositionListener[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private router: AStarRouter;

  constructor() {
    this.router = new AStarRouter();
  }

  registerDrone(id: string, name: string, homeBase: Coordinates): SimulatedDrone {
    const drone: SimulatedDrone = {
      id, name,
      position: { ...homeBase },
      battery: 100,
      status: 'idle',
      speed: 60 / 3600,
    };
    this.drones.set(id, drone);
    return drone;
  }

  onPosition(listener: PositionListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: PositionListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notify(drone: SimulatedDrone): void {
    for (const listener of this.listeners) {
      listener(drone);
    }
  }

  async startMission(
    droneId: string,
    orderId: string,
    start: Coordinates,
    end: Coordinates,
    batteryLevel: number
  ): Promise<boolean> {
    const drone = this.drones.get(droneId);
    if (!drone || drone.status !== 'idle') return false;

    const result = this.router.findRoute(start, end, batteryLevel, 0, 5, 50);
    if (!result.safeToFly || result.path.length < 2) return false;

    drone.battery = batteryLevel;
    drone.status = 'en_route';
    drone.position = { ...start };
    drone.mission = {
      orderId,
      path: result.path,
      pathIndex: 0,
      destination: { ...end },
      returnPath: [...result.path].reverse(),
      returning: false,
      startBattery: batteryLevel,
    };

    this.notify(drone);
    this.startTicking();
    return true;
  }

  private startTicking(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 2000);
  }

  private stopTickingIfIdle(): void {
    const hasActive = Array.from(this.drones.values()).some(
      d => d.status === 'en_route' || d.status === 'returning'
    );
    if (!hasActive && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    for (const drone of this.drones.values()) {
      if (drone.status !== 'en_route' && drone.status !== 'returning') continue;

      const mission = drone.mission;
      if (!mission) continue;

      const path = mission.returning ? mission.returnPath : mission.path;
      if (mission.pathIndex >= path.length - 1) {
        if (!mission.returning) {
          mission.returning = true;
          mission.pathIndex = 0;
          drone.status = 'returning';
          drone.battery -= 5;
          this.notify(drone);
          continue;
        } else {
          drone.status = 'idle';
          delete drone.mission;
          drone.battery = Math.max(0, drone.battery - 2);
          this.notify(drone);
          this.stopTickingIfIdle();
          continue;
        }
      }

      mission.pathIndex++;
      const target = path[mission.pathIndex];
      drone.position = { lat: target.lat, lng: target.lng };
      const segmentDist = this.router.getEstimatedDuration(
        path[mission.pathIndex - 1], target
      );
      const batteryCost = (segmentDist / 60) * 1.2;
      drone.battery = Math.max(0, drone.battery - batteryCost);

      if (drone.battery <= 5) {
        drone.status = 'emergency';
        this.notify(drone);
        this.stopTickingIfIdle();
        continue;
      }

      this.notify(drone);
    }
  }

  getDrone(id: string): SimulatedDrone | undefined {
    return this.drones.get(id);
  }

  getAllDrones(): SimulatedDrone[] {
    return Array.from(this.drones.values());
  }

  chargeDrone(droneId: string): void {
    const drone = this.drones.get(droneId);
    if (drone && drone.status === 'idle') {
      drone.battery = Math.min(100, drone.battery + 10);
      if (drone.battery >= 100) drone.status = 'idle';
      else drone.status = 'charging';
      this.notify(drone);
    }
  }

  setDroneMaintenance(droneId: string, inMaintenance: boolean): void {
    const drone = this.drones.get(droneId);
    if (!drone) return;
    drone.status = inMaintenance ? 'maintenance' : 'idle';
    this.notify(drone);
  }
}

export const droneSimulator = new DroneSimulator();
