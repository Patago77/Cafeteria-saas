import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, signMpState, verifyMpState } from './jwt';

describe('signToken / verifyToken', () => {
  it('recupera el payload original', () => {
    const token = signToken({ userId: 'u1', tenantId: 't1', rol: 'admin' });
    expect(verifyToken(token)).toMatchObject({ userId: 'u1', tenantId: 't1', rol: 'admin' });
  });

  it('rechaza un token con firma inválida', () => {
    const token = signToken({ userId: 'u1', tenantId: 't1', rol: 'admin' });
    expect(() => verifyToken(token + 'x')).toThrow();
  });
});

describe('signMpState / verifyMpState (state del OAuth de Mercado Pago)', () => {
  it('recupera el tenantId original', () => {
    const state = signMpState('tenant-123');
    expect(verifyMpState(state)).toBe('tenant-123');
  });

  it('no acepta el tenantId "pelado" como si fuera un state válido', () => {
    // Este es exactamente el hallazgo de la auditoría: antes del fix,
    // /mp-callback confiaba en `state` como tenantId directo.
    expect(() => verifyMpState('tenant-123')).toThrow();
  });

  it('no acepta un JWT normal de sesión (distinto purpose) como state de MP', () => {
    const sessionToken = signToken({ userId: 'u1', tenantId: 'tenant-123', rol: 'admin' });
    expect(() => verifyMpState(sessionToken)).toThrow();
  });
});
