import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get, patch } }));
vi.mock('@/hooks/useSocket', () => ({ useSocket: vi.fn() }));

const { activarSonido, pedirPermisoNotificaciones } = vi.hoisted(() => ({
  activarSonido: vi.fn(),
  pedirPermisoNotificaciones: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/notificaciones', () => ({ activarSonido, pedirPermisoNotificaciones }));

import CocinaPage from './page';
import { usePedidoStore } from '@/stores/pedido.store';

const pedidoPendiente = {
  id: 'ped-1',
  mesa: '5',
  estado: 'pendiente',
  total: 100,
  creadoEn: new Date().toISOString(),
  items: [{ id: 'i1', cantidad: 2, producto: { nombre: 'Café' } }],
};

beforeEach(() => {
  get.mockReset();
  patch.mockReset();
  activarSonido.mockClear();
  pedirPermisoNotificaciones.mockClear();
  usePedidoStore.setState({ carrito: [], pedidosActivos: [] });
});

describe('CocinaPage', () => {
  it('trae los pedidos activos y los agrupa en la columna de su estado', async () => {
    get.mockResolvedValue([pedidoPendiente]);
    render(<CocinaPage />);

    await waitFor(() => expect(screen.getByText('Mesa 5')).toBeInTheDocument());
    expect(get).toHaveBeenCalledWith('/pedidos?activos=1');
    expect(screen.getByText('Café')).toBeInTheDocument();
  });

  it('avanzar el estado llama al PATCH con el siguiente estado correcto', async () => {
    get.mockResolvedValue([pedidoPendiente]);
    patch.mockResolvedValue({});
    render(<CocinaPage />);

    await waitFor(() => expect(screen.getByText('Mesa 5')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/pedidos/ped-1/estado', { estado: 'en_preparacion' })
    );
  });

  it('el botón de notificaciones activa sonido + pide permiso, y después desaparece', async () => {
    get.mockResolvedValue([]);
    render(<CocinaPage />);

    const boton = screen.getByRole('button', { name: /Activar notificaciones/ });
    fireEvent.click(boton);

    await waitFor(() => expect(pedirPermisoNotificaciones).toHaveBeenCalledOnce());
    expect(activarSonido).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Activar notificaciones/ })).not.toBeInTheDocument()
    );
  });
});
