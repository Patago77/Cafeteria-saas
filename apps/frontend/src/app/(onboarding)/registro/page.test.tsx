import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { post, push } = vi.hoisted(() => ({ post: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { post } };
});

import RegistroPage from './page';

function completarFormulario() {
  fireEvent.change(screen.getByLabelText('Nombre de la cafetería'), { target: { value: 'Cafeteamos' } });
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Walter' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'walter@x.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
}

beforeEach(() => {
  post.mockReset();
  push.mockReset();
  localStorage.clear();
});

describe('RegistroPage', () => {
  it('envía los datos del form, guarda el token y redirige a /menu', async () => {
    post.mockResolvedValue({ token: 'tok-123', tenant: { id: 't1', nombre: 'Cafeteamos', slug: 'cafeteamos' } });
    render(<RegistroPage />);

    completarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/menu'));
    expect(post).toHaveBeenCalledWith('/auth/registro', {
      nombreCafeteria: 'Cafeteamos',
      email: 'walter@x.com',
      password: 'password123',
      nombreAdmin: 'Walter',
    });
    expect(localStorage.getItem('token')).toBe('tok-123');
    expect(localStorage.getItem('tenantSlug')).toBe('cafeteamos');
  });

  it('muestra el mensaje de error del backend si el registro falla (ej. slug duplicado)', async () => {
    post.mockRejectedValue(new Error('Ya existe una cafetería con ese nombre'));
    render(<RegistroPage />);

    completarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(screen.getByText('Ya existe una cafetería con ese nombre')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
