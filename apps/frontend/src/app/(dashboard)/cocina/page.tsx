'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { usePedidoStore } from '@/stores/pedido.store';
import { activarSonido, pedirPermisoNotificaciones } from '@/lib/notificaciones';

type Estado = 'pendiente' | 'en_preparacion' | 'listo';

interface ItemPedido {
  id: string;
  cantidad: number;
  notas?: string | null;
  producto: { nombre: string };
}

interface Pedido {
  id: string;
  mesa?: string | null;
  estado: string;
  notas?: string | null;
  total: number;
  creadoEn: string;
  items: ItemPedido[];
  usuario?: { nombre: string } | null;
  [key: string]: unknown;
}

const COLUMNAS: { estado: Estado; label: string; color: string }[] = [
  { estado: 'pendiente',       label: 'Pendiente',       color: 'border-yellow-400 bg-yellow-50' },
  { estado: 'en_preparacion',  label: 'En preparación',  color: 'border-blue-400 bg-blue-50' },
  { estado: 'listo',           label: 'Listo',           color: 'border-green-400 bg-green-50' },
];

const SIGUIENTE: Record<Estado, string> = {
  pendiente:      'en_preparacion',
  en_preparacion: 'listo',
  listo:          'entregado',
};

const BOTON_LABEL: Record<Estado, string> = {
  pendiente:      'Empezar',
  en_preparacion: 'Marcar listo',
  listo:          'Entregar',
};

const BOTON_COLOR: Record<Estado, string> = {
  pendiente:      'bg-blue-500 hover:bg-blue-600',
  en_preparacion: 'bg-green-500 hover:bg-green-600',
  listo:          'bg-gray-500 hover:bg-gray-600',
};

function tiempoTranscurrido(fecha: string) {
  const mins = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function CocinaPage() {
  useSocket();
  const pedidosActivos = usePedidoStore((s) => s.pedidosActivos) as Pedido[];
  const initPedidos = usePedidoStore((s) => s.initPedidos);
  const actualizarPedidoSocket = usePedidoStore((s) => s.actualizarPedidoSocket);
  const [avanzando, setAvanzando] = useState<string | null>(null);
  const [notificacionesActivas, setNotificacionesActivas] = useState(false);
  const [, setTick] = useState(0);

  async function activarNotificaciones() {
    activarSonido();
    await pedirPermisoNotificaciones();
    setNotificacionesActivas(true);
  }

  useEffect(() => {
    initPedidos([]);
    api.get('/pedidos?activos=1')
      .then((p) => initPedidos(p))
      .catch(console.error);

    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [initPedidos, actualizarPedidoSocket]);

  async function avanzarEstado(pedido: Pedido) {
    const nuevoEstado = SIGUIENTE[pedido.estado as Estado];
    if (!nuevoEstado) return;
    setAvanzando(pedido.id);
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, { estado: nuevoEstado });
    } catch (e) {
      console.error(e);
    } finally {
      setAvanzando(null);
    }
  }

  const activos = pedidosActivos.filter(
    (p) => p.estado !== 'entregado' && p.estado !== 'cancelado'
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pantalla de Cocina</h1>
        <div className="flex items-center gap-3">
          {!notificacionesActivas && (
            <button
              onClick={activarNotificaciones}
              className="text-sm font-medium text-amber-700 border border-amber-300 rounded-lg px-3 py-1 hover:bg-amber-50"
            >
              🔔 Activar notificaciones
            </button>
          )}
          <span className="text-sm text-gray-500">
            {activos.length} pedido{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {COLUMNAS.map(({ estado, label, color }) => {
          const pedidosCol = activos.filter((p) => p.estado === estado);
          const [borderColor, bgColor] = color.split(' ');
          return (
            <div key={estado} className="flex flex-col gap-3 min-h-0">
              <div className={`rounded-xl border-2 ${borderColor} ${bgColor} px-4 py-2 flex items-center justify-between`}>
                <span className="font-semibold text-gray-700">{label}</span>
                <span className="text-lg font-bold text-gray-800">{pedidosCol.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {pedidosCol.length === 0 && (
                  <p className="text-center text-gray-400 text-sm mt-8">Sin pedidos</p>
                )}
                {pedidosCol.map((pedido) => (
                  <div
                    key={pedido.id}
                    className={`bg-white rounded-xl border-2 ${borderColor} p-4 shadow-sm space-y-3`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">
                          {pedido.mesa ? `Mesa ${pedido.mesa}` : 'Sin mesa'}
                        </p>
                        {pedido.usuario && (
                          <p className="text-xs text-gray-500">{pedido.usuario.nombre}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">
                        {tiempoTranscurrido(pedido.creadoEn)}
                      </span>
                    </div>

                    <ul className="space-y-1">
                      {(pedido.items ?? []).map((item, i) => (
                        <li key={i} className="flex items-baseline gap-2">
                          <span className="font-bold text-gray-800 text-sm w-5 text-right">
                            {item.cantidad}x
                          </span>
                          <span className="text-gray-700 text-sm">{item.producto.nombre}</span>
                          {item.notas && (
                            <span className="text-xs text-amber-600 italic">({item.notas})</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {pedido.notas && (
                      <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-800">
                        Nota: {pedido.notas}
                      </p>
                    )}

                    <button
                      onClick={() => avanzarEstado(pedido)}
                      disabled={avanzando === pedido.id}
                      className={`w-full text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50 ${BOTON_COLOR[pedido.estado as Estado]}`}
                    >
                      {avanzando === pedido.id ? '...' : BOTON_LABEL[pedido.estado as Estado]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
