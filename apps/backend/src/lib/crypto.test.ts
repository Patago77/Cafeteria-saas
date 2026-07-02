import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from './crypto';

describe('encryptToken / decryptToken', () => {
  it('recupera el texto original tras encriptar', () => {
    const original = 'APP_USR-1234567890-mercadopago-access-token';
    const encrypted = encryptToken(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it('nunca guarda el token en texto plano', () => {
    const original = 'APP_USR-secreto';
    const encrypted = encryptToken(original);
    expect(encrypted).not.toContain(original);
  });

  it('genera un ciphertext distinto en cada llamada (IV aleatorio)', () => {
    const original = 'mismo-token';
    expect(encryptToken(original)).not.toBe(encryptToken(original));
  });

  it('rechaza un ciphertext corrompido (auth tag no matchea)', () => {
    const encrypted = encryptToken('token-valido');
    const [iv, tag, data] = encrypted.split(':');
    const corrupto = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => decryptToken(corrupto)).toThrow();
  });
});
