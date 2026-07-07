import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { eventId, imageBase64, qrX, qrY, qrSize } = await request.json()

    // 1. Obtener todos los boletos del evento
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('ticket_number')

    if (error || !tickets) throw new Error('No se encontraron boletos')

    // 2. Convertir imagen base64 a buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 3. Crear ZIP
    const zip = new JSZip()

    // 4. Generar un boleto por cada ticket
    for (const ticket of tickets) {
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.id}`

      // Generar QR como buffer PNG
      const qrBuffer = await QRCode.toBuffer(ticketUrl, {
        width: qrSize,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })

      // Superponer QR sobre el diseño
      const finalImage = await sharp(imageBuffer)
        .composite([{
          input: qrBuffer,
          left: Math.round(qrX),
          top: Math.round(qrY)
        }])
        .png()
        .toBuffer()

      zip.file(`boleto-${ticket.ticket_number}.png`, finalImage)
    }

    // 5. Generar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipBase64 = zipBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      zipBase64,
      total: tickets.length
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}