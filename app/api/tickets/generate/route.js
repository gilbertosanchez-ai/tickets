import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { eventName, eventDate, eventVenue, quantity, userId } = await request.json()

    // 1. Verificar que el usuario tenga créditos suficientes
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

    // 4. Descontar créditos
    await supabase
      .from('credits')
      .update({ boletos: credits.boletos - quantity })
      .eq('user_id', userId)

    return NextResponse.json({
      success: true,
      event,
      tickets,
      total: tickets.length,
      creditosRestantes: credits.boletos - quantity
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}