'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { guardarPedidoLocal, getPedidosLocales } from '@/lib/db-local';
import { useConexion } from './useConexion';

interface Item { productoId: string; cantidad: number; notas?: string; nombre: string; precioUnit: number }
interface Pedido { id: string; mesa?: string | null; estado: string; estadoPago: string; total: number; creadoEn: string; items: { nombre: string; cantidad: number }[] }

export function usePedidos(filtros?: { estado?: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const { online } = useConexion();

  useEffect(() => {
    if (online) {
      const params = filtros?.estado ? `?estado=${filtros.estado}` : '';
      api.get(`/pedidos${params}`).then(setPedidos).catch(console.error);
    } else {
      getPedidosLocales().then((local) => setPedidos(local as Pedido[]));
    }
  }, [online, filtros?.estado]);

  const crearPedido = useCallback(async (items: Item[], mesa?: string) => {
    setLoading(true);
    try {
      const payload = {
        mesa,
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
          mesa,
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

  return { pedidos, loading, crearPedido, actualizarEstado };
}
