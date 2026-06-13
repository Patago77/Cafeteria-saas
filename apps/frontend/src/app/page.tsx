import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold text-amber-900">Cafetería SaaS</h1>
        <p className="text-xl text-amber-700">
          Gestioná tu cafetería con POS offline, cocina en tiempo real y cobros con Mercado Pago.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/registro"
            className="bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="border border-amber-600 text-amber-600 px-6 py-3 rounded-lg font-semibold hover:bg-amber-50 transition"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
