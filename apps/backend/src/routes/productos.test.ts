import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { findMany, create, updateMany, findUniqueTenant } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  findUniqueTenant: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant },
    producto: { findMany, create, updateMany },
  },
}));

import productosRouter from './productos';
import { errorHandler } from '../middlewares/errorHandler';
import { signToken } from '../lib/jwt';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', productosRouter);
  app.use(errorHandler);
  return app;
}

function auth(tenantId: string, rol = 'admin') {
  return `Bearer ${signToken({ userId: 'u1', tenantId, rol })}`;
}

interface FakeProducto {
  id: string;
  tenantId: string;
  nombre: string;
  categoria: string;
  precio: number;
  activo: boolean;
}

let store: FakeProducto[];
let seq: number;

beforeEach(() => {
  store = [];
  seq = 0;
  findUniqueTenant.mockResolvedValue({ estado: 'activo' });

  findMany.mockImplementation(async ({ where }: any) =>
    store.filter((p) => p.tenantId === where.tenantId && (where.activo === undefined || p.activo === where.activo))
  );
  create.mockImplementation(async ({ data }: any) => {
    const p: FakeProducto = { id: `prod-${++seq}`, activo: true, ...data };
    store.push(p);
    return p;
  });
  updateMany.mockImplementation(async ({ where, data }: any) => {
    const matches = store.filter((p) => p.id === where.id && p.tenantId === where.tenantId);
    matches.forEach((p) => Object.assign(p, data));
    return { count: matches.length };
  });
});

describe('GET /productos', () => {
  it('solo devuelve los productos activos del tenant del token', async () => {
    store.push(
      { id: 'p1', tenantId: 'tenant-a', nombre: 'Café', categoria: 'bebidas', precio: 100, activo: true },
      { id: 'p2', tenantId: 'tenant-a', nombre: 'Descontinuado', categoria: 'bebidas', precio: 50, activo: false },
      { id: 'p3', tenantId: 'tenant-b', nombre: 'Medialuna', categoria: 'panadería', precio: 80, activo: true },
    );

    const res = await request(buildApp()).get('/').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('p1');
  });

  it('rechaza sin token', async () => {
    const res = await request(buildApp()).get('/');
    expect(res.status).toBe(401);
  });
});

describe('POST /productos', () => {
  it('ignora un tenantId del body e igual crea el producto bajo el tenant del JWT', async () => {
    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a'))
      .send({ nombre: 'Café', precio: 100, tenantId: 'tenant-b' });

    expect(res.status).toBe(201);
    expect(store).toHaveLength(1);
    expect(store[0].tenantId).toBe('tenant-a');
  });

  it('bloquea a un rol no-admin con 403', async () => {
    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ nombre: 'Café', precio: 100 });

    expect(res.status).toBe(403);
    expect(store).toHaveLength(0);
  });
});

describe('PUT /productos/:id — aislamiento cruzado', () => {
  it('devuelve 404 si el producto pertenece a otro tenant (no lo edita)', async () => {
    store.push({ id: 'p1', tenantId: 'tenant-b', nombre: 'Ajeno', categoria: 'x', precio: 10, activo: true });

    const res = await request(buildApp())
      .put('/p1')
      .set('Authorization', auth('tenant-a'))
      .send({ precio: 999 });

    expect(res.status).toBe(404);
    expect(store[0].precio).toBe(10);
  });

  it('permite editar un producto propio', async () => {
    store.push({ id: 'p1', tenantId: 'tenant-a', nombre: 'Café', categoria: 'x', precio: 10, activo: true });

    const res = await request(buildApp())
      .put('/p1')
      .set('Authorization', auth('tenant-a'))
      .send({ precio: 999 });

    expect(res.status).toBe(200);
    expect(store[0].precio).toBe(999);
  });
});

describe('DELETE /productos/:id — aislamiento cruzado', () => {
  it('no da de baja un producto de otro tenant', async () => {
    store.push({ id: 'p1', tenantId: 'tenant-b', nombre: 'Ajeno', categoria: 'x', precio: 10, activo: true });

    await request(buildApp()).delete('/p1').set('Authorization', auth('tenant-a'));

    expect(store[0].activo).toBe(true);
  });
});
