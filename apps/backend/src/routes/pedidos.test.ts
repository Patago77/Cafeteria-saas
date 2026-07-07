import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  findManyProducto,
  findManyPedido,
  createPedido,
  updateManyPedido,
  findUniquePedido,
  findFirstPedido,
  countPedido,
  aggregatePedido,
  findUniqueTenant,
  findFirstCaja,
  createMovimientoCaja,
  emitPedidoActualizado,
} = vi.hoisted(() => ({
  findManyProducto: vi.fn(),
  findManyPedido: vi.fn(),
  createPedido: vi.fn(),
  updateManyPedido: vi.fn(),
  findUniquePedido: vi.fn(),
  findFirstPedido: vi.fn(),
  countPedido: vi.fn(),
  aggregatePedido: vi.fn(),
  findUniqueTenant: vi.fn(),
  findFirstCaja: vi.fn(),
  createMovimientoCaja: vi.fn(),
  emitPedidoActualizado: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant },
    producto: { findMany: findManyProducto },
    caja: { findFirst: findFirstCaja },
    movimientoCaja: { create: createMovimientoCaja },
    pedido: {
      findMany: findManyPedido,
      create: createPedido,
      updateMany: updateManyPedido,
      findUnique: findUniquePedido,
      findFirst: findFirstPedido,
      count: countPedido,
      aggregate: aggregatePedido,
    },
  },
}));
vi.mock('../lib/socket', () => ({ emitPedidoActualizado }));
vi.mock('../lib/crypto', () => ({ decryptToken: (v: string) => v }));

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
  nombre?: string;
}
interface FakePedido {
  id: string;
  tenantId: string;
  usuarioId: string;
  mesa?: string;
  estado: string;
  estadoPago: string;
  total: number;
  creadoEn?: Date;
  items: Array<{ productoId: string; cantidad: number; precioUnit: number; producto: { nombre: string } }>;
}

let productos: FakeProducto[];
let pedidos: FakePedido[];
let seq: number;
let tenantMpAccessToken: string | null;

beforeEach(() => {
  productos = [];
  pedidos = [];
  seq = 0;
  tenantMpAccessToken = null;
  findUniqueTenant.mockImplementation(async () => ({ estado: 'activo', mpAccessToken: tenantMpAccessToken }));
  emitPedidoActualizado.mockClear();
  vi.unstubAllGlobals();

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
      items: data.items.create.map((it: any) => ({
        ...it,
        producto: { nombre: productos.find((p) => p.id === it.productoId)?.nombre ?? 'Producto' },
      })),
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
  findFirstPedido.mockImplementation(async ({ where }: any) => {
    const encontrado = pedidos.find((p) => p.id === where.id && p.tenantId === where.tenantId);
    // Copia, no la referencia viva: como en Prisma real, "anterior" no debe
    // mutar cuando el updateMany posterior modifique el objeto en la tienda fake.
    return encontrado ? { ...encontrado } : null;
  });
  findFirstCaja.mockReset().mockResolvedValue(null);
  createMovimientoCaja.mockReset().mockImplementation(async ({ data }: any) => ({ id: `mov-${++seq}`, ...data }));
  countPedido.mockImplementation(async ({ where }: any) =>
    pedidos.filter(
      (p) =>
        p.tenantId === where.tenantId &&
        (p.creadoEn ?? new Date()) >= where.creadoEn.gte &&
        p.estado !== where.estado.not
    ).length
  );
  aggregatePedido.mockImplementation(async ({ where }: any) => {
    const matches = pedidos.filter(
      (p) =>
        p.tenantId === where.tenantId &&
        (p.creadoEn ?? new Date()) >= where.creadoEn.gte &&
        p.estadoPago === where.estadoPago
    );
    return {
      _sum: { total: matches.length ? matches.reduce((acc, p) => acc + p.total, 0) : null },
      _count: matches.length,
    };
  });
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

describe('GET /pedidos/metricas', () => {
  it('cuenta pedidos de hoy (sin contar cancelados) y calcula ventas/ticket sobre los pagados', async () => {
    const hoy = new Date();
    pedidos.push(
      { id: 'p1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pagado', total: 100, creadoEn: hoy, items: [] },
      { id: 'p2', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pagado', total: 300, creadoEn: hoy, items: [] },
      { id: 'p3', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'pendiente', estadoPago: 'pendiente', total: 50, creadoEn: hoy, items: [] },
      { id: 'p4', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'cancelado', estadoPago: 'pendiente', total: 999, creadoEn: hoy, items: [] },
    );

    const res = await request(buildApp()).get('/metricas').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    // p1, p2, p3 cuentan (activos); p4 no cuenta por cancelado
    expect(res.body.pedidosHoy).toBe(3);
    // solo p1 + p2 están pagados
    expect(res.body.ventasTotales).toBe(400);
    expect(res.body.ticketPromedio).toBe(200);
  });

  it('no mezcla pedidos de otro tenant ni de días anteriores', async () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    pedidos.push(
      { id: 'p-ajeno', tenantId: 'tenant-b', usuarioId: 'u2', estado: 'entregado', estadoPago: 'pagado', total: 1000, creadoEn: new Date(), items: [] },
      { id: 'p-viejo', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pagado', total: 500, creadoEn: ayer, items: [] },
    );

    const res = await request(buildApp()).get('/metricas').set('Authorization', auth('tenant-a'));

    expect(res.body).toEqual({ pedidosHoy: 0, ventasTotales: 0, ticketPromedio: 0 });
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

  it('si el tenant no conectó Mercado Pago, el pedido se crea igual con mpInitPoint null', async () => {
    productos.push({ id: 'prod-1', tenantId: 'tenant-a', precio: 100, activo: true });

    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a'))
      .send({ items: [{ productoId: 'prod-1', cantidad: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.mpInitPoint).toBeNull();
  });

  it('si el tenant tiene MP conectado, devuelve el link de pago de la preferencia creada', async () => {
    productos.push({ id: 'prod-1', tenantId: 'tenant-a', precio: 100, activo: true });
    tenantMpAccessToken = 'token-encriptado';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ init_point: 'https://mp.com/pagar/xyz' }),
      })
    );

    const res = await request(buildApp())
      .post('/')
      .set('Authorization', auth('tenant-a'))
      .send({ items: [{ productoId: 'prod-1', cantidad: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.mpInitPoint).toBe('https://mp.com/pagar/xyz');
  });
});

describe('PATCH /pedidos/:id/pago', () => {
  it('marca el pago de un pedido propio', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ estadoPago: 'pagado' });

    expect(res.status).toBe(200);
    expect(pedidos[0].estadoPago).toBe('pagado');
    expect(emitPedidoActualizado).toHaveBeenCalledWith('tenant-a', expect.objectContaining({ id: 'ped-1' }));
  });

  it('no marca el pago de un pedido de otro tenant', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-b', usuarioId: 'u2', estado: 'entregado', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'admin'))
      .send({ estadoPago: 'pagado' });

    expect(res.status).not.toBe(200);
    expect(pedidos[0].estadoPago).toBe('pendiente');
  });

  it('si hay una caja activa, registra un ingreso con la mesa y el pedidoId', async () => {
    findFirstCaja.mockResolvedValue({ id: 'caja-1', tenantId: 'tenant-a', activo: true });
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', mesa: '7', estado: 'entregado', estadoPago: 'pendiente', total: 250, items: [] });

    await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ estadoPago: 'pagado' });

    expect(createMovimientoCaja).toHaveBeenCalledWith({
      data: { cajaId: 'caja-1', pedidoId: 'ped-1', tipo: 'ingreso', monto: 250, notas: 'Pedido mesa 7' },
    });
  });

  it('si el pedido ya estaba pagado, no duplica el ingreso en caja', async () => {
    findFirstCaja.mockResolvedValue({ id: 'caja-1', tenantId: 'tenant-a', activo: true });
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pagado', total: 250, items: [] });

    await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ estadoPago: 'pagado' });

    expect(createMovimientoCaja).not.toHaveBeenCalled();
  });

  it('si no hay ninguna caja creada, marca el pago igual sin romper', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'cajero'))
      .send({ estadoPago: 'pagado' });

    expect(res.status).toBe(200);
    expect(pedidos[0].estadoPago).toBe('pagado');
    expect(createMovimientoCaja).not.toHaveBeenCalled();
  });

  it('bloquea con 403 a un mozo', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'mozo'))
      .send({ estadoPago: 'pagado' });

    expect(res.status).toBe(403);
    expect(pedidos[0].estadoPago).toBe('pendiente');
  });

  it('rechaza un estadoPago que no sea un valor válido', async () => {
    pedidos.push({ id: 'ped-1', tenantId: 'tenant-a', usuarioId: 'u1', estado: 'entregado', estadoPago: 'pendiente', total: 100, items: [] });

    const res = await request(buildApp())
      .patch('/ped-1/pago')
      .set('Authorization', auth('tenant-a', 'admin'))
      .send({ estadoPago: 'gratis' });

    expect(res.status).not.toBe(200);
    expect(pedidos[0].estadoPago).toBe('pendiente');
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
