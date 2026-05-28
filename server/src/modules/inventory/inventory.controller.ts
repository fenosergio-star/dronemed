import { Request, Response } from 'express';
import { AVLInventoryTree } from '../../core/avl-tree';
import { InventoryItem } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const inventoryTree = new AVLInventoryTree();

export class InventoryController {
  static addItem(req: Request, res: Response): void {
    try {
      const item: InventoryItem = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      inventoryTree.insert(item);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }

  static removeItem(req: Request, res: Response): void {
    const removed = inventoryTree.remove(req.params.id);
    res.json({ success: removed, data: removed ? null : 'Item non trouvé' });
  }

  static getItem(req: Request, res: Response): void {
    const item = inventoryTree.getById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    res.json({ success: true, data: item });
  }

  static getAll(req: Request, res: Response): void {
    const items = inventoryTree.getAll();
    res.json({ success: true, data: items, total: items.length });
  }

  static getExpiringSoon(req: Request, res: Response): void {
    const days = parseInt(req.query.days as string) || 30;
    const items = inventoryTree.getExpiringSoon(days);
    res.json({ success: true, data: items, total: items.length });
  }

  static getExpired(req: Request, res: Response): void {
    const items = inventoryTree.hasExpired();
    res.json({ success: true, data: items, total: items.length });
  }

  static rotateStock(req: Request, res: Response): void {
    const result = inventoryTree.rotateStock();
    res.json({ success: true, ...result });
  }

  static getAlerts(req: Request, res: Response): void {
    const expired = inventoryTree.hasExpired();
    const expiring = inventoryTree.getExpiringSoon(30);
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
