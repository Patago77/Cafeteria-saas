import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middlewares/auth';
import { tenantActivo } from '../middlewares/tenantActivo';
import { requiereRol } from '../middlewares/roles';
import type { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(autenticar, tenantActivo);

router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const cajas = await prisma.caja.findMany({
      where: { tenantId, activo: true },
      include: { movimientos: { orderBy: { fecha: 'desc' }, take: 10 } },
    });
    res.json(cajas);
  } catch (err) {
    next(err);
  }
});

router.post('/', requiereRol('admin'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const { nombre } = z.object({ nombre: z.string().min(1) }).parse(req.body);
    const caja = await prisma.caja.create({ data: { tenantId, nombre } });
    res.status(201).json(caja);
  } catch (err) {
    next(err);
  }
});

const movimientoSchema = z.object({
  tipo: z.enum(['apertura', 'cierre', 'retiro', 'ingreso']),
  monto: z.number().positive(),
  notas: z.string().optional(),
});

router.post('/:id/movimientos', requiereRol('admin', 'cajero'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const data = movimientoSchema.parse(req.body);
    const caja = await prisma.caja.findFirst({ where: { id: req.params.id, tenantId } });
    if (!caja) {
      res.status(404).json({ error: 'Caja no encontrada' });
      return;
    }
    const movimiento = await prisma.movimientoCaja.create({
      data: { cajaId: caja.id, ...data },
    });
    res.status(201).json(movimiento);
  } catch (err) {
    next(err);
  }
});

export default router;
