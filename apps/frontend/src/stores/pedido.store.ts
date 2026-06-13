import { create } from 'zustand';

interface CarritoItem {
  productoId: string;
  nombre: string;
  precioUnit: number;
  cantidad: number;
}

interface PedidoSocket {
  id: string;
  estado: string;
  [key: string]: unknown;
}

interface PedidoStore {
  carrito: CarritoItem[];
  pedidosActivos: PedidoSocket[];
  agregarItem: (item: CarritoItem) => void;
  quitarItem: (productoId: string) => void;
  limpiarCarrito: () => void;
  actualizarPedidoSocket: (pedido: PedidoSocket) => void;
  initPedidos: (pedidos: PedidoSocket[]) => void;
}

export const usePedidoStore = create<PedidoStore>((set) => ({
  carrito: [],
  pedidosActivos: [],

  agregarItem: (item) =>
    set((state) => {
      const existente = state.carrito.find((i) => i.productoId === item.productoId);
      if (existente) {
        return {
          carrito: state.carrito.map((i) =>
            i.productoId === item.productoId ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        };
      }
      return { carrito: [...state.carrito, item] };
    }),

  quitarItem: (productoId) =>
    set((state) => ({ carrito: state.carrito.filter((i) => i.productoId !== productoId) })),

  limpiarCarrito: () => set({ carrito: [] }),

  actualizarPedidoSocket: (pedido) =>
    set((state) => {
      const existe = state.pedidosActivos.some((p) => p.id === pedido.id);
      return {
        pedidosActivos: existe
          ? state.pedidosActivos.map((p) => (p.id === pedido.id ? pedido : p))
          : [pedido, ...state.pedidosActivos],
      };
    }),

  initPedidos: (pedidos) => set({ pedidosActivos: pedidos }),
}));
