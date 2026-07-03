import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));

import DashboardPage from './page';

beforeEach(() => {
  get.mockReset();
});

describe('DashboardPage', () => {
  it('muestra "—" en las 3 métricas mientras carga', () => {
    get.mockReturnValue(new Promise(() => {})); // nunca resuelve
    render(<DashboardPage />);

    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('muestra las métricas reales una vez que la API responde', async () => {
    get.mockResolvedValue({ pedidosHoy: 12, ventasTotales: 4500, ticketPromedio: 375 });
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    expect(get).toHaveBeenCalledWith('/pedidos/metricas');
    // formatPrecio da algo como "$ 4.500,00" — no fijamos el formato exacto de Intl, solo que aparezcan los dígitos
    expect(screen.getByText(/4\.500/)).toBeInTheDocument();
    expect(screen.getByText(/375/)).toBeInTheDocument();
  });
});
