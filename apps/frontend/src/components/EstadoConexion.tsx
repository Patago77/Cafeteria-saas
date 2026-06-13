'use client';
import { useConexion } from '@/hooks/useConexion';

export function EstadoConexion() {
  const { online } = useConexion();
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-xs text-amber-200">{online ? 'En línea' : 'Sin conexión'}</span>
    </div>
  );
}
