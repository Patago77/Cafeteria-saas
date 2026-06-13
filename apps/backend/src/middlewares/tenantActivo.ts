import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from './auth';

export async function tenantActivo(req: Request, res: Response, next: NextFunction) {
  const { tenantId } = req as AuthRequest;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { estado: true },
  });
  if (!tenant || tenant.estado === 'suspendido') {
    res.status(403).json({ error: 'Cuenta suspendida', code: 'TENANT_SUSPENDED' });
    return;
  }
  next();
}
