import { Request, Response } from 'express';
import { SyncPayload } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface DeviceSync {
  deviceId: string;
  agentName: string;
  lastSyncAt: string;
  ordersPushed: number;
  ordersPulled: number;
  incidentsPushed: number;
}

const devices: Map<string, DeviceSync> = new Map();

export class SyncController {
  static async pushFromMobile(req: Request, res: Response): Promise<void> {
    try {
      const payload: SyncPayload = req.body;

      const deviceId = req.headers['x-device-id'] as string || 'unknown';
      const agentName = req.headers['x-agent-name'] as string || 'agent';

      const device: DeviceSync = {
        deviceId,
        agentName,
        lastSyncAt: new Date().toISOString(),
        ordersPushed: payload.orders?.length || 0,
        ordersPulled: 0,
        incidentsPushed: payload.incidents?.length || 0,
      };
      devices.set(deviceId, device);

      const serverOrders = payload.orders?.map(o => ({
        ...o,
        synced: 1,
      })) || [];

      const serverIncidents = payload.incidents?.map(inc => ({
        ...inc,
        synced: 1,
      })) || [];

      res.json({
        success: true,
        message: 'Synchronisation réussie',
        data: {
          ordersReceived: serverOrders.length,
          incidentsReceived: serverIncidents.length,
          serverTime: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async pullForMobile(req: Request, res: Response): Promise<void> {
    try {
      const lastSync = req.query.lastSync as string || new Date(0).toISOString();
      const deviceId = req.headers['x-device-id'] as string || 'unknown';

      const device = devices.get(deviceId);
      if (device) {
        device.lastSyncAt = new Date().toISOString();
        device.ordersPulled++;
      }

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

  static getDeviceStatus(req: Request, res: Response): void {
    const deviceList = Array.from(devices.values());
    res.json({ success: true, data: deviceList, total: deviceList.length });
  }

  static getSyncStats(req: Request, res: Response): void {
    const totalOrdersPushed = Array.from(devices.values()).reduce((s, d) => s + d.ordersPushed, 0);
    const totalIncidents = Array.from(devices.values()).reduce((s, d) => s + d.incidentsPushed, 0);

    res.json({
      success: true,
      data: {
        totalDevices: devices.size,
        totalOrdersPushed,
        totalIncidents,
        lastSyncGlobally: Array.from(devices.values())
          .sort((a, b) => new Date(b.lastSyncAt).getTime() - new Date(a.lastSyncAt).getTime())[0]?.lastSyncAt || null,
      },
    });
  }
}
