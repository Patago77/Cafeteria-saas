import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { findUniqueTenant, updateTenant, countProducto } = vi.hoisted(() => ({
  findUniqueTenant: vi.fn(),
  updateTenant: vi.fn(),
  countProducto: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: findUniqueTenant, update: updateTenant },
    producto: { count: countProducto },
  },
}));

import onboardingRouter from './onboarding';
import { errorHandler } from '../middlewares/errorHandler';
import { signToken, signMpState } from '../lib/jwt';
import { decryptToken } from '../lib/crypto';

process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MP_APP_ID = 'app-id';
process.env.MP_APP_SECRET = 'app-secret';
process.env.MP_REDIRECT_URI = 'http://localhost:3333/api/onboarding/mp-callback';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', onboardingRouter);
  app.use(errorHandler);
  return app;
}

function auth(tenantId: string, rol = 'admin') {
  return `Bearer ${signToken({ userId: 'u1', tenantId, rol })}`;
}

beforeEach(() => {
  findUniqueTenant.mockReset();
  updateTenant.mockReset();
  countProducto.mockReset();
  vi.unstubAllGlobals();
});

describe('GET /mp-url', () => {
  it('bloquea con 403 a un no-admin', async () => {
    const res = await request(buildApp()).get('/mp-url').set('Authorization', auth('tenant-a', 'cajero'));
    expect(res.status).toBe(403);
  });

  it('genera una URL cuyo state es un token firmado que resuelve al tenantId del JWT', async () => {
    const res = await request(buildApp()).get('/mp-url').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    const state = url.searchParams.get('state')!;

    // El hallazgo original de la auditoría: el state ya NO es el tenantId plano.
    expect(state).not.toBe('tenant-a');
    const { verifyMpState } = await import('../lib/jwt');
    expect(verifyMpState(state)).toBe('tenant-a');
  });
});

describe('GET /mp-callback', () => {
  it('400 si falta code o state', async () => {
    const res = await request(buildApp()).get('/mp-callback').query({ code: 'abc' });
    expect(res.status).toBe(400);
  });

  it('400 INVALID_STATE si el state es el tenantId plano (regresión del hallazgo de la auditoría)', async () => {
    const res = await request(buildApp()).get('/mp-callback').query({ code: 'abc', state: 'tenant-a' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATE');
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('400 INVALID_STATE si el state es un JWT de sesión normal en vez de un state de MP', async () => {
    const sessionToken = signToken({ userId: 'u1', tenantId: 'tenant-a', rol: 'admin' });
    const res = await request(buildApp()).get('/mp-callback').query({ code: 'abc', state: sessionToken });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATE');
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('400 si Mercado Pago rechaza el intercambio de code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const state = signMpState('tenant-a');

    const res = await request(buildApp()).get('/mp-callback').query({ code: 'abc', state });

    expect(res.status).toBe(400);
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('conecta MP al tenant correcto (el del state firmado) y encripta los tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'ACCESS-PLANO', refresh_token: 'REFRESH-PLANO', user_id: 999 }),
      }),
    );
    updateTenant.mockResolvedValue({});
    const state = signMpState('tenant-a');

    const res = await request(buildApp()).get('/mp-callback').query({ code: 'abc', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/onboarding/mp-conectado');

    expect(updateTenant).toHaveBeenCalledOnce();
    const call = updateTenant.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'tenant-a' });
    expect(call.data.mpUserId).toBe('999');
    expect(decryptToken(call.data.mpAccessToken)).toBe('ACCESS-PLANO');
    expect(decryptToken(call.data.mpRefreshToken)).toBe('REFRESH-PLANO');
  });
});

describe('GET /estado', () => {
  it('refleja si MP está conectado y si hay productos, scoped al tenant del token', async () => {
    findUniqueTenant.mockResolvedValue({ mpUserId: '999' });
    countProducto.mockResolvedValue(3);

    const res = await request(buildApp()).get('/estado').set('Authorization', auth('tenant-a'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mpConectado: true, tieneProductos: true });
    expect(countProducto).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a' } });
  });

  it('rechaza sin token', async () => {
    const res = await request(buildApp()).get('/estado');
    expect(res.status).toBe(401);
  });
});
