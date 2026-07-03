'use client';
import { useState } from 'react';
import { MenuGrid } from '@/components/MenuGrid';
import { usePedidos } from '@/hooks/usePedidos';
import { usePedidoStore } from '@/stores/pedido.store';

export default function POSPage() {
  const { carrito, agregarItem, quitarItem, limpiarCarrito } = usePedidoStore();
  const { crearPedido, loading } = usePedidos();
  const [mesa, setMesa] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);
  const [linkPago, setLinkPago] = useState<string | null>(null);

  const total = carrito.reduce((acc, i) => acc + i.precioUnit * i.cantidad, 0);

  async function handleConfirmar() {
    setFeedback(null);
    setLinkPago(null);
    try {
      const pedido = await crearPedido(carrito, mesa || undefined);
      limpiarCarrito();
      setMesa('');
      setFeedback({ tipo: 'ok', msg: '¡Pedido enviado a cocina!' });
      if (pedido?.mpInitPoint) setLinkPago(pedido.mpInitPoint);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      setFeedback({ tipo: 'error', msg: err instanceof Error ? err.message : 'Error al confirmar' });
    }
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1">
        <h1 className="text-xl font-bold mb-4">Punto de venta</h1>
        <MenuGrid onAgregar={agregarItem} />
      </div>

      <div className="w-72 bg-white rounded-xl shadow p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Pedido actual</h2>

        <input
          type="text"
          placeholder="Mesa (opcional)"
          value={mesa}
          onChange={(e) => setMesa(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />

        <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
          {carrito.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-8">El carrito está vacío</p>
          )}
          {carrito.map((item) => (
            <div key={item.productoId} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => quitarItem(item.productoId)}
                  className="text-gray-400 hover:text-red-500 text-xs font-bold leading-none"
                >
                  ✕
                </button>
                <span>{item.nombre} x{item.cantidad}</span>
              </div>
              <span className="font-medium">${(item.precioUnit * item.cantidad).toLocaleString('es-AR')}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total.toLocaleString('es-AR')}</span>
          </div>

          {feedback && (
            <p className={`text-sm text-center font-medium rounded-lg py-2 ${
              feedback.tipo === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {feedback.msg}
            </p>
          )}

          {linkPago && (
            <a
              href={linkPago}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-sky-500 text-white py-2.5 rounded-lg font-semibold hover:bg-sky-600 transition"
            >
              💳 Cobrar con Mercado Pago
            </a>
          )}

          <button
            onClick={handleConfirmar}
            disabled={carrito.length === 0 || loading}
            className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 hover:bg-amber-700 transition"
          >
            {loading ? 'Enviando...' : 'Confirmar pedido'}
          </button>
          <button
            onClick={limpiarCarrito}
            disabled={carrito.length === 0}
            className="w-full text-gray-400 text-sm hover:text-gray-600 disabled:opacity-30 transition"
          >
            Limpiar carrito
          </button>
        </div>
      </div>
    </div>
  );
}
