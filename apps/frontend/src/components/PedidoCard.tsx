interface Item { nombre: string; cantidad: number }
interface Pedido { id: string; mesa?: string | null; items: Item[]; estado: string; creadoEn: string }

interface Props {
  pedido: Pedido;
  onAccion: () => void;
  labelAccion: string;
}

export function PedidoCard({ pedido, onAccion, labelAccion }: Props) {
  const hace = Math.round((Date.now() - new Date(pedido.creadoEn).getTime()) / 60000);

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{pedido.mesa ? `Mesa ${pedido.mesa}` : 'Sin mesa'}</p>
          <p className="text-xs text-gray-400">Hace {hace} min</p>
        </div>
        <span className="text-xs text-gray-500 font-mono">#{pedido.id.slice(-4)}</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-0.5">
        {pedido.items.map((item, i) => (
          <li key={i}>x{item.cantidad} {item.nombre}</li>
        ))}
      </ul>
      <button
        onClick={onAccion}
        className="w-full bg-amber-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700"
      >
        {labelAccion}
      </button>
    </div>
  );
}
