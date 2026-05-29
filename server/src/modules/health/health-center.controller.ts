import { Request, Response } from 'express';
import { HealthCenterRepo } from '../../database/repository';

export class HealthCenterController {
  static async getAll(req: Request, res: Response) {
    const centers = await HealthCenterRepo.getAll();
    res.json(centers);
  }
}
