import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Body recibido:', body)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { eventName, eventDate, eventVenue, quantity } = body

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({ name: eventName, date: eventDate, venue: eventVenue })
      .select()
      .single()

    console.log('Event resultado:', event)
    console.log('Event error:', eventError)

    if (eventError) throw eventError

    const ticketsToInsert = Array.from({ length: quantity }, (_, i) => ({
      event_id: event.id,
      ticket_number: i + 1,
      status: 'active'
    }))

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select()

    console.log('Tickets error:', ticketsError)

    if (ticketsError) throw ticketsError

    return NextResponse.json({ success: true, event, tickets, total: tickets.length })

  } catch (error) {
    console.error('ERROR COMPLETO:', error)
    return NextResponse.json({ success: false, error: error.message, details: JSON.stringify(error) }, { status: 500 })
  }
}