'use client'
import { useState } from 'react'

interface EventResult {
  id: string
  name: string
  date: string
  venue: string
}

interface GenerateResult {
  success: boolean
  event?: EventResult
  total?: number
  error?: string
}

export default function Home() {
  const [form, setForm] = useState({
    eventName: '',
    eventDate: '',
    eventVenue: '',
    quantity: 100
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    const res = await fetch('/api/tickets/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data: GenerateResult = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🎟️ Generar Boletos</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del evento</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              placeholder="Ej: Boda de Ana y Carlos"
              value={form.eventName}
              onChange={e => setForm({...form, eventName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              value={form.eventDate}
              onChange={e => setForm({...form, eventDate: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              placeholder="Ej: Salón Versalles, Guadalajara"
              value={form.eventVenue}
              onChange={e => setForm({...form, eventVenue: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de boletos</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              value={form.quantity}
              onChange={e => setForm({...form, quantity: parseInt(e.target.value)})}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar Boletos'}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success
              ? `✅ ¡Listo! Se crearon ${result.total} boletos para "${result.event?.name}"`
              : `❌ Error: ${result.error}`
            }
          </div>
        )}
      </div>
    </main>
  )
}