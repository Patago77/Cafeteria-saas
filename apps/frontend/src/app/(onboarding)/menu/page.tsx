'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const PRODUCTOS_SUGERIDOS = [
  { nombre: 'Café espresso', precio: 800, categoria: 'bebidas' },
  { nombre: 'Café con leche', precio: 1000, categoria: 'bebidas' },
  { nombre: 'Medialuna', precio: 500, categoria: 'panadería' },
  { nombre: 'Tostado', precio: 1500, categoria: 'sandwiches' },
];

export default function MenuOnboardingPage() {
  const router = useRouter();
  const [seleccionados, setSeleccionados] = useState<typeof PRODUCTOS_SUGERIDOS>([]);
  const [loading, setLoading] = useState(false);

  function toggleProducto(p: (typeof PRODUCTOS_SUGERIDOS)[0]) {
    setSeleccionados((prev) =>
      prev.some((s) => s.nombre === p.nombre) ? prev.filter((s) => s.nombre !== p.nombre) : [...prev, p]
    );
  }

  async function handleContinuar() {
    setLoading(true);
    try {
      await Promise.all(seleccionados.map((p) => api.post('/productos', p)));
      router.push('/conectar-mp');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-900">Armá tu menú inicial</h1>
        <p className="text-gray-600">Seleccioná productos para comenzar. Podés modificarlos después.</p>
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTOS_SUGERIDOS.map((p) => {
            const activo = seleccionados.some((s) => s.nombre === p.nombre);
            return (
              <button
                key={p.nombre}
                onClick={() => toggleProducto(p)}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  activo ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-semibold">{p.nombre}</p>
                <p className="text-sm text-gray-500">${p.precio.toLocaleString('es-AR')}</p>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/conectar-mp')} className="flex-1 border border-gray-300 rounded-lg py-2">
            Omitir
          </button>
          <button
            onClick={handleContinuar}
            disabled={loading || seleccionados.length === 0}
            className="flex-1 bg-amber-600 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : `Agregar ${seleccionados.length} productos`}
          </button>
        </div>
      </div>
    </div>
  );
}
