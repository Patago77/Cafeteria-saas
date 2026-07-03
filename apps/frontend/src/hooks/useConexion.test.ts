import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConexion } from './useConexion';

function setOnlineStatus(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnlineStatus(true);
});

describe('useConexion', () => {
  it('arranca reflejando navigator.onLine', () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => useConexion());
    expect(result.current.online).toBe(false);
  });

  it('pasa a false cuando el navegador dispara el evento "offline"', () => {
    setOnlineStatus(true);
    const { result } = renderHook(() => useConexion());
    expect(result.current.online).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);
  });

  it('vuelve a true cuando dispara "online"', () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => useConexion());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.online).toBe(true);
  });
});
