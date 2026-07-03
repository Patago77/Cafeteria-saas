import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { autenticar } from '../middlewares/auth';
import type { AuthRequest } from '../middlewares/auth';
import { EmailService } from '../services/email.service';

const router = Router();

const registroSchema = z.object({
  nombreCafeteria: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  nombreAdmin: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantSlug: z.string(),
});

router.post('/registro', async (req, res, next) => {
  try {
    const data = registroSchema.parse(req.body);
    const slug = slugify(data.nombreCafeteria, { lower: true, strict: true });

    const existe = await prisma.tenant.findUnique({ where: { slug } });
    if (existe) {
      res.status(409).json({ error: 'Ya existe una cafetería con ese nombre', code: 'SLUG_TAKEN' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        nombre: data.nombreCafeteria,
        slug,
        email: data.email,
        usuarios: {
          create: {
            nombre: data.nombreAdmin,
            email: data.email,
            passwordHash,
            rol: 'admin',
          },
        },
      },
      include: { usuarios: true },
    });

    const usuario = tenant.usuarios[0];
    const token = signToken({ userId: usuario.id, tenantId: tenant.id, rol: usuario.rol });
    EmailService.bienvenida(data.email, data.nombreCafeteria).catch(console.error);
    res.status(201).json({ token, tenant: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const slug = data.tenantSlug.toLowerCase().trim();
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      res.status(401).json({ error: 'Cafetería no encontrada' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: data.email } },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const valid = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = signToken({ userId: usuario.id, tenantId: tenant.id, rol: usuario.rol });
    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const { userId, tenantId } = req as AuthRequest;
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true, rol: true, tenantId: true },
    });
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, nombre: true, slug: true, plan: true, estado: true },
    });
    res.json({ usuario, tenant });
  } catch (err) {
    next(err);
  }
});

export default router;
