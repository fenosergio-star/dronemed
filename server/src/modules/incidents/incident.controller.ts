import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../database/postgres';
import { IncidentRepo } from '../../database/repository';

const pool = () => getPool();

export class IncidentController {
  static async getAll(req: Request, res: Response) {
    const incidents = await IncidentRepo.getAll();
    res.json(incidents);
  }

  static async create(req: Request, res: Response) {
    const { type, description, orderId, lat, lng } = req.body;
    const { rows } = await pool().query(
      `INSERT INTO incident_reports (id, order_id, type, description, lat, lng, reported_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [uuidv4(), orderId || null, type, description, lat || null, lng || null]
    );
    res.status(201).json(rows[0]);
  }
}
