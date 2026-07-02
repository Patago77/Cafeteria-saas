import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const { findUniqueTenant, createTenant, findUniqueUsuario } = vi.hoisted(() => ({
  findUniqueTenant: vi.fn(),
  createTenant: vi.fn(),
  findUniqueUsuario: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant, create: createTenant },
    usuario: { findUnique: findUniqueUsuario },
  },
}));

import authRouter from './auth';
import { errorHandler } from '../middlewares/errorHandler';
import { verifyToken, signToken } from '../lib/jwt';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', authRouter);
  app.use(errorHandler);
  return app;
}

function project(obj: any, select?: Record<string, boolean>) {
  if (!select) return obj;
  const out: any = {};
  for (const k of Object.keys(select)) out[k] = obj[k];
  return out;
}

interface FakeTenant {
  id: string;
  nombre: string;
  slug: string;
  email: string;
  plan: string;
  estado: string;
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

let tenants: FakeTenant[];
let usuarios: FakeUsuario[];
let seq: number;

beforeEach(() => {
  tenants = [];
  usuarios = [];
  seq = 0;
  findUniqueTenant.mockReset();
  createTenant.mockReset();
  findUniqueUsuario.mockReset();

  findUniqueTenant.mockImplementation(async ({ where, select }: any) => {
    const t = where.slug ? tenants.find((x) => x.slug === where.slug) : tenants.find((x) => x.id === where.id);
    return t ? project(t, select) : null;
  });

  createTenant.mockImplementation(async ({ data }: any) => {
    const tenantId = `tenant-${++seq}`;
    const usuario: FakeUsuario = {
      id: `user-${++seq}`,
      tenantId,
      nombre: data.usuarios.create.nombre,
      email: data.usuarios.create.email,
      passwordHash: data.usuarios.create.passwordHash,
      rol: data.usuarios.create.rol,
      activo: true,
    };
    const tenant: FakeTenant = { id: tenantId, nombre: data.nombre, slug: data.slug, email: data.email, plan: 'free', estado: 'activo' };
    tenants.push(tenant);
    usuarios.push(usuario);
    return { ...tenant, usuarios: [usuario] };
  });

  findUniqueUsuario.mockImplementation(async ({ where, select }: any) => {
    const u = where.id
      ? usuarios.find((x) => x.id === where.id)
      : usuarios.find((x) => x.tenantId === where.tenantId_email.tenantId && x.email === where.tenantId_email.email);
    return u ? project(u, select) : null;
  });
});

describe('POST /registro', () => {
  it('crea el tenant + usuario admin y devuelve un token válido', async () => {
    const res = await request(buildApp())
      .post('/registro')
      .send({ nombreCafeteria: 'Café Test', email: 'admin@test.com', password: 'password123', nombreAdmin: 'Admin' });

    expect(res.status).toBe(201);
    expect(tenants).toHaveLength(1);
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].rol).toBe('admin');

    const payload = verifyToken(res.body.token);
    expect(payload.tenantId).toBe(tenants[0].id);
    expect(payload.rol).toBe('admin');
  });

  it('rechaza con 409 si el slug ya existe', async () => {
    tenants.push({ id: 't1', nombre: 'Café Test', slug: 'cafe-test', email: 'x@x.com', plan: 'free', estado: 'activo' });

    const res = await request(buildApp())
      .post('/registro')
      .send({ nombreCafeteria: 'Café Test', email: 'otro@test.com', password: 'password123', nombreAdmin: 'Admin' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLUG_TAKEN');
    expect(createTenant).not.toHaveBeenCalled();
  });
});

describe('POST /login', () => {
  beforeEach(async () => {
    tenants.push({ id: 'tenant-a', nombre: 'Cafeteamos', slug: 'cafeteamos', email: 'x@x.com', plan: 'free', estado: 'activo' });
    usuarios.push({
      id: 'user-1',
      tenantId: 'tenant-a',
      nombre: 'Admin',
      email: 'admin@cafeteamos.com',
      passwordHash: await bcrypt.hash('correcta123', 12),
      rol: 'admin',
      activo: true,
    });
  });

  it('rechaza con 401 si la cafetería (slug) no existe', async () => {
    const res = await request(buildApp())
      .post('/login')
      .send({ tenantSlug: 'no-existe', email: 'admin@cafeteamos.com', password: 'correcta123' });
    expect(res.status).toBe(401);
  });

  it('rechaza con 401 si la contraseña es incorrecta', async () => {
    const res = await request(buildApp())
      .post('/login')
      .send({ tenantSlug: 'cafeteamos', email: 'admin@cafeteamos.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rechaza con 401 si el usuario está inactivo', async () => {
    usuarios[0].activo = false;
    const res = await request(buildApp())
      .post('/login')
      .send({ tenantSlug: 'cafeteamos', email: 'admin@cafeteamos.com', password: 'correcta123' });
    expect(res.status).toBe(401);
  });

  it('devuelve un token con el tenantId/rol correctos si las credenciales son válidas', async () => {
    const res = await request(buildApp())
      .post('/login')
      .send({ tenantSlug: 'cafeteamos', email: 'admin@cafeteamos.com', password: 'correcta123' });

    expect(res.status).toBe(200);
    const payload = verifyToken(res.body.token);
    expect(payload.tenantId).toBe('tenant-a');
    expect(payload.rol).toBe('admin');
  });
});

describe('GET /me', () => {
  it('rechaza sin token', async () => {
    const res = await request(buildApp()).get('/me');
    expect(res.status).toBe(401);
  });

  it('devuelve al propio usuario y tenant, sin exponer el passwordHash', async () => {
    tenants.push({ id: 'tenant-a', nombre: 'Cafeteamos', slug: 'cafeteamos', email: 'x@x.com', plan: 'free', estado: 'activo' });
    usuarios.push({
      id: 'user-1',
      tenantId: 'tenant-a',
      nombre: 'Admin',
      email: 'admin@cafeteamos.com',
      passwordHash: 'hash-secreto',
      rol: 'admin',
      activo: true,
    });

    const token = signToken({ userId: 'user-1', tenantId: 'tenant-a', rol: 'admin' });
    const res = await request(buildApp()).get('/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe('user-1');
    expect(res.body.usuario.passwordHash).toBeUndefined();
    expect(res.body.tenant.slug).toBe('cafeteamos');
  });
});
