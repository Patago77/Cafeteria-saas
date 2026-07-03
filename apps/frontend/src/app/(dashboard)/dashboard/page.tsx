'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatPrecio } from '@cafeteria-saas/utils';

interface Metricas {
  pedidosHoy: number;
  ventasTotales: number;
  ticketPromedio: number;
}

export default function DashboardPage() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);

  useEffect(() => {
    api.get('/pedidos/metricas').then(setMetricas).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Métricas del día</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard titulo="Pedidos hoy" valor={metricas ? String(metricas.pedidosHoy) : '—'} />
        <MetricCard titulo="Ventas totales" valor={metricas ? formatPrecio(metricas.ventasTotales) : '—'} />
        <MetricCard titulo="Ticket promedio" valor={metricas ? formatPrecio(metricas.ticketPromedio) : '—'} />
      </div>
    </div>
  );
}

function MetricCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-3xl font-bold text-amber-700 mt-1">{valor}</p>
    </div>
  );
}
