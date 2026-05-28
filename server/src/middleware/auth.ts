import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dronemed-mada-2035-jwt-secret';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.API_KEY || 'drone-med-mada-2035-key';

  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  if (!apiKey || apiKey !== validKey) {
    res.status(401).json({ success: false, error: 'Clé API invalide' });
    return;
  }

  next();
}

export function deviceAuth(req: Request, res: Response, next: NextFunction): void {
  const deviceId = req.headers['x-device-id'] as string;
  if (!deviceId) {
    res.status(401).json({ success: false, error: 'En-tête x-device-id requis' });
    return;
  }
  next();
}

export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token manquant' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message,
  });
}
