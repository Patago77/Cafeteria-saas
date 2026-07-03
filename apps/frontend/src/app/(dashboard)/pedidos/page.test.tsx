import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get, patch } }));

import PedidosPage from './page';

const pedidoPendiente = {
  id: 'pedido-abc123',
  mesa: '5',
  estado: 'entregado',
  estadoPago: 'pendiente',
  total: 500,
  creadoEn: new Date().toISOString(),
  items: [],
};

beforeEach(() => {
  get.mockReset();
  patch.mockReset();
});

describe('PedidosPage', () => {
  it('muestra el botón "Marcar pagado" para un pedido no pagado, y al clickearlo llama al PATCH y lo saca de la lista de pendientes', async () => {
    get.mockResolvedValue([pedidoPendiente]);
    patch.mockResolvedValue({});
    render(<PedidosPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar pagado' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagado' }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/pedidos/pedido-abc123/pago', { estadoPago: 'pagado' })
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Marcar pagado' })).not.toBeInTheDocument());
    expect(screen.getByText('pagado')).toBeInTheDocument();
  });

  it('no muestra el botón para un pedido ya pagado', async () => {
    get.mockResolvedValue([{ ...pedidoPendiente, estadoPago: 'pagado' }]);
    render(<PedidosPage />);

    await waitFor(() => expect(screen.getByText('pagado')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Marcar pagado' })).not.toBeInTheDocument();
  });
});
