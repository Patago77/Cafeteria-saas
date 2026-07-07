'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { guardarPedidoLocal, getPedidosLocales } from '@/lib/db-local';
import { useConexion } from './useConexion';

interface Item { productoId: string; cantidad: number; notas?: string; nombre: string; precioUnit: number }
interface DatosPedido {
  canal?: 'salon' | 'take_away' | 'delivery';
  mesa?: string;
  direccionEntrega?: string;
  telefonoEntrega?: string;
  notasEntrega?: string;
}
interface Pedido {
  id: string;
  mesa?: string | null;
  canal?: string;
  estado: string;
  estadoPago: string;
  total: number;
  creadoEn: string;
  items: { nombre: string; cantidad: number }[];
  mpInitPoint?: string | null;
  direccionEntrega?: string | null;
  telefonoEntrega?: string | null;
  notasEntrega?: string | null;
  estadoEntrega?: string | null;
  repartidorId?: string | null;
  repartidor?: { nombre: string } | null;
}

export function usePedidos(filtros?: { estado?: string; canal?: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const { online } = useConexion();

  useEffect(() => {
    if (online) {
      const params = new URLSearchParams();
      if (filtros?.estado) params.set('estado', filtros.estado);
      if (filtros?.canal) params.set('canal', filtros.canal);
      const qs = params.toString();
      api.get(`/pedidos${qs ? `?${qs}` : ''}`).then(setPedidos).catch(console.error);
    } else {
      getPedidosLocales().then((local) => setPedidos(local as Pedido[]));
    }
  }, [online, filtros?.estado, filtros?.canal]);

  const crearPedido = useCallback(async (items: Item[], datos?: DatosPedido) => {
    setLoading(true);
    try {
      const payload = {
        canal: datos?.canal ?? 'salon',
        mesa: datos?.mesa,
        direccionEntrega: datos?.direccionEntrega,
        telefonoEntrega: datos?.telefonoEntrega,
        notasEntrega: datos?.notasEntrega,
        items: items.map(({ productoId, cantidad, notas }) => ({ productoId, cantidad, notas })),
      };
      if (online) {
        const pedido = await api.post('/pedidos', payload);
        setPedidos((prev) => [pedido, ...prev]);
        return pedido;
      } else {
        const local = await guardarPedidoLocal({ ...payload, _pendingSync: true });
        const pedidoLocal: Pedido = {
          id: String(local.id),
          mesa: payload.mesa,
          canal: payload.canal,
          estado: 'pendiente',
          estadoPago: 'pendiente',
          total: items.reduce((acc, i) => acc + i.precioUnit * i.cantidad, 0),
          creadoEn: local.fechaLocal,
          items: items.map(({ nombre, cantidad }) => ({ nombre, cantidad })),
        };
        setPedidos((prev) => [pedidoLocal, ...prev]);
        return pedidoLocal;
      }
    } finally {
      setLoading(false);
    }
  }, [online]);

  const actualizarEstado = useCallback(async (pedidoId: string, estado: string) => {
    await api.patch(`/pedidos/${pedidoId}/estado`, { estado });
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, estado } : p));
  }, []);

  const marcarPago = useCallback(async (pedidoId: string, estadoPago: string) => {
    await api.patch(`/pedidos/${pedidoId}/pago`, { estadoPago });
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, estadoPago } : p));
  }, []);

  const actualizarEntrega = useCallback(
    async (pedidoId: string, cambios: { estadoEntrega?: string; repartidorId?: string | null }) => {
      const actualizado = await api.patch(`/pedidos/${pedidoId}/entrega`, cambios);
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, ...actualizado } : p)));
      return actualizado;
    },
    []
  );

  return { pedidos, loading, crearPedido, actualizarEstado, marcarPago, actualizarEntrega };
}
