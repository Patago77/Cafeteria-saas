'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { usePedidos } from '@/hooks/usePedidos';

interface Repartidor {
  id: string;
  nombre: string;
}

const SIGUIENTE_ENTREGA: Record<string, string> = {
  pendiente: 'en_camino',
  en_camino: 'entregado',
};

const BOTON_LABEL: Record<string, string> = {
  pendiente: 'Marcar en camino',
  en_camino: 'Marcar entregado',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_camino: 'bg-blue-100 text-blue-700',
  entregado: 'bg-green-100 text-green-700',
};

export default function DeliveryPage() {
  const { pedidos, loading, actualizarEntrega } = usePedidos({ canal: 'delivery' });
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [actualizando, setActualizando] = useState<string | null>(null);

  useEffect(() => {
    api.get('/pedidos/repartidores').then(setRepartidores).catch(console.error);
  }, []);

  const activos = pedidos.filter((p) => p.estado !== 'cancelado' && p.estadoEntrega !== 'entregado');

  async function asignarRepartidor(pedidoId: string, repartidorId: string) {
    setActualizando(pedidoId);
    try {
      await actualizarEntrega(pedidoId, { repartidorId: repartidorId || null });
    } finally {
      setActualizando(null);
    }
  }

  async function avanzarEntrega(pedidoId: string, estadoActual: string) {
    const siguiente = SIGUIENTE_ENTREGA[estadoActual];
    if (!siguiente) return;
    setActualizando(pedidoId);
    try {
      await actualizarEntrega(pedidoId, { estadoEntrega: siguiente });
    } finally {
      setActualizando(null);
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Delivery</h1>

      {activos.length === 0 && (
        <p className="text-gray-400 text-center py-16">No hay pedidos de delivery pendientes.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{p.direccionEntrega ?? 'Sin dirección'}</p>
                {p.telefonoEntrega && <p className="text-sm text-gray-500">{p.telefonoEntrega}</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estadoEntrega ?? 'pendiente']}`}>
                {(p.estadoEntrega ?? 'pendiente').replace('_', ' ')}
              </span>
            </div>

            {p.notasEntrega && (
              <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-800">
                {p.notasEntrega}
              </p>
            )}

            <p className="text-sm text-gray-600">Total: ${Number(p.total).toLocaleString('es-AR')}</p>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Repartidor:</label>
              <select
                value={p.repartidorId ?? ''}
                onChange={(e) => asignarRepartidor(p.id, e.target.value)}
                disabled={actualizando === p.id}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                <option value="">Sin asignar</option>
                {repartidores.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {SIGUIENTE_ENTREGA[p.estadoEntrega ?? 'pendiente'] && (
              <button
                onClick={() => avanzarEntrega(p.id, p.estadoEntrega ?? 'pendiente')}
                disabled={actualizando === p.id}
                className="w-full bg-amber-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {actualizando === p.id ? '...' : BOTON_LABEL[p.estadoEntrega ?? 'pendiente']}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
