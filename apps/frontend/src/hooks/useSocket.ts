'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePedidoStore } from '@/stores/pedido.store';
import { reproducirBeep, notificarNuevoPedido } from '@/lib/notificaciones';

let socket: Socket | null = null;

export function useSocket() {
  const actualizarPedidoSocket = usePedidoStore((s) => s.actualizarPedidoSocket);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || socket) return;

    socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
    });

    socket.on('pedido:actualizado', (pedido: { id: string; estado: string; mesa?: string | null }) => {
      const esNuevo = !usePedidoStore.getState().pedidosActivos.some((p) => p.id === pedido.id);
      actualizarPedidoSocket(pedido);
      if (esNuevo && pedido.estado === 'pendiente') {
        reproducirBeep();
        notificarNuevoPedido(pedido.mesa);
      }
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [actualizarPedidoSocket]);
}
