import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json()

    // 1. Obtener plantilla del evento
    const { data: template, error: templateError } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('event_id', eventId)
      .single()

    if (templateError || !template) {
      throw new Error('No se encontró el diseño del evento')
    }

    // 2. Descargar imagen de Storage
    const { data: imageData, error: imageError } = await supabase.storage
      .from('designs')
      .download(template.design_file_url)

    if (imageError || !imageData) throw new Error('No se pudo descargar el diseño')

    const imageBuffer = Buffer.from(await imageData.arrayBuffer())

    // 3. Obtener boletos
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('ticket_number')

    if (ticketsError || !tickets) throw new Error('No se encontraron boletos')

    // 4. Generar ZIP
    const zip = new JSZip()

    for (const ticket of tickets) {
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.id}`

      const qrBuffer = await QRCode.toBuffer(ticketUrl, {
        width: template.qr_size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })

      const finalImage = await sharp(imageBuffer)
        .composite([{
          input: qrBuffer,
          left: Math.round(template.qr_x),
          top: Math.round(template.qr_y)
        }])
        .png()
        .toBuffer()

      zip.file(`boleto-${ticket.ticket_number}.png`, finalImage)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipBase64 = zipBuffer.toString('base64')

    return NextResponse.json({ success: true, zipBase64, total: tickets.length })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}