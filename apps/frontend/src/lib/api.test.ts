import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, saveToken, clearToken } from './api';

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'token=; path=/; max-age=0';
  vi.unstubAllGlobals();
});

describe('saveToken / clearToken', () => {
  it('guarda el token en localStorage y en una cookie', () => {
    saveToken('abc123');
    expect(localStorage.getItem('token')).toBe('abc123');
    expect(document.cookie).toContain('token=abc123');
  });

  it('clearToken borra ambos', () => {
    saveToken('abc123');
    clearToken();
    expect(localStorage.getItem('token')).toBeNull();
    expect(document.cookie).not.toContain('token=abc123');
  });
});

describe('api.* — request wrapper', () => {
  it('agrega el header Authorization cuando hay token guardado', async () => {
    saveToken('mi-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/productos');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer mi-token');
  });

  it('no manda header Authorization si no hay token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/productos');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('devuelve null en respuestas 204 sin intentar parsear JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no debería llamarse'); } });
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.delete('/pedidos/1');
    expect(result).toBeNull();
  });

  it('lanza un Error con el mensaje del backend cuando la respuesta no es ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Datos inválidos' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/productos', {})).rejects.toThrow('Datos inválidos');
  });

  it('usa un mensaje genérico si el body de error no es JSON parseable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('bad json'); } });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/productos')).rejects.toThrow('Error desconocido');
  });
});
