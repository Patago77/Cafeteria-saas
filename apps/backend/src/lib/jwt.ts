import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  rol: string;
}

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

interface MpStatePayload {
  tenantId: string;
  purpose: 'mp-oauth';
}

// Usado como `state` del OAuth de Mercado Pago: firma el tenantId con
// expiración corta para que /mp-callback no confíe en un state arbitrario
// del cliente (ver auditoría de aislamiento multi-tenant).
export function signMpState(tenantId: string): string {
  return jwt.sign({ tenantId, purpose: 'mp-oauth' } satisfies MpStatePayload, SECRET, { expiresIn: '10m' });
}

export function verifyMpState(state: string): string {
  const payload = jwt.verify(state, SECRET) as MpStatePayload;
  if (payload.purpose !== 'mp-oauth') throw new Error('state inválido');
  return payload.tenantId;
}
