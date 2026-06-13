'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Movimiento {
  id: string;
  tipo: 'apertura' | 'cierre' | 'retiro' | 'ingreso';
  monto: number;
  notas?: string | null;
  fecha: string;
}

interface Caja {
  id: string;
  nombre: string;
  activo: boolean;
  movimientos: Movimiento[];
}

const TIPO_LABEL: Record<string, string> = {
  apertura: 'Apertura',
  cierre: 'Cierre',
  retiro: 'Retiro',
  ingreso: 'Ingreso',
};

const TIPO_COLOR: Record<string, string> = {
  apertura: 'text-blue-600 bg-blue-50',
  cierre: 'text-gray-600 bg-gray-100',
  retiro: 'text-red-600 bg-red-50',
  ingreso: 'text-green-600 bg-green-50',
};

export default function CajaPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<string | null>(null);
  const [modalNuevaCaja, setModalNuevaCaja] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState<string | null>(null);
  const [nombreCaja, setNombreCaja] = useState('');
  const [movForm, setMovForm] = useState({ tipo: 'apertura', monto: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/caja').then(setCajas).catch(console.error);
  }, []);

  async function crearCaja(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const nueva = await api.post('/caja', { nombre: nombreCaja });
      setCajas((prev) => [...prev, { ...nueva, movimientos: [] }]);
      setModalNuevaCaja(false);
      setNombreCaja('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setGuardando(false);
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMovimiento) return;
    setGuardando(true);
    setError('');
    try {
      const mov = await api.post(`/caja/${modalMovimiento}/movimientos`, {
        tipo: movForm.tipo,
        monto: parseFloat(movForm.monto),
        notas: movForm.notas || undefined,
      });
      setCajas((prev) =>
        prev.map((c) =>
          c.id === modalMovimiento
            ? { ...c, movimientos: [mov, ...c.movimientos] }
            : c
        )
      );
      setModalMovimiento(null);
      setMovForm({ tipo: 'apertura', monto: '', notas: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Cajas</h1>
        <button
          onClick={() => { setError(''); setModalNuevaCaja(true); }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
        >
          + Nueva caja
        </button>
      </div>

      {cajas.length === 0 && (
        <p className="text-gray-400 text-center py-16">No hay cajas. Creá la primera.</p>
      )}

      <div className="space-y-3">
        {cajas.map((caja) => (
          <div key={caja.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800 text-lg">{caja.nombre}</p>
                <p className="text-sm text-gray-400">{caja.movimientos.length} movimientos recientes</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setError(''); setMovForm({ tipo: 'apertura', monto: '', notas: '' }); setModalMovimiento(caja.id); }}
                  className="text-sm bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition"
                >
                  + Movimiento
                </button>
                <button
                  onClick={() => setCajaAbierta(cajaAbierta === caja.id ? null : caja.id)}
                  className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                >
                  {cajaAbierta === caja.id ? 'Ocultar' : 'Ver movimientos'}
                </button>
              </div>
            </div>

            {cajaAbierta === caja.id && (
              <div className="border-t border-gray-100 px-4 pb-4">
                {caja.movimientos.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-6">Sin movimientos registrados</p>
                )}
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase">
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Monto</th>
                      <th className="pb-2">Notas</th>
                      <th className="pb-2 text-right">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {caja.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[m.tipo]}`}>
                            {TIPO_LABEL[m.tipo]}
                          </span>
                        </td>
                        <td className={`py-2 font-semibold ${m.tipo === 'retiro' ? 'text-red-600' : 'text-green-600'}`}>
                          {m.tipo === 'retiro' ? '-' : '+'}${Number(m.monto).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2 text-gray-500">{m.notas ?? '—'}</td>
                        <td className="py-2 text-gray-400 text-right">
                          {new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal nueva caja */}
      {modalNuevaCaja && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Nueva caja</h2>
            <form onSubmit={crearCaja} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  required
                  value={nombreCaja}
                  onChange={(e) => setNombreCaja(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: Caja principal"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalNuevaCaja(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">
                  {guardando ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nuevo movimiento */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Registrar movimiento</h2>
            <form onSubmit={registrarMovimiento} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                <select
                  value={movForm.tipo}
                  onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="apertura">Apertura</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="retiro">Retiro</option>
                  <option value="cierre">Cierre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={movForm.monto}
                  onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input
                  value={movForm.notas}
                  onChange={(e) => setMovForm({ ...movForm, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Opcional"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalMovimiento(null)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">
                  {guardando ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
