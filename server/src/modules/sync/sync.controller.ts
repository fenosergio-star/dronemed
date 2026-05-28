import { Request, Response } from 'express';
import { SyncPayload } from '../../../../shared/types';
import { SyncRepo } from '../../database/repository';

export class SyncController {
  static async pushFromMobile(req: Request, res: Response): Promise<void> {
    try {
      const payload: SyncPayload = req.body;
      const deviceId = req.headers['x-device-id'] as string || 'unknown';
      const agentName = req.headers['x-agent-name'] as string || 'agent';

      await SyncRepo.upsertDevice(
        deviceId,
        agentName,
        payload.orders?.length || 0,
        payload.incidents?.length || 0
      );

      res.json({
        success: true,
        message: 'Synchronisation réussie',
        data: {
          ordersReceived: payload.orders?.length || 0,
          incidentsReceived: payload.incidents?.length || 0,
          serverTime: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async pullForMobile(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.headers['x-device-id'] as string || 'unknown';
      await SyncRepo.updatePull(deviceId);

      res.json({
        success: true,
        data: {
          healthCenters: [],
          inventory: [],
          orders: [],
          serverTime: new Date().toISOString(),
          syncInterval: 300,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async getDeviceStatus(req: Request, res: Response): Promise<void> {
    const devices = await SyncRepo.getDevices();
    res.json({ success: true, data: devices, total: devices.length });
  }

  static async getSyncStats(req: Request, res: Response): Promise<void> {
    const stats = await SyncRepo.getStats();
    res.json({
      success: true,
      data: {
        totalDevices: stats.total_devices,
        totalOrdersPushed: stats.total_orders_pushed,
        totalIncidents: stats.total_incidents,
        lastSyncGlobally: null,
      },
    });
  }
}
