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
    const typeMap: Record<string, string> = {
      droneDown: 'drone_damage',
      wrongDelivery: 'other',
      missingProducts: 'other',
      patientRefused: 'other',
      weather: 'weather',
      drone_damage: 'drone_damage',
      battery: 'battery',
      obstacle: 'obstacle',
      other: 'other',
    };
    const { type, description, orderId, lat, lng } = req.body;
    const dbType = typeMap[type] || 'other';
    const { rows } = await pool().query(
      `INSERT INTO incident_reports (id, order_id, type, description, lat, lng, reported_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [uuidv4(), orderId || null, dbType, description, lat || null, lng || null]
    );
    res.status(201).json(rows[0]);
  }
}
