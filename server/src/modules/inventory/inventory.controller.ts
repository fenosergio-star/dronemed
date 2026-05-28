import { Request, Response } from 'express';
import { InventoryRepo } from '../../database/repository';

export class InventoryController {
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await InventoryRepo.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }

  static async removeItem(req: Request, res: Response): Promise<void> {
    const removed = await InventoryRepo.remove(req.params.id);
    res.json({ success: removed, data: removed ? null : 'Item non trouvé' });
  }

  static async getItem(req: Request, res: Response): Promise<void> {
    const item = await InventoryRepo.getById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    res.json({ success: true, data: item });
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    const items = await InventoryRepo.getAll();
    res.json({ success: true, data: items, total: items.length });
  }

  static async getExpiringSoon(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 30;
    const items = await InventoryRepo.getExpiringSoon(days);
    res.json({ success: true, data: items, total: items.length });
  }

  static async getExpired(req: Request, res: Response): Promise<void> {
    const items = await InventoryRepo.getExpired();
    res.json({ success: true, data: items, total: items.length });
  }

  static async rotateStock(req: Request, res: Response): Promise<void> {
    const expired = await InventoryRepo.getExpired();
    let rotated = 0;
    for (const item of expired) {
      if (await InventoryRepo.remove(item.id)) rotated++;
    }
    res.json({ success: true, rotated, message: `${rotated} articles périmés retirés` });
  }

  static async getAlerts(req: Request, res: Response): Promise<void> {
    const { expired, expiring } = await InventoryRepo.getAlerts();
    res.json({
      success: true,
      data: {
        expired: { count: expired.length, items: expired },
        expiringSoon: { count: expiring.length, items: expiring },
        totalAlerts: expired.length + expiring.length,
      },
    });
  }
}
