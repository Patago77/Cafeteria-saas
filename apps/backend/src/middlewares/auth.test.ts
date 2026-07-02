import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { autenticar } from './auth';
import { signToken } from '../lib/jwt';

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('autenticar', () => {
  it('rechaza si no hay header Authorization', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token con formato inválido (sin "Bearer ")', () => {
    const req = { headers: { authorization: 'Token abc' } } as Request;
    const res = mockRes();
    const next = vi.fn();

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token inválido/corrompido', () => {
    const req = { headers: { authorization: 'Bearer token-basura' } } as Request;
    const res = mockRes();
    const next = vi.fn();

    autenticar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con un token válido, inyecta userId/tenantId/rol en el request y llama next()', () => {
    const token = signToken({ userId: 'u1', tenantId: 'tenant-1', rol: 'cajero' });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = vi.fn();

    autenticar(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).tenantId).toBe('tenant-1');
    expect((req as any).userId).toBe('u1');
    expect((req as any).rol).toBe('cajero');
  });
});
