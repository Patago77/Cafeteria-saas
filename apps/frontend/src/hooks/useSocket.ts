'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePedidoStore } from '@/stores/pedido.store';

let socket: Socket | null = null;

export function useSocket() {
  const actualizarPedidoSocket = usePedidoStore((s) => s.actualizarPedidoSocket);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || socket) return;

    socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      auth: { token },
    });

    socket.on('pedido:actualizado', actualizarPedidoSocket);

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [actualizarPedidoSocket]);
}
