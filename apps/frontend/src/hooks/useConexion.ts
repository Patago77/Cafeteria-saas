'use client';
import { useState, useEffect } from 'react';

export function useConexion() {
  // Arranca siempre en `true` (a propósito): en SSR no existe `navigator`, y el
  // primer render del cliente durante la hidratación tiene que devolver
  // exactamente el mismo HTML que el servidor o React tira un hydration
  // mismatch. El valor real de navigator.onLine se corrige acá abajo, en el
  // useEffect — ese sí corre solo en el cliente, después de hidratar.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { online };
}
