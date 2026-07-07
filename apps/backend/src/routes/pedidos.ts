import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middlewares/auth';
import { tenantActivo } from '../middlewares/tenantActivo';
import { requiereRol } from '../middlewares/roles';
import type { AuthRequest } from '../middlewares/auth';
import { PedidoService } from '../services/pedido.service';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(autenticar, tenantActivo);

const itemSchema = z.object({
  productoId: z.string(),
  cantidad: z.number().int().positive(),
  notas: z.string().optional(),
});

const crearPedidoSchema = z
  .object({
    canal: z.enum(['salon', 'take_away', 'delivery']).default('salon'),
    mesa: z.string().optional(),
    direccionEntrega: z.string().optional(),
    telefonoEntrega: z.string().optional(),
    notasEntrega: z.string().optional(),
    items: z.array(itemSchema).min(1),
    notas: z.string().optional(),
  })
  .refine((data) => data.canal !== 'delivery' || !!data.direccionEntrega, {
    message: 'La dirección de entrega es obligatoria para pedidos de delivery',
    path: ['direccionEntrega'],
  });

// GET /api/pedidos — lista pedidos del tenant (con filtros)
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const { estado, fecha, activos, canal } = req.query as { estado?: string; fecha?: string; activos?: string; canal?: string };
    const pedidos = await PedidoService.listar(tenantId, { estado, fecha, activos: activos === '1', canal });
    res.json(pedidos);
  } catch (err) {
    next(err);
  }
});

// GET /api/pedidos/repartidores — empleados activos para asignar a un delivery
router.get('/repartidores', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const repartidores = await prisma.usuario.findMany({
      where: { tenantId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(repartidores);
  } catch (err) {
    next(err);
  }
});

// GET /api/pedidos/metricas — métricas del día para el dashboard
router.get('/metricas', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const metricas = await PedidoService.metricasHoy(tenantId);
    res.json(metricas);
  } catch (err) {
    next(err);
  }
});

// POST /api/pedidos — crea un nuevo pedido
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = req as AuthRequest;
    const data = crearPedidoSchema.parse(req.body);
    const pedido = await PedidoService.crear(tenantId, userId, data);
    res.status(201).json(pedido);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pedidos/:id/estado — actualiza estado del pedido
router.patch('/:id/estado', async (req, res, next) => {
  try {
    const { tenantId } = req as unknown as AuthRequest;
    const { estado } = z.object({ estado: z.string() }).parse(req.body);
    const pedido = await PedidoService.actualizarEstado(req.params.id, tenantId, estado);
    res.json(pedido);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pedidos/:id/pago — marca el pago manualmente (efectivo, etc.)
router.patch('/:id/pago', requiereRol('admin', 'cajero'), async (req, res, next) => {
  try {
    const { tenantId } = req as unknown as AuthRequest;
    const { estadoPago } = z.object({ estadoPago: z.enum(['pendiente', 'pagado', 'reembolsado']) }).parse(req.body);
    const pedido = await PedidoService.marcarPago(req.params.id, tenantId, estadoPago);
    res.json(pedido);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pedidos/:id/entrega — asigna repartidor y/o avanza el estado de entrega (delivery)
router.patch('/:id/entrega', requiereRol('admin', 'cajero'), async (req, res, next) => {
  try {
    const { tenantId } = req as unknown as AuthRequest;
    const { estadoEntrega, repartidorId } = z
      .object({
        estadoEntrega: z.enum(['pendiente', 'en_camino', 'entregado']).optional(),
        repartidorId: z.string().nullable().optional(),
      })
      .parse(req.body);
    const pedido = await PedidoService.actualizarEntrega(req.params.id, tenantId, { estadoEntrega, repartidorId });
    res.json(pedido);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pedidos/:id — cancela un pedido (solo admin)
router.delete('/:id', requiereRol('admin'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    await PedidoService.cancelar(req.params.id, tenantId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
