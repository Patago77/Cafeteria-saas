import { describe, it, expect, beforeEach } from 'vitest';
import { usePedidoStore } from './pedido.store';

function reset() {
  usePedidoStore.setState({ carrito: [], pedidosActivos: [] });
}

beforeEach(reset);

describe('carrito', () => {
  it('agrega un item nuevo', () => {
    usePedidoStore.getState().agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });
    expect(usePedidoStore.getState().carrito).toEqual([
      { productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 },
    ]);
  });

  it('si el producto ya está en el carrito, suma cantidad en vez de duplicar la fila', () => {
    const { agregarItem } = usePedidoStore.getState();
    agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });
    agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });

    const carrito = usePedidoStore.getState().carrito;
    expect(carrito).toHaveLength(1);
    expect(carrito[0].cantidad).toBe(2);
  });

  it('quitarItem elimina la fila completa (no decrementa de a uno)', () => {
    const { agregarItem, quitarItem } = usePedidoStore.getState();
    agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });
    agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });
    quitarItem('p1');
    expect(usePedidoStore.getState().carrito).toEqual([]);
  });

  it('limpiarCarrito vacía el carrito sin tocar pedidosActivos', () => {
    usePedidoStore.getState().agregarItem({ productoId: 'p1', nombre: 'Café', precioUnit: 100, cantidad: 1 });
    usePedidoStore.getState().initPedidos([{ id: 'ped-1', estado: 'pendiente' }]);

    usePedidoStore.getState().limpiarCarrito();

    expect(usePedidoStore.getState().carrito).toEqual([]);
    expect(usePedidoStore.getState().pedidosActivos).toHaveLength(1);
  });
});

describe('pedidosActivos (usado por el socket de cocina)', () => {
  it('initPedidos reemplaza la lista completa', () => {
    usePedidoStore.getState().initPedidos([
      { id: 'ped-1', estado: 'pendiente' },
      { id: 'ped-2', estado: 'listo' },
    ]);
    expect(usePedidoStore.getState().pedidosActivos).toHaveLength(2);
  });

  it('actualizarPedidoSocket antepone un pedido nuevo', () => {
    usePedidoStore.getState().initPedidos([{ id: 'ped-1', estado: 'pendiente' }]);
    usePedidoStore.getState().actualizarPedidoSocket({ id: 'ped-2', estado: 'pendiente' });

    const activos = usePedidoStore.getState().pedidosActivos;
    expect(activos.map((p) => p.id)).toEqual(['ped-2', 'ped-1']);
  });

  it('actualizarPedidoSocket reemplaza (por id) un pedido existente en vez de duplicarlo', () => {
    usePedidoStore.getState().initPedidos([
      { id: 'ped-1', estado: 'pendiente' },
      { id: 'ped-2', estado: 'pendiente' },
    ]);
    usePedidoStore.getState().actualizarPedidoSocket({ id: 'ped-1', estado: 'listo' });

    const activos = usePedidoStore.getState().pedidosActivos;
    expect(activos).toHaveLength(2);
    expect(activos.find((p) => p.id === 'ped-1')?.estado).toBe('listo');
  });
});
