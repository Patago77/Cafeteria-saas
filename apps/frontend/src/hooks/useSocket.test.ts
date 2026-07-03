import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { ioMock, socketOn, socketDisconnect, reproducirBeep, notificarNuevoPedido } = vi.hoisted(() => ({
  ioMock: vi.fn(),
  socketOn: vi.fn(),
  socketDisconnect: vi.fn(),
  reproducirBeep: vi.fn(),
  notificarNuevoPedido: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => {
    ioMock(...args);
    return { on: socketOn, disconnect: socketDisconnect };
  },
}));
vi.mock('@/lib/notificaciones', () => ({ reproducirBeep, notificarNuevoPedido }));

import { useSocket } from './useSocket';
import { usePedidoStore } from '@/stores/pedido.store';

beforeEach(() => {
  ioMock.mockClear();
  socketOn.mockClear();
  socketDisconnect.mockClear();
  reproducirBeep.mockClear();
  notificarNuevoPedido.mockClear();
  localStorage.clear();
  usePedidoStore.setState({ carrito: [], pedidosActivos: [] });
});

describe('useSocket', () => {
  it('no conecta si no hay token guardado', () => {
    const { unmount } = renderHook(() => useSocket());
    expect(ioMock).not.toHaveBeenCalled();
    unmount();
  });

  it('conecta con el token y se suscribe a pedido:actualizado', () => {
    localStorage.setItem('token', 'mi-token');
    const { unmount } = renderHook(() => useSocket());

    expect(ioMock).toHaveBeenCalledWith(expect.any(String), { auth: { token: 'mi-token' } });
    expect(socketOn).toHaveBeenCalledWith('pedido:actualizado', expect.any(Function));
    unmount();
  });

  it('se desconecta al desmontar', () => {
    localStorage.setItem('token', 'mi-token');
    const { unmount } = renderHook(() => useSocket());
    unmount();
    expect(socketDisconnect).toHaveBeenCalled();
  });

  it('un pedido nuevo en estado pendiente dispara sonido + notificación', () => {
    localStorage.setItem('token', 'mi-token');
    const { unmount } = renderHook(() => useSocket());

    const handler = socketOn.mock.calls[0][1] as (p: unknown) => void;
    handler({ id: 'ped-1', estado: 'pendiente', mesa: '5' });

    expect(reproducirBeep).toHaveBeenCalledOnce();
    expect(notificarNuevoPedido).toHaveBeenCalledWith('5');
    expect(usePedidoStore.getState().pedidosActivos).toHaveLength(1);
    unmount();
  });

  it('actualizar un pedido que ya existe NO dispara sonido de nuevo', () => {
    usePedidoStore.getState().initPedidos([{ id: 'ped-1', estado: 'pendiente' }]);
    localStorage.setItem('token', 'mi-token');
    const { unmount } = renderHook(() => useSocket());

    const handler = socketOn.mock.calls[0][1] as (p: unknown) => void;
    handler({ id: 'ped-1', estado: 'en_preparacion' });

    expect(reproducirBeep).not.toHaveBeenCalled();
    expect(notificarNuevoPedido).not.toHaveBeenCalled();
    unmount();
  });

  it('un pedido nuevo que NO está pendiente (ej. ya viene listo) no dispara la notificación', () => {
    localStorage.setItem('token', 'mi-token');
    const { unmount } = renderHook(() => useSocket());

    const handler = socketOn.mock.calls[0][1] as (p: unknown) => void;
    handler({ id: 'ped-2', estado: 'listo' });

    expect(reproducirBeep).not.toHaveBeenCalled();
    unmount();
  });
});
