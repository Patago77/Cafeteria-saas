import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { autenticar } from '../middlewares/auth';
import { tenantActivo } from '../middlewares/tenantActivo';
import { requiereRol } from '../middlewares/roles';
import type { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(autenticar, tenantActivo, requiereRol('admin'));

const empleadoSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  rol: z.enum(['cajero', 'mozo']),
});

router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const empleados = await prisma.usuario.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(empleados);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const data = empleadoSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const empleado = await prisma.usuario.create({
      data: { tenantId, nombre: data.nombre, email: data.email, passwordHash, rol: data.rol },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    res.status(201).json(empleado);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/activo', async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
    await prisma.usuario.updateMany({
      where: { id: req.params.id, tenantId },
      data: { activo },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
