'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Evento {
  id: string
  name: string
  date: string
  venue: string
  created_at: string
  ticket_count?: number
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [descargando, setDescargando] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const cargarEventos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('events')
        .select('*, tickets(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setEventos(data.map(e => ({
          ...e,
          ticket_count: e.tickets?.[0]?.count ?? 0
        })))
      }
      setLoading(false)
    }
    cargarEventos()
  }, [])

  const handleDescargar = async (eventoId: string, eventoNombre: string) => {
    setDescargando(eventoId)
    try {
      const res = await fetch('/api/tickets/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: eventoId })
      })
      const data = await res.json()
      if (data.success) {
        const link = document.createElement('a')
        link.href = `data:application/zip;base64,${data.zipBase64}`
        link.download = `boletos-${eventoNombre}.zip`
        link.click()
      } else {
        alert('Error: ' + data.error)
      }
    } catch {
      alert('Error al descargar')
    }
    setDescargando(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📋 Mis Eventos</h1>
            <p className="text-gray-500 text-sm">Todos tus eventos creados</p>
          </div>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
            + Nuevo evento
          </a>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">Cargando eventos...</div>
        )}

        {!loading && eventos.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-4">🎟️</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No tienes eventos aún</h2>
            <p className="text-gray-400 mb-6">Crea tu primer evento y genera tus boletos</p>
            <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
              Crear primer evento →
            </a>
          </div>
        )}

        <div className="space-y-4">
          {eventos.map(evento => (
            <div key={evento.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800 mb-1">{evento.name}</h2>
                  <p className="text-gray-500 text-sm">📍 {evento.venue}</p>
                  <p className="text-gray-500 text-sm">
                    📅 {new Date(evento.date).toLocaleDateString('es-MX', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    🎟️ {evento.ticket_count} boletos generados
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleDescargar(evento.id, evento.name)}
                    disabled={descargando === evento.id}
                    className="text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {descargando === evento.id ? '⏳' : '⬇️ Descargar'}
                  </button>
                  
                    <a href="/scan"
                    className="text-xs bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900 text-center"
                  >
                    📷 Escanear
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}