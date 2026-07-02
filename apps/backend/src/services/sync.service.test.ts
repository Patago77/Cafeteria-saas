import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findFirst, updateMany, findUnique, decryptToken, emitPedidoActualizado } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  decryptToken: vi.fn().mockReturnValue('access-token-plano'),
  emitPedidoActualizado: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    tenant: { findFirst },
    pedido: { updateMany, findUnique },
  },
}));
vi.mock('../lib/crypto', () => ({ decryptToken }));
vi.mock('../lib/socket', () => ({ emitPedidoActualizado }));

import { SyncService } from './sync.service';

describe('SyncService.procesarPagoMP', () => {
  beforeEach(() => {
    findFirst.mockReset();
    updateMany.mockReset();
    findUnique.mockReset();
    decryptToken.mockClear();
    emitPedidoActualizado.mockClear();
    vi.unstubAllGlobals();
  });

  it('resuelve el tenant por mpUserId del payload, no por "el primero conectado" (regresión del hallazgo de la auditoría)', async () => {
    findFirst.mockResolvedValue({ id: 'tenant-correcto', mpAccessToken: 'enc-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external_reference: 'pedido-1', status: 'approved' }),
    }));
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: 'pedido-1', estadoPago: 'pagado' });

    await SyncService.procesarPagoMP('payment-1', 'mp-user-correcto');

    expect(findFirst).toHaveBeenCalledWith({
      where: { mpUserId: 'mp-user-correcto' },
      select: { id: true, mpAccessToken: true },
    });
  });

  it('no hace nada si ningún tenant matchea ese mpUserId', async () => {
    findFirst.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await SyncService.procesarPagoMP('payment-1', 'mp-user-desconocido');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('actualiza el pedido del tenant correcto y emite el evento cuando el pago está aprobado', async () => {
    findFirst.mockResolvedValue({ id: 'tenant-correcto', mpAccessToken: 'enc-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external_reference: 'pedido-1', status: 'approved' }),
    }));
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: 'pedido-1', estadoPago: 'pagado' });

    await SyncService.procesarPagoMP('payment-1', 'mp-user-correcto');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'pedido-1', tenantId: 'tenant-correcto' },
      data: { estadoPago: 'pagado', mpPaymentId: 'payment-1' },
    });
    expect(emitPedidoActualizado).toHaveBeenCalledWith('tenant-correcto', { id: 'pedido-1', estadoPago: 'pagado' });
  });

  it('no emite evento si el pedido no pertenece a ese tenant (updateMany.count === 0)', async () => {
    findFirst.mockResolvedValue({ id: 'tenant-correcto', mpAccessToken: 'enc-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external_reference: 'pedido-de-otro-tenant', status: 'approved' }),
    }));
    updateMany.mockResolvedValue({ count: 0 });

    await SyncService.procesarPagoMP('payment-1', 'mp-user-correcto');

    expect(emitPedidoActualizado).not.toHaveBeenCalled();
  });
});
