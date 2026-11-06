'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

import Link from 'next/link'
import { ticketPlans as planes, quoteTickets, formatTicketPrice } from '@/lib/ticket-pricing'

export default function PreciosPage() {
  const [quantity, setQuantity] = useState('')
  const cents = quoteTickets(Number(quantity))
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

  const handleComprar = async (planId: string, quantity?: number) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/tickets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, quantity })
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo abrir el pago.')
      window.location.assign(data.url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo abrir el pago.')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="mb-4 inline-block text-sm font-medium text-blue-700">← Regresar al inicio</Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">🎟️ Planes y Precios</h1>
          <p className="text-gray-500 text-lg">Compra boletos y úsalos cuando los necesites</p>
        </div>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <label htmlFor="quantity" className="block font-semibold text-gray-800">¿Cuántos boletos necesitas?</label>
          <input id="quantity" type="number" min="100" max="10000" step="1" value={quantity}
            onChange={event => setQuantity(event.target.value)} placeholder="Ej. 170"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-gray-800 sm:w-48" />
          <p className="my-2 text-sm text-gray-600" aria-live="polite">
            {cents === null ? 'Elige de 100 a 10,000 boletos.' : `Total: ${formatTicketPrice(cents)}`}
          </p>
          {userId ? (
            <button disabled={cents === null || loading !== null} onClick={() => handleComprar('personalizado', Number(quantity))}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Comprar boletos</button>
          ) : (
            <Link href={cents === null ? '/disenar' : `/disenar?cantidad=${Number(quantity)}`} className="font-semibold text-blue-700">
              Diseñar mis boletos sin registro →
            </Link>
          )}
        </section>
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

              {userId ? (
              <button
                onClick={() => handleComprar(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-white hover:bg-gray-900'} disabled:opacity-50`}
              >
                {loading === plan.id ? 'Redirigiendo...' : userId ? 'Comprar ahora' : 'Comprar sin registro'}
              </button>
              ) : (
                <Link href={`/disenar?cantidad=${plan.boletos}`} className="rounded-xl bg-blue-600 py-3 text-center font-semibold text-white">
                  Comprar sin registro
                </Link>
              )}
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