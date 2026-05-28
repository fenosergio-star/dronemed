import { Request, Response } from 'express';
import { AStarRouter } from '../../core/astar';
import { Coordinates } from '../../../../shared/types';

const router = new AStarRouter();

export class RoutingController {
  static findRoute(req: Request, res: Response): void {
    try {
      const { start, end, batteryLevel, currentPayload, maxPayload, maxRange } = req.body;

      if (!start || !end) {
        res.status(400).json({ success: false, error: 'Coordonnées start et end requises' });
        return;
      }

      const s: Coordinates = { lat: start.lat, lng: start.lng };
      const e: Coordinates = { lat: end.lat, lng: end.lng };
      const result = router.findRoute(
        s, e,
        batteryLevel || 100,
        currentPayload || 0,
        maxPayload || 5,
        maxRange || 50
      );

      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static checkBattery(req: Request, res: Response): void {
    const { start, end, batteryLevel, payloadPercent } = req.body;
    const s: Coordinates = { lat: start.lat, lng: start.lng };
    const e: Coordinates = { lat: end.lat, lng: end.lng };
    const status = router.checkBatteryForMission(
      batteryLevel || 100,
      s, e,
      payloadPercent || 0
    );
    res.json({ success: true, data: status });
  }

  static getEstimatedTime(req: Request, res: Response): void {
    const { start, end } = req.body;
    const minutes = router.getEstimatedDuration(start as Coordinates, end as Coordinates);
    res.json({ success: true, data: { estimatedMinutes: minutes } });
  }

  static addNoFlyZone(req: Request, res: Response): void {
    const { center, radiusKm } = req.body;
    router.addNoFlyZone(center as Coordinates, radiusKm);
    res.json({ success: true, message: 'Zone interdite ajoutée' });
  }
}
