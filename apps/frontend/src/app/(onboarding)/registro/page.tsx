'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveToken } from '@/lib/api';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.post('/auth/registro', {
        nombreCafeteria: form.get('nombreCafeteria'),
        email: form.get('email'),
        password: form.get('password'),
        nombreAdmin: form.get('nombreAdmin'),
      });
      saveToken(data.token);
      localStorage.setItem('tenantSlug', data.tenant.slug);
      router.push('/menu');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-amber-900">Registrar cafetería</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="nombreCafeteria" label="Nombre de la cafetería" required />
          <Input name="nombreAdmin" label="Tu nombre" required />
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Contraseña" required minLength={8} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ name, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
        {...props}
      />
    </div>
  );
}
