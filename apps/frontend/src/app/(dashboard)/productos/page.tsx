'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoria: string;
  stock?: number | null;
  activo: boolean;
}

interface FormData {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  stock: string;
}

const EMPTY_FORM: FormData = { nombre: '', descripcion: '', precio: '', categoria: 'general', stock: '' };

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editando: Producto | null }>({ open: false, editando: null });
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/productos').then(setProductos).catch(console.error);
  }, []);

  function abrirNuevo() {
    setForm(EMPTY_FORM);
    setError('');
    setModal({ open: true, editando: null });
  }

  function abrirEditar(p: Producto) {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio: String(p.precio),
      categoria: p.categoria,
      stock: p.stock != null ? String(p.stock) : '',
    });
    setError('');
    setModal({ open: true, editando: p });
  }

  function cerrar() {
    setModal({ open: false, editando: null });
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      precio: parseFloat(form.precio),
      categoria: form.categoria || 'general',
      stock: form.stock ? parseInt(form.stock) : undefined,
    };
    try {
      if (modal.editando) {
        await api.put(`/productos/${modal.editando.id}`, payload);
        setProductos((prev) =>
          prev.map((p) => (p.id === modal.editando!.id ? { ...p, ...payload } : p))
        );
      } else {
        const nuevo = await api.post('/productos', payload);
        setProductos((prev) => [nuevo, ...prev]);
      }
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  const categorias = [...new Set(productos.map((p) => p.categoria))].sort();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={abrirNuevo}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
        >
          + Nuevo producto
        </button>
      </div>

      {productos.length === 0 && (
        <p className="text-gray-400 text-center py-16">No hay productos. Creá el primero.</p>
      )}

      {categorias.map((cat) => (
        <div key={cat} className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide capitalize">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {productos.filter((p) => p.categoria === cat).map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-gray-400 mt-0.5">{p.descripcion}</p>}
                  <p className="text-lg font-bold text-amber-700 mt-2">
                    ${Number(p.precio).toLocaleString('es-AR')}
                  </p>
                  {p.stock != null && (
                    <p className="text-xs text-gray-400 mt-1">Stock: {p.stock}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(p.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              {modal.editando ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <form onSubmit={handleGuardar} className="space-y-3">
              <Field label="Nombre *">
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={INPUT}
                  placeholder="Ej: Café con leche"
                />
              </Field>
              <Field label="Descripción">
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={INPUT}
                  placeholder="Opcional"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className={INPUT}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className={INPUT}
                    placeholder="Sin límite"
                  />
                </Field>
              </div>
              <Field label="Categoría">
                <input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className={INPUT}
                  placeholder="general"
                />
              </Field>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrar}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
