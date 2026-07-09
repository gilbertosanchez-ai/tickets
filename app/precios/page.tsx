'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const planes = [
  { id: 'starter', nombre: 'Starter', boletos: 100, precio: 78, popular: false },
  { id: 'popular', nombre: 'Popular', boletos: 500, precio: 345, popular: true },
  { id: 'pro', nombre: 'Pro', boletos: 2000, precio: 1240, popular: false },
  { id: 'graduacion', nombre: 'Graduación', boletos: 10000, precio: 5900, popular: false },
]

export default function PreciosPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  const handleComprar = async (planId: string) => {
    setLoading(planId)
    const res = await fetch('/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, userId })
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Error: ' + data.error)
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">🎟️ Planes y Precios</h1>
          <p className="text-gray-500 text-lg">Compra boletos y úsalos cuando los necesites</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planes.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MÁS POPULAR
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-800 mb-1">{plan.nombre}</h2>
              <p className="text-gray-500 text-sm mb-4">{plan.boletos.toLocaleString()} boletos</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-800">${plan.precio}</span>
                <span className="text-gray-500 text-sm ml-1">MXN</span>
                <p className="text-gray-400 text-xs mt-1">
                  ${(plan.precio / plan.boletos).toFixed(2)} por boleto
                </p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {plan.boletos.toLocaleString()} boletos con QR único
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Validación en tiempo real
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Descarga ZIP lista para imprimir
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Sin fecha de caducidad
                </li>
              </ul>

              <button
                onClick={() => handleComprar(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-white hover:bg-gray-900'} disabled:opacity-50`}
              >
                {loading === plan.id ? 'Redirigiendo...' : 'Comprar ahora'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Pago seguro con Stripe · Los boletos no caducan · Soporte por WhatsApp
        </p>
      </div>
    </main>
  )
}