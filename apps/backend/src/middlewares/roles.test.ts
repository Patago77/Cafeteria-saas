import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requiereRol } from './roles';

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requiereRol', () => {
  it('permite el acceso si el rol del usuario está en la lista', () => {
    const req = { rol: 'admin' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    requiereRol('admin', 'cajero')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bloquea con 403 si el rol no está permitido', () => {
    const req = { rol: 'mozo' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    requiereRol('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
