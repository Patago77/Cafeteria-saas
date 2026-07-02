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
    usuario: { findMany, create, updateMany },
  },
}));

import empleadosRouter from './empleados';
import { errorHandler } from '../middlewares/errorHandler';
import { signToken } from '../lib/jwt';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', empleadosRouter);
  app.use(errorHandler);
  return app;
}

function auth(tenantId: string, rol = 'admin') {
  return `Bearer ${signToken({ userId: 'u1', tenantId, rol })}`;
}

interface FakeUsuario {
  id: string;
  tenantId: string;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: string;
  activo: boolean;
}

let store: FakeUsuario[];
let seq: number;

beforeEach(() => {
  store = [];
  seq = 0;
  findUniqueTenant.mockResolvedValue({ estado: 'activo' });

  findMany.mockImplementation(async ({ where }: any) => store.filter((u) => u.tenantId === where.tenantId));
  create.mockImplementation(async ({ data }: any) => {
    const u: FakeUsuario = { id: `user-${++seq}`, activo: true, ...data };
    store.push(u);
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
  });
  updateMany.mockImplementation(async ({ where, data }: any) => {
    const matches = store.filter((u) => u.id === where.id && u.tenantId === where.tenantId);
    matches.forEach((u) => Object.assign(u, data));
    return { count: matches.length };
  });
});

describe('router-level: todo /empleados requiere rol admin', () => {
  it('bloquea con 403 a un cajero', async () => {
    const res = await request(buildApp()).get('/').set('Authorization', auth('tenant-a', 'cajero'));
    expect(res.status).toBe(403);
  });
});

describe('GET /empleados', () => {
  it('solo lista empleados del tenant del token', async () => {
    store.push(
      { id: 'e1', tenantId: 'tenant-a', nombre: 'Ana', email: 'ana@x.com', passwordHash: 'h', rol: 'cajero', activo: true },
      { id: 'e2', tenantId: 'tenant-b', nombre: 'Ajeno', email: 'b@x.com', passwordHash: 'h', rol: 'cajero', activo: true },
    );

    const res = await request(buildApp()).get('/').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('e1');
  });
});

describe('POST /empleados', () => {
  it('crea el empleado bajo el tenant del JWT, ignorando un tenantId del body, y no expone el passwordHash', async () => {
    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a'))
      .send({ nombre: 'Ana', email: 'ana@x.com', password: 'password123', rol: 'cajero', tenantId: 'tenant-b' });

    expect(res.status).toBe(201);
    expect(store[0].tenantId).toBe('tenant-a');
    expect(res.body.passwordHash).toBeUndefined();
  });
});

describe('PATCH /empleados/:id/activo — aislamiento cruzado', () => {
  it('no modifica un empleado de otro tenant', async () => {
    store.push({ id: 'e1', tenantId: 'tenant-b', nombre: 'Ajeno', email: 'b@x.com', passwordHash: 'h', rol: 'cajero', activo: true });

    await request(buildApp())
      .patch('/e1/activo')
      .set('Authorization', auth('tenant-a'))
      .send({ activo: false });

    expect(store[0].activo).toBe(true);
  });
});
