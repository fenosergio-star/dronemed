import { Request, Response, NextFunction } from 'express';

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

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message,
  });
}
