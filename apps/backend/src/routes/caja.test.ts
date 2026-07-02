import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { findMany, create, findFirst, createMovimiento, findUniqueTenant } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  createMovimiento: vi.fn(),
  findUniqueTenant: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant },
    caja: { findMany, create, findFirst },
    movimientoCaja: { create: createMovimiento },
  },
}));

import cajaRouter from './caja';
import { errorHandler } from '../middlewares/errorHandler';
import { signToken } from '../lib/jwt';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', cajaRouter);
  app.use(errorHandler);
  return app;
}

function auth(tenantId: string, rol = 'admin') {
  return `Bearer ${signToken({ userId: 'u1', tenantId, rol })}`;
}

interface FakeCaja {
  id: string;
  tenantId: string;
  nombre: string;
  activo: boolean;
}

let cajas: FakeCaja[];
let movimientos: Array<{ id: string; cajaId: string; tipo: string; monto: number }>;
let seq: number;

beforeEach(() => {
  cajas = [];
  movimientos = [];
  seq = 0;
  findUniqueTenant.mockResolvedValue({ estado: 'activo' });

  findMany.mockImplementation(async ({ where }: any) =>
    cajas
      .filter((c) => c.tenantId === where.tenantId && (where.activo === undefined || c.activo === where.activo))
      .map((c) => ({ ...c, movimientos: movimientos.filter((m) => m.cajaId === c.id) }))
  );
  create.mockImplementation(async ({ data }: any) => {
    const c: FakeCaja = { id: `caja-${++seq}`, activo: true, ...data };
    cajas.push(c);
    return c;
  });
  findFirst.mockImplementation(async ({ where }: any) => cajas.find((c) => c.id === where.id && c.tenantId === where.tenantId) ?? null);
  createMovimiento.mockImplementation(async ({ data }: any) => {
    const m = { id: `mov-${++seq}`, ...data };
    movimientos.push(m);
    return m;
  });
});

describe('GET /caja', () => {
  it('solo lista las cajas del tenant del token', async () => {
    cajas.push(
      { id: 'c1', tenantId: 'tenant-a', nombre: 'Caja 1', activo: true },
      { id: 'c2', tenantId: 'tenant-b', nombre: 'Caja ajena', activo: true },
    );

    const res = await request(buildApp()).get('/').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('c1');
  });
});

describe('POST /caja/:id/movimientos — aislamiento cruzado (hallazgo tipo "IDs cruzados")', () => {
  it('devuelve 404 si la caja pertenece a otro tenant, sin crear el movimiento', async () => {
    cajas.push({ id: 'c1', tenantId: 'tenant-b', nombre: 'Caja ajena', activo: true });

    const res = await request(buildApp())
      .post('/c1/movimientos')
      .set('Authorization', auth('tenant-a'))
      .send({ tipo: 'ingreso', monto: 500 });

    expect(res.status).toBe(404);
    expect(movimientos).toHaveLength(0);
  });

  it('crea el movimiento cuando la caja es del propio tenant', async () => {
    cajas.push({ id: 'c1', tenantId: 'tenant-a', nombre: 'Caja propia', activo: true });

    const res = await request(buildApp())
      .post('/c1/movimientos')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ tipo: 'ingreso', monto: 500 });

    expect(res.status).toBe(201);
    expect(movimientos).toHaveLength(1);
  });

  it('bloquea a un mozo con 403', async () => {
    cajas.push({ id: 'c1', tenantId: 'tenant-a', nombre: 'Caja propia', activo: true });

    const res = await request(buildApp())
      .post('/c1/movimientos')
      .set('Authorization', auth('tenant-a', 'mozo'))
      .send({ tipo: 'ingreso', monto: 500 });

    expect(res.status).toBe(403);
    expect(movimientos).toHaveLength(0);
  });
});
