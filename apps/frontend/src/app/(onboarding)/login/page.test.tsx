import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { post, push } = vi.hoisted(() => ({ post: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { post } };
});

import LoginPage from './page';

beforeEach(() => {
  post.mockReset();
  push.mockReset();
  localStorage.clear();
});

describe('LoginPage', () => {
  it('envía slug/email/password, guarda el token y redirige a /dashboard', async () => {
    post.mockResolvedValue({ token: 'tok-abc', usuario: { id: 'u1', nombre: 'Walter', rol: 'admin' } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Slug de la cafetería'), { target: { value: 'cafeteamos' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'walter@x.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'correcta123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'walter@x.com',
      password: 'correcta123',
      tenantSlug: 'cafeteamos',
    });
    expect(localStorage.getItem('token')).toBe('tok-abc');
    expect(localStorage.getItem('tenantSlug')).toBe('cafeteamos');
  });

  it('muestra el mensaje de error si las credenciales son inválidas', async () => {
    post.mockRejectedValue(new Error('Credenciales inválidas'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Slug de la cafetería'), { target: { value: 'cafeteamos' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'walter@x.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
