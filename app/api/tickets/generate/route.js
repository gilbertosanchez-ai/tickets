import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_ID = '73cdbd9a-db59-40e0-90e3-d8fa1d56748e'

export async function POST(request) {
  try {
    const { eventName, eventDate, eventVenue, quantity, userId } = await request.json()

    const esAdmin = userId === ADMIN_ID

    // 1. Verificar créditos solo si no es admin
    let creditosActuales = 0

    if (!esAdmin) {
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (creditsError || !credits) {
        return NextResponse.json({ success: false, error: 'No tienes boletos disponibles. Compra un plan primero.' })
      }

      if (credits.boletos < quantity) {
        return NextResponse.json({ success: false, error: `No tienes suficientes boletos. Tienes ${credits.boletos} y necesitas ${quantity}.` })
      }

      creditosActuales = credits.boletos
    }

    // 2. Crear el evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({ name: eventName, date: eventDate, venue: eventVenue, user_id: userId })
      .select()
      .single()

    if (eventError) throw eventError

    // 3. Crear los boletos
    const ticketsToInsert = Array.from({ length: quantity }, (_, i) => ({
      event_id: event.id,
      ticket_number: i + 1,
      status: 'active'
    }))

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select()

    if (ticketsError) throw ticketsError

    // 4. Descontar créditos solo si no es admin
    if (!esAdmin) {
      await supabase
        .from('credits')
        .update({ boletos: creditosActuales - quantity })
        .eq('user_id', userId)
    }

    return NextResponse.json({
      success: true,
      event,
      tickets,
      total: tickets.length,
      creditosRestantes: esAdmin ? 999999 : creditosActuales - quantity
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}