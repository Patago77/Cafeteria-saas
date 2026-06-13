'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ConectarMPPage() {
  const router = useRouter();
  const [mpUrl, setMpUrl] = useState('');

  useEffect(() => {
    api.get('/onboarding/mp-url').then((data: { url: string }) => setMpUrl(data.url)).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-8">
      <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6 text-center">
        <div className="text-5xl">💳</div>
        <h1 className="text-2xl font-bold text-amber-900">Conectá Mercado Pago</h1>
        <p className="text-gray-600">
          Conectá tu cuenta de Mercado Pago para recibir pagos con QR, tarjeta y efectivo digital.
        </p>
        <div className="space-y-3">
          <a
            href={mpUrl}
            className="block w-full bg-sky-500 text-white py-3 rounded-lg font-semibold hover:bg-sky-600 transition"
          >
            Conectar con Mercado Pago
          </a>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            Hacerlo más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
