import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get, post } }));

import POSPage from './page';
import { usePedidoStore } from '@/stores/pedido.store';

const producto = { id: 'p1', nombre: 'Café', precio: 100, categoria: 'bebidas' };

beforeEach(() => {
  get.mockImplementation(async (path: string) => (path.startsWith('/productos') ? [producto] : []));
  post.mockReset();
  usePedidoStore.setState({ carrito: [], pedidosActivos: [] });
});

async function agregarCafeYConfirmar() {
  await waitFor(() => expect(screen.getByText('Café')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Café'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
  await waitFor(() => expect(screen.getByText('¡Pedido enviado a cocina!')).toBeInTheDocument());
}

describe('POSPage', () => {
  it('si el pedido creado trae mpInitPoint, muestra el link para cobrar con Mercado Pago', async () => {
    post.mockResolvedValue({ id: 'ped-1', mpInitPoint: 'https://mp.com/pagar/xyz' });
    render(<POSPage />);

    await agregarCafeYConfirmar();

    expect(screen.getByRole('link', { name: /Cobrar con Mercado Pago/ })).toHaveAttribute(
      'href',
      'https://mp.com/pagar/xyz'
    );
  });

  it('si el tenant no tiene MP conectado (mpInitPoint null), no muestra el link', async () => {
    post.mockResolvedValue({ id: 'ped-1', mpInitPoint: null });
    render(<POSPage />);

    await agregarCafeYConfirmar();

    expect(screen.queryByRole('link', { name: /Cobrar con Mercado Pago/ })).not.toBeInTheDocument();
  });

  it('limpia el carrito después de confirmar', async () => {
    post.mockResolvedValue({ id: 'ped-1', mpInitPoint: null });
    render(<POSPage />);

    await agregarCafeYConfirmar();

    expect(usePedidoStore.getState().carrito).toEqual([]);
  });
});
