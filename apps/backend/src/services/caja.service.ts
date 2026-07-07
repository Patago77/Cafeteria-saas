import { prisma } from '../lib/prisma';

export class CajaService {
  // Se llama cuando un pedido pasa a estadoPago 'pagado' (marcado a mano o
  // vía webhook de MP). Usa la primera caja activa del tenant — si todavía
  // no creó ninguna caja, no falla nada, simplemente no queda registrado.
  static async registrarIngresoPorPedido(tenantId: string, pedidoId: string, mesa: string | null, monto: number) {
    const caja = await prisma.caja.findFirst({ where: { tenantId, activo: true } });
    if (!caja) return null;

    return prisma.movimientoCaja.create({
      data: {
        cajaId: caja.id,
        pedidoId,
        tipo: 'ingreso',
        monto,
        notas: mesa ? `Pedido mesa ${mesa}` : 'Pedido sin mesa',
      },
    });
  }
}
