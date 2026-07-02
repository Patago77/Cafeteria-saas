import { prisma } from '../lib/prisma';
import { decryptToken } from '../lib/crypto';
import { emitPedidoActualizado } from '../lib/socket';

export class SyncService {
  static async procesarPagoMP(paymentId: string, mpUserId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { mpUserId },
      select: { id: true, mpAccessToken: true },
    });
    if (!tenant?.mpAccessToken) return;

    const accessToken = decryptToken(tenant.mpAccessToken);
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;

    const pago = await response.json() as { external_reference: string; status: string };

    if (!pago.external_reference) return;

    const estadoPago = pago.status === 'approved' ? 'pagado' : 'pendiente';
    const pedido = await prisma.pedido.updateMany({
      where: { id: pago.external_reference, tenantId: tenant.id },
      data: { estadoPago: estadoPago as never, mpPaymentId: paymentId },
    });

    if (pedido.count > 0) {
      const actualizado = await prisma.pedido.findUnique({ where: { id: pago.external_reference } });
      emitPedidoActualizado(tenant.id, actualizado);
    }
  }
}
