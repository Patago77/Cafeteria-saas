'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Empleado { id: string; nombre: string; email: string; rol: string; activo: boolean }

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    api.get('/empleados').then(setEmpleados).catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Empleados</h1>
        <button className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nuevo empleado
        </button>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-3 font-medium">{e.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{e.email}</td>
                <td className="px-4 py-3 capitalize">{e.rol}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${e.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
