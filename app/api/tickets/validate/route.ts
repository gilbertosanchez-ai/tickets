import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json()

    // Buscar el boleto
    const { data: ticket, error: findError } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticketId)
      .single()

    if (findError || !ticket) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: 'Boleto no encontrado'
      })
    }

    // Verificar si ya fue usado
    if (ticket.status === 'used') {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Este boleto ya fue utilizado',
        ticket,
        usedAt: ticket.used_at
      })
    }

    // Marcar como usado
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', ticketId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      valid: true,
      message: '¡Boleto válido! Entrada permitida',
      ticket
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}