import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*, events(*)')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-red-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Boleto Inválido</h1>
          <p className="text-gray-500">Este boleto no existe o fue eliminado.</p>
        </div>
      </main>
    )
  }

  const isUsed = ticket.status === 'used'
  const event = ticket.events

  return (
    <main className={`min-h-screen ${isUsed ? 'bg-red-50' : 'bg-green-50'} flex items-center justify-center p-8`}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-4">{isUsed ? '❌' : '✅'}</div>

        <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-6 ${isUsed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isUsed ? 'YA UTILIZADO' : 'VÁLIDO'}
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{event.name}</h1>
        <p className="text-gray-500 mb-1">📍 {event.venue}</p>
        <p className="text-gray-500 mb-6">
          📅 {new Date(event.date).toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-400">Boleto número</p>
          <p className="text-4xl font-bold text-gray-800">#{ticket.ticket_number}</p>
        </div>

        {isUsed && ticket.used_at && (
          <p className="text-xs text-red-400 mt-4">
            Usado el {new Date(ticket.used_at).toLocaleString('es-MX')}
          </p>
        )}
      </div>
    </main>
  )
}