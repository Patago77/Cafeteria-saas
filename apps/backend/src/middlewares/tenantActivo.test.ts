import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../lib/prisma', () => ({
  prisma: { tenant: { findUnique } },
}));

import { tenantActivo } from './tenantActivo';

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('tenantActivo', () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it('deja pasar si el tenant existe y está activo', async () => {
    findUnique.mockResolvedValue({ estado: 'activo' });
    const req = { tenantId: 'tenant-1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await tenantActivo(req, res, next);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'tenant-1' }, select: { estado: true } });
    expect(next).toHaveBeenCalledOnce();
  });

  it('bloquea con 403 si el tenant está suspendido', async () => {
    findUnique.mockResolvedValue({ estado: 'suspendido' });
    const req = { tenantId: 'tenant-1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await tenantActivo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('bloquea con 403 si el tenant no existe', async () => {
    findUnique.mockResolvedValue(null);
    const req = { tenantId: 'tenant-inexistente' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await tenantActivo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
