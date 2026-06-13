import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middlewares/auth';
import { tenantActivo } from '../middlewares/tenantActivo';
import { requiereRol } from '../middlewares/roles';
import type { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(autenticar, tenantActivo);

const productoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  categoria: z.string().default('general'),
  stock: z.number().int().optional(),
  imagen: z.string().url().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const productos = await prisma.producto.findMany({
      where: { tenantId, activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
    res.json(productos);
  } catch (err) {
    next(err);
  }
});

router.post('/', requiereRol('admin'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const data = productoSchema.parse(req.body);
    const producto = await prisma.producto.create({ data: { ...data, tenantId } });
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requiereRol('admin'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const data = productoSchema.partial().parse(req.body);
    const producto = await prisma.producto.updateMany({
      where: { id: req.params.id, tenantId },
      data,
    });
    if (producto.count === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requiereRol('admin'), async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    await prisma.producto.updateMany({
      where: { id: req.params.id, tenantId },
      data: { activo: false },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
