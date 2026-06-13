export type RolUsuario = 'admin' | 'cajero' | 'mozo';
export type EstadoPedido = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado';
export type EstadoTenant = 'activo' | 'suspendido' | 'trial';

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  email: string;
  plan: string;
  estado: EstadoTenant;
  creadoEn: string;
}

export interface Usuario {
  id: string;
  tenantId: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
}

export interface Producto {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  categoria: string;
  activo: boolean;
  stock?: number | null;
  imagen?: string | null;
  creadoEn: string;
}

export interface ItemPedido {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnit: number | string;
  notas?: string | null;
  producto?: { nombre: string };
}

export interface Pedido {
  id: string;
  tenantId: string;
  usuarioId?: string | null;
  mesa?: string | null;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  total: number | string;
  mpPaymentId?: string | null;
  notas?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  items: ItemPedido[];
  usuario?: { nombre: string } | null;
}

export interface Caja {
  id: string;
  tenantId: string;
  nombre: string;
  mpPosId?: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface MovimientoCaja {
  id: string;
  cajaId: string;
  tipo: 'apertura' | 'cierre' | 'retiro' | 'ingreso';
  monto: number | string;
  notas?: string | null;
  fecha: string;
}
