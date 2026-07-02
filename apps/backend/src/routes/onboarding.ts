import { Router } from 'express';
import { autenticar } from '../middlewares/auth';
import { requiereRol } from '../middlewares/roles';
import type { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { signMpState, verifyMpState } from '../lib/jwt';

const router = Router();

// GET /api/onboarding/mp-url — genera URL OAuth de Mercado Pago
router.get('/mp-url', autenticar, requiereRol('admin'), (req, res) => {
  const { tenantId } = req as AuthRequest;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MP_APP_ID!,
    redirect_uri: process.env.MP_REDIRECT_URI!,
    state: signMpState(tenantId),
  });
  res.json({ url: `https://auth.mercadopago.com.ar/authorization?${params}` });
});

// GET /api/onboarding/mp-callback — recibe el código OAuth de MP
router.get('/mp-callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    let tenantId: string;
    try {
      tenantId = verifyMpState(state);
    } catch {
      res.status(400).json({ error: 'state inválido o expirado', code: 'INVALID_STATE' });
      return;
    }

    // Intercambiar code por access_token
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MP_APP_ID,
        client_secret: process.env.MP_APP_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.MP_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      res.status(400).json({ error: 'Error al conectar con Mercado Pago' });
      return;
    }

    const mpData = await response.json() as { access_token: string; refresh_token: string; user_id: number };
    const { encryptToken } = await import('../lib/crypto.js');

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        mpAccessToken: encryptToken(mpData.access_token),
        mpRefreshToken: encryptToken(mpData.refresh_token),
        mpUserId: String(mpData.user_id),
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/onboarding/mp-conectado`);
  } catch (err) {
    next(err);
  }
});

// GET /api/onboarding/estado — retorna qué pasos completó el tenant
router.get('/estado', autenticar, async (req, res, next) => {
  try {
    const { tenantId } = req as AuthRequest;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mpUserId: true },
    });
    const productosCount = await prisma.producto.count({ where: { tenantId } });

    res.json({
      mpConectado: !!tenant?.mpUserId,
      tieneProductos: productosCount > 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
