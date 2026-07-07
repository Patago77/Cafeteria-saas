import Link from 'next/link';
import { EstadoConexion } from '@/components/EstadoConexion';

const NAV = [
  { href: '/dashboard', label: 'Métricas' },
  { href: '/pos', label: 'POS' },
  { href: '/cocina', label: 'Cocina' },
  { href: '/pedidos', label: 'Pedidos' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/productos', label: 'Productos' },
  { href: '/empleados', label: 'Empleados' },
  { href: '/caja', label: 'Caja' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-amber-900 text-white flex flex-col">
        <div className="p-4 border-b border-amber-800">
          <p className="font-bold text-lg">Cafetería SaaS</p>
          <EstadoConexion />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg hover:bg-amber-800 transition text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
