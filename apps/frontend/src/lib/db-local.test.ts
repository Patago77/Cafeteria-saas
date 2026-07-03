import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { guardarPedidoLocal, getPedidosLocales, getColaSyncPendiente, eliminarDeColaSyncPor } from './db-local';

beforeEach(() => {
  // Base de datos limpia en cada test.
  indexedDB = new IDBFactory();
});

describe('guardarPedidoLocal', () => {
  it('guarda el pedido en "pedidos" Y lo encola en "cola_sync"', async () => {
    await guardarPedidoLocal({ mesa: '5', items: [{ productoId: 'p1', cantidad: 2 }] });

    const pedidos = await getPedidosLocales();
    const cola = await getColaSyncPendiente();

    expect(pedidos).toHaveLength(1);
    expect((pedidos[0] as any).mesa).toBe('5');
    expect((pedidos[0] as any).fechaLocal).toBeTypeOf('string');

    expect(cola).toHaveLength(1);
    expect((cola[0] as any).tipo).toBe('crear_pedido');
    expect((cola[0] as any).datos).toEqual({ mesa: '5', items: [{ productoId: 'p1', cantidad: 2 }] });
  });

  it('cada pedido offline queda con su propia entrada en la cola', async () => {
    await guardarPedidoLocal({ mesa: '1', items: [] });
    await guardarPedidoLocal({ mesa: '2', items: [] });

    expect(await getPedidosLocales()).toHaveLength(2);
    expect(await getColaSyncPendiente()).toHaveLength(2);
  });
});

describe('eliminarDeColaSyncPor', () => {
  it('saca solo la entrada indicada de la cola de sync', async () => {
    await guardarPedidoLocal({ mesa: '1', items: [] });
    await guardarPedidoLocal({ mesa: '2', items: [] });

    const [primero, segundo] = await getColaSyncPendiente();
    await eliminarDeColaSyncPor((primero as any).id);

    const restante = await getColaSyncPendiente();
    expect(restante).toHaveLength(1);
    expect((restante[0] as any).id).toBe((segundo as any).id);
  });
});
