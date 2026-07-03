'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.post('/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
        tenantSlug: form.get('tenantSlug'),
      });
      saveToken(data.token);
      localStorage.setItem('tenantSlug', form.get('tenantSlug') as string);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresá con tu cuenta de cafetería</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="tenantSlug" label="Slug de la cafetería" placeholder="ej: cafeteamos" required />
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Contraseña" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="text-amber-600 hover:underline font-medium">
            Registrá tu cafetería
          </Link>
        </p>
      </div>
    </div>
  );
}

function Input({ name, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={name}
        name={name}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
        {...props}
      />
    </div>
  );
}
