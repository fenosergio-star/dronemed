import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../database/postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'dronemed-mada-2035-jwt-secret';

const pool = () => getPool();

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        res.status(400).json({ success: false, error: 'email, password et name requis' });
        return;
      }
      const validRoles = ['pharmacien', 'agent', 'admin'];
      const userRole = role && validRoles.includes(role) ? role : 'agent';

      const existing = await pool().query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ success: false, error: 'Email déjà utilisé' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const id = uuidv4();
      await pool().query(
        `INSERT INTO users (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)`,
        [id, email, passwordHash, name, userRole]
      );

      const token = jwt.sign({ id, email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        success: true,
        data: { id, email, name, role: userRole, token },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, error: 'email et password requis' });
        return;
      }

      const { rows } = await pool().query(
        'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
        [email]
      );
      if (rows.length === 0) {
        res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
        return;
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
        return;
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        data: { id: user.id, email: user.email, name: user.name, role: user.role, token },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Non authentifié' }); return; }

    const { rows } = await pool().query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) { res.status(404).json({ success: false, error: 'Utilisateur non trouvé' }); return; }

    res.json({ success: true, data: rows[0] });
  }
}
