'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Producto } from '@cafeteria-saas/types';

interface CarritoItem {
  productoId: string;
  nombre: string;
  precioUnit: number;
  cantidad: number;
}

interface Props {
  onAgregar: (item: CarritoItem) => void;
}

export function MenuGrid({ onAgregar }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoria, setCategoria] = useState<string>('todos');

  useEffect(() => {
    api.get('/productos').then(setProductos).catch(console.error);
  }, []);

  const categorias = ['todos', ...new Set(productos.map((p) => p.categoria))];
  const filtrados = categoria === 'todos' ? productos : productos.filter((p) => p.categoria === categoria);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {categorias.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`px-3 py-1 rounded-full text-sm capitalize transition ${
              categoria === c ? 'bg-amber-600 text-white' : 'bg-white border text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map((p) => (
          <button
            key={p.id}
            onClick={() => onAgregar({ productoId: p.id, nombre: p.nombre, precioUnit: Number(p.precio), cantidad: 1 })}
            className="bg-white rounded-xl shadow p-4 text-left hover:shadow-md active:scale-95 transition"
          >
            <p className="font-semibold text-sm">{p.nombre}</p>
            <p className="text-amber-700 font-bold mt-1">${Number(p.precio).toLocaleString('es-AR')}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
