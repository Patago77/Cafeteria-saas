import { prisma } from '../lib/prisma';
import { decryptToken } from '../lib/crypto';
import { emitPedidoActualizado } from '../lib/socket';
import { CajaService } from './caja.service';

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

    // Se busca el estado anterior para no duplicar el ingreso en caja si MP
    // reintenta la notificación del mismo pago (los webhooks no son exactly-once).
    const anterior = await prisma.pedido.findFirst({ where: { id: pago.external_reference, tenantId: tenant.id } });
    if (!anterior) return;

    const estadoPago = pago.status === 'approved' ? 'pagado' : 'pendiente';
    const pedido = await prisma.pedido.updateMany({
      where: { id: pago.external_reference, tenantId: tenant.id },
      data: { estadoPago: estadoPago as never, mpPaymentId: paymentId },
    });

    if (pedido.count > 0) {
      const actualizado = await prisma.pedido.findUnique({ where: { id: pago.external_reference } });
      emitPedidoActualizado(tenant.id, actualizado);

      if (estadoPago === 'pagado' && anterior.estadoPago !== 'pagado') {
        await CajaService.registrarIngresoPorPedido(tenant.id, pago.external_reference, actualizado!.mesa, Number(actualizado!.total));
      }
    }
  }
}
