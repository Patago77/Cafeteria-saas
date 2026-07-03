import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { renderHook, waitFor, act } from '@testing-library/react';

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ api: { get, post, patch } }));

import { usePedidos } from './usePedidos';
import { getPedidosLocales, guardarPedidoLocal } from '@/lib/db-local';

function setOnlineStatus(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

beforeEach(() => {
  indexedDB = new IDBFactory();
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  setOnlineStatus(true);
});

describe('carga inicial', () => {
  it('online: trae los pedidos de la API', async () => {
    get.mockResolvedValue([{ id: 'ped-1', estado: 'pendiente' }]);

    const { result } = renderHook(() => usePedidos());

    await waitFor(() => expect(result.current.pedidos).toHaveLength(1));
    expect(get).toHaveBeenCalledWith('/pedidos');
  });

  it('offline: lee de IndexedDB en vez de llamar a la API', async () => {
    setOnlineStatus(false);
    // sembramos un pedido local antes de montar el hook
    await guardarPedidoLocal({ mesa: '3', items: [] });

    const { result } = renderHook(() => usePedidos());

    await waitFor(() => expect(result.current.pedidos).toHaveLength(1));
    expect((result.current.pedidos[0] as any).mesa).toBe('3');
    expect(get).not.toHaveBeenCalled();
  });
});

describe('crearPedido', () => {
  it('online: crea vía API y antepone el pedido al estado', async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue({ id: 'ped-nuevo', estado: 'pendiente' });

    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(get).toHaveBeenCalled());

    await act(async () => {
      await result.current.crearPedido([{ productoId: 'p1', cantidad: 1, nombre: 'Café', precioUnit: 100 }], '5');
    });

    expect(post).toHaveBeenCalledWith('/pedidos', { mesa: '5', items: [{ productoId: 'p1', cantidad: 1, notas: undefined }] });
    expect(result.current.pedidos[0].id).toBe('ped-nuevo');
  });

  it('offline: guarda en IndexedDB Y antepone el pedido al estado de React', async () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.pedidos).toEqual([]));

    await act(async () => {
      await result.current.crearPedido([{ productoId: 'p1', cantidad: 2, nombre: 'Café', precioUnit: 100 }], '5');
    });

    // queda persistido para sincronizar después...
    const locales = await getPedidosLocales();
    expect(locales).toHaveLength(1);
    expect((locales[0] as any)._pendingSync).toBe(true);

    // ...y la UI lo refleja de inmediato, sin esperar un refetch/remount.
    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].mesa).toBe('5');
    expect(result.current.pedidos[0].total).toBe(200);
    expect(result.current.pedidos[0].estado).toBe('pendiente');
  });
});

describe('actualizarEstado', () => {
  it('llama al PATCH correcto y actualiza el pedido en el estado local', async () => {
    get.mockResolvedValue([{ id: 'ped-1', estado: 'pendiente' }]);
    patch.mockResolvedValue({});

    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.pedidos).toHaveLength(1));

    await act(async () => {
      await result.current.actualizarEstado('ped-1', 'listo');
    });

    expect(patch).toHaveBeenCalledWith('/pedidos/ped-1/estado', { estado: 'listo' });
    expect(result.current.pedidos[0].estado).toBe('listo');
  });
});

describe('marcarPago', () => {
  it('llama al PATCH de pago correcto y actualiza el estadoPago en el estado local', async () => {
    get.mockResolvedValue([{ id: 'ped-1', estado: 'entregado', estadoPago: 'pendiente' }]);
    patch.mockResolvedValue({});

    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.pedidos).toHaveLength(1));

    await act(async () => {
      await result.current.marcarPago('ped-1', 'pagado');
    });

    expect(patch).toHaveBeenCalledWith('/pedidos/ped-1/pago', { estadoPago: 'pagado' });
    expect(result.current.pedidos[0].estadoPago).toBe('pagado');
  });
});
