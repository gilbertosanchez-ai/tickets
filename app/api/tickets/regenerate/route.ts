import { saveTicketArchive, getTicketArchive } from '@/lib/ticket-archive'
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
    const { eventId } = await request.json()
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


    const savedUrl = await getTicketArchive(eventId)
    if (savedUrl) return NextResponse.json({ success: true, downloadUrl: savedUrl })

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

    const downloadUrl = await saveTicketArchive(eventId, zip)
    return NextResponse.json({ success: true, downloadUrl, total: tickets.length })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}