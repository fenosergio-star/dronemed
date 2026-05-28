import { Request, Response } from 'express';
import { MedicationRepo } from '../../database/repository';

export class MedicationController {
  static async getAll(req: Request, res: Response): Promise<void> {
    const items = await MedicationRepo.getAll();
    res.json({ success: true, data: items, total: items.length });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const item = await MedicationRepo.getById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    res.json({ success: true, data: item });
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const item = await MedicationRepo.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const item = await MedicationRepo.update(req.params.id, req.body);
    if (!item) { res.status(404).json({ success: false, error: 'Non trouvé' }); return; }
    res.json({ success: true, data: item });
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const ok = await MedicationRepo.remove(req.params.id);
    res.json({ success: ok, data: ok ? null : 'Non trouvé' });
  }
}
