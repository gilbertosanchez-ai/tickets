import { serverAuth } from '@/lib/server-auth'
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
    const { eventId, imageBase64, qrX, qrY, qrSize } = await request.json()
    const auth = await serverAuth()
    const { data: { user } } = await auth.auth.getUser()
    if (!user || typeof eventId !== 'string') {
      return NextResponse.json({ success: false, error: 'Acceso requerido.' }, { status: 401 })
    }
    const { data: ownedEvent } = await supabase.from('events').select('id')
      .eq('id', eventId).eq('user_id', user.id).maybeSingle()
    if (!ownedEvent) {
      return NextResponse.json({ success: false, error: 'Evento no encontrado.' }, { status: 404 })
    }


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

    // 3. Guardar diseño en Storage
    const fileName = `${eventId}/design.png`
    await supabase.storage
      .from('designs')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    // 4. Guardar posición del QR en ticket_templates
    await supabase
      .from('ticket_templates')
      .upsert({
        event_id: eventId,
        design_file_url: fileName,
        qr_x: qrX,
        qr_y: qrY,
        qr_size: qrSize
      })

    // 5. Crear ZIP
    const zip = new JSZip()

    for (const ticket of tickets) {
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.id}`

      const qrBuffer = await QRCode.toBuffer(ticketUrl, {
        width: qrSize,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })

      const finalImage = await sharp(imageBuffer)
        .composite([{ input: qrBuffer, left: Math.round(qrX), top: Math.round(qrY) }])
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