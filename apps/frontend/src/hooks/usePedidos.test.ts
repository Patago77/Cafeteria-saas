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
  // useConexion() arranca siempre con online=true por defecto (useState(true))
  // y recién se corrige a navigator.onLine en un useEffect. Eso significa que
  // en el primer render de usePedidos, su propio efecto de carga corre todavía
  // con online=true y dispara un api.get() de más, incluso arrancando offline
  // (gap real de la app, no del test). Le damos un valor por defecto inofensivo
  // para que ese llamado transitorio no rompa los tests offline.
  get.mockResolvedValue([]);
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

    // El estado final debe reflejar el pedido local, sin importar el
    // llamado transitorio a get() del primer render (ver comentario en beforeEach).
    await waitFor(() => expect(result.current.pedidos).toHaveLength(1));
    expect((result.current.pedidos[0] as any).mesa).toBe('3');
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

  it('offline: guarda en IndexedDB (gap conocido: el state de React no se actualiza al toque)', async () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.pedidos).toEqual([]));

    await act(async () => {
      await result.current.crearPedido([{ productoId: 'p1', cantidad: 1, nombre: 'Café', precioUnit: 100 }], '5');
    });

    // Sí queda persistido para sincronizar después...
    const locales = await getPedidosLocales();
    expect(locales).toHaveLength(1);
    expect((locales[0] as any)._pendingSync).toBe(true);

    // ...pero la UI (result.current.pedidos) no lo refleja hasta un refetch/remount.
    // Si este assert empieza a fallar porque se agregó una actualización optimista
    // de estado en el branch offline de crearPedido, está bien romper este test:
    // es la señal de que el gap se resolvió.
    expect(result.current.pedidos).toEqual([]);
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
