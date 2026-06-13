import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

export function requiereRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { rol } = req as AuthRequest;
    if (!roles.includes(rol)) {
      res.status(403).json({ error: 'Sin permisos para esta acción' });
      return;
    }
    next();
  };
}
