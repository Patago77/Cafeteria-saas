import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { findManyProducto, findManyPedido, createPedido, updateManyPedido, findUniquePedido, findUniqueTenant, emitPedidoActualizado } =
  vi.hoisted(() => ({
    findManyProducto: vi.fn(),
    findManyPedido: vi.fn(),
    createPedido: vi.fn(),
    updateManyPedido: vi.fn(),
    findUniquePedido: vi.fn(),
    findUniqueTenant: vi.fn(),
    emitPedidoActualizado: vi.fn(),
  }));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant },
    producto: { findMany: findManyProducto },
    pedido: { findMany: findManyPedido, create: createPedido, updateMany: updateManyPedido, findUnique: findUniquePedido },
  },
}));
vi.mock('../lib/socket', () => ({ emitPedidoActualizado }));

import pedidosRouter from './pedidos';
import { errorHandler } from '../middlewares/errorHandler';
import { signToken } from '../lib/jwt';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', pedidosRouter);
  app.use(errorHandler);
  return app;
}

function auth(tenantId: string, rol = 'admin', userId = 'u1') {
  return `Bearer ${signToken({ userId, tenantId, rol })}`;
}

interface FakeProducto {
  id: string;
  tenantId: string;
  precio: number;
  activo: boolean;
}
interface FakePedido {
  id: string;
  tenantId: string;
  usuarioId: string;
  mesa?: string;
  estado: string;
  estadoPago: string;
  total: number;
  items: Array<{ productoId: string; cantidad: number; precioUnit: number }>;
}

let productos: FakeProducto[];
let pedidos: FakePedido[];
let seq: number;

beforeEach(() => {
  productos = [];
  pedidos = [];
  seq = 0;
  findUniqueTenant.mockResolvedValue({ estado: 'activo' });
  emitPedidoActualizado.mockClear();

  findManyProducto.mockImplementation(async ({ where }: any) =>
    productos.filter((p) => where.id.in.includes(p.id) && p.tenantId === where.tenantId && p.activo === where.activo)
  );
  findManyPedido.mockImplementation(async ({ where }: any) => pedidos.filter((p) => p.tenantId === where.tenantId));
  createPedido.mockImplementation(async ({ data }: any) => {
    const pedido: FakePedido = {
      id: `pedido-${++seq}`,
      tenantId: data.tenantId,
      usuarioId: data.usuarioId,
      mesa: data.mesa,
      estado: 'pendiente',
      estadoPago: 'pendiente',
      total: data.total,
      items: data.items.create,
    };
    pedidos.push(pedido);
    return pedido;
  });
  updateManyPedido.mockImplementation(async ({ where, data }: any) => {
    const matches = pedidos.filter((p) => p.id === where.id && p.tenantId === where.tenantId);
    matches.forEach((p) => Object.assign(p, data));
    return { count: matches.length };
  });
  findUniquePedido.mockImplementation(async ({ where }: any) => pedidos.find((p) => p.id === where.id) ?? null);
});

describe('GET /pedidos', () => {
  it('solo lista pedidos del tenant del token', async () => {
    pedidos.push(
      { id: 'ped-a', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'pendiente', estadoPago: 'pendiente', total: 100, items: [] },
      { id: 'ped-b', tenantId: 'tenant-b', usuarioId: 'u2', estado: 'pendiente', estadoPago: 'pendiente', total: 200, items: [] },
    );

    const res = await request(buildApp()).get('/').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('ped-a');
  });
});

describe('POST /pedidos', () => {
  it('crea el pedido con el tenantId/usuarioId del JWT, ignorando lo que venga en el body', async () => {
    productos.push({ id: 'prod-1', tenantId: 'tenant-a', precio: 100, activo: true });

    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a', 'admin', 'user-real'))
      .send({
        items: [{ productoId: 'prod-1', cantidad: 2 }],
        tenantId: 'tenant-b',
        usuarioId: 'user-spoofeado',
      });

    expect(res.status).toBe(201);
    expect(pedidos[0].tenantId).toBe('tenant-a');
    expect(pedidos[0].usuarioId).toBe('user-real');
    expect(pedidos[0].total).toBe(200);
  });

  it('no permite crear un pedido referenciando un producto de otro tenant', async () => {
    productos.push({ id: 'prod-ajeno', tenantId: 'tenant-b', precio: 100, activo: true });

    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a'))
      .send({ items: [{ productoId: 'prod-ajeno', cantidad: 1 }] });

    expect(res.status).not.toBe(201);
    expect(pedidos).toHaveLength(0);
  });
});

describe('PATCH /pedidos/:id/estado — aislamiento cruzado', () => {
  it('no actualiza un pedido de otro tenant', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-b', usuarioId: 'u2', estado: 'pendiente', estadoPago: 'pendiente', total: 100, items: [] });

    await request(buildApp())
      .patch('/ped-1/estado')
      .set('Authorization', auth('tenant-a'))
      .send({ estado: 'listo' });

    expect(pedidos[0].estado).toBe('pendiente');
    expect(emitPedidoActualizado).not.toHaveBeenCalled();
  });

  it('actualiza un pedido propio y emite el evento de socket al tenant correcto', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'pendiente', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/estado')
      .set('Authorization', auth('tenant-a'))
      .send({ estado: 'listo' });

    expect(res.status).toBe(200);
    expect(pedidos[0].estado).toBe('listo');
    expect(emitPedidoActualizado).toHaveBeenCalledWith('tenant-a', expect.objectContaining({ id: 'ped-1' }));
  });
});

describe('DELETE /pedidos/:id — cancelar (solo admin)', () => {
  it('bloquea con 403 a un mozo', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'pendiente', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp()).delete('/ped-1').set('Authorization', auth('tenant-a', 'mozo'));

    expect(res.status).toBe(403);
    expect(pedidos[0].estado).toBe('pendiente');
  });

  it('no cancela un pedido de otro tenant', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-b', usuarioId: 'u2', estado: 'pendiente', estadoPago: 'pendiente', total: 100, items: [] });

    await request(buildApp()).delete('/ped-1').set('Authorization', auth('tenant-a', 'admin'));

    expect(pedidos[0].estado).toBe('pendiente');
  });
});
