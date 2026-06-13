'use client';
import { usePedidos } from '@/hooks/usePedidos';

const ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'] as const;

export default function PedidosPage() {
  const { pedidos, loading } = usePedidos();

  if (loading) return <p className="text-gray-500">Cargando pedidos...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pedidos</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['ID', 'Mesa', 'Total', 'Estado', 'Pago', 'Hora'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.id.slice(-6)}</td>
                <td className="px-4 py-3">{p.mesa ?? '—'}</td>
                <td className="px-4 py-3 font-semibold">${Number(p.total).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={p.estado} />
                </td>
                <td className="px-4 py-3 capitalize">{p.estadoPago}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(p.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    en_preparacion: 'bg-blue-100 text-blue-700',
    listo: 'bg-green-100 text-green-700',
    entregado: 'bg-gray-100 text-gray-700',
    cancelado: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[estado] ?? ''}`}>
      {estado.replace('_', ' ')}
    </span>
  );
}
