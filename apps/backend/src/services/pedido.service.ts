import { prisma } from '../lib/prisma';
import { emitPedidoActualizado } from '../lib/socket';
import { MercadoPagoService } from './mercadopago.service';

interface ItemInput {
  productoId: string;
  cantidad: number;
  notas?: string;
}

interface CrearPedidoInput {
  mesa?: string;
  items: ItemInput[];
  notas?: string;
}

export class PedidoService {
  static async listar(tenantId: string, filtros: { estado?: string; fecha?: string; activos?: boolean }) {
    return prisma.pedido.findMany({
      where: {
        tenantId,
        ...(filtros.activos && { estado: { in: ['pendiente', 'en_preparacion', 'listo'] as never[] } }),
        ...(!filtros.activos && filtros.estado && { estado: filtros.estado as never }),
        ...(filtros.fecha && { creadoEn: { gte: new Date(filtros.fecha) } }),
      },
      include: {
        items: { include: { producto: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  static async crear(tenantId: string, userId: string, input: CrearPedidoInput) {
    const productIds = input.items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productIds }, tenantId, activo: true },
    });

    if (productos.length !== productIds.length) {
      throw new Error('Uno o más productos no encontrados o inactivos');
    }

    const productoMap = new Map(productos.map((p) => [p.id, p]));
    const total = input.items.reduce((acc, item) => {
      const p = productoMap.get(item.productoId)!;
      return acc + Number(p.precio) * item.cantidad;
    }, 0);

    const pedido = await prisma.pedido.create({
      data: {
        tenantId,
        usuarioId: userId,
        mesa: input.mesa,
        notas: input.notas,
        total,
        items: {
          create: input.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnit: productoMap.get(item.productoId)!.precio,
            notas: item.notas,
          })),
        },
      },
      include: { items: { include: { producto: { select: { nombre: true } } } } },
    });

    emitPedidoActualizado(tenantId, pedido);

    // El cobro por Mercado Pago es opcional: si el tenant no conectó su
    // cuenta (o falla la llamada a la API de MP), el pedido igual se crea
    // y se puede cobrar en efectivo/marcar pagado a mano.
    let mpInitPoint: string | null = null;
    try {
      const preferencia = await MercadoPagoService.crearPreferencia(
        tenantId,
        pedido.id,
        pedido.items.map((item) => ({
          title: item.producto.nombre,
          unit_price: Number(item.precioUnit),
          quantity: item.cantidad,
        }))
      );
      mpInitPoint = preferencia.init_point ?? preferencia.sandbox_init_point ?? null;
    } catch {
      mpInitPoint = null;
    }

    return { ...pedido, mpInitPoint };
  }

  static async marcarPago(pedidoId: string, tenantId: string, estadoPago: string) {
    const res = await prisma.pedido.updateMany({
      where: { id: pedidoId, tenantId },
      data: { estadoPago: estadoPago as never },
    });
    if (res.count === 0) throw new Error('Pedido no encontrado');
    const actualizado = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    emitPedidoActualizado(tenantId, actualizado);
    return actualizado;
  }

  static async actualizarEstado(pedidoId: string, tenantId: string, estado: string) {
    const pedido = await prisma.pedido.updateMany({
      where: { id: pedidoId, tenantId },
      data: { estado: estado as never },
    });
    if (pedido.count === 0) throw new Error('Pedido no encontrado');
    const actualizado = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    emitPedidoActualizado(tenantId, actualizado);
    return actualizado;
  }

  static async cancelar(pedidoId: string, tenantId: string) {
    await prisma.pedido.updateMany({
      where: { id: pedidoId, tenantId },
      data: { estado: 'cancelado' },
    });
  }

  static async metricasHoy(tenantId: string) {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [pedidosHoy, ventas] = await Promise.all([
      prisma.pedido.count({
        where: { tenantId, creadoEn: { gte: inicioHoy }, estado: { not: 'cancelado' } },
      }),
      prisma.pedido.aggregate({
        where: { tenantId, creadoEn: { gte: inicioHoy }, estadoPago: 'pagado' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const ventasTotales = Number(ventas._sum.total ?? 0);
    const ticketPromedio = ventas._count > 0 ? ventasTotales / ventas._count : 0;

    return { pedidosHoy, ventasTotales, ticketPromedio };
  }
}
