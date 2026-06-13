export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Métricas del día</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard titulo="Pedidos hoy" valor="—" />
        <MetricCard titulo="Ventas totales" valor="—" />
        <MetricCard titulo="Ticket promedio" valor="—" />
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
