import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
  rol: string;
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).tenantId = payload.tenantId;
    (req as AuthRequest).rol = payload.rol;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
