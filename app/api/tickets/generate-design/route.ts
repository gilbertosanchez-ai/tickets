import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createCanvas, loadImage, registerFont } from 'canvas'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import path from 'path'

// Registrar fuente
registerFont(
  path.join(process.cwd(), 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'),
  { family: 'Roboto' }
)
registerFont(
  path.join(process.cwd(), 'node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff2'),
  { family: 'Roboto', weight: 'bold' }
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { eventId, logoBase64 } = await request.json()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) throw new Error('Evento no encontrado')

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('ticket_number')

    if (ticketsError || !tickets) throw new Error('No se encontraron boletos')

    const designPath = path.join(process.cwd(), 'public', 'design-base.png')
    const baseImage = await loadImage(designPath)

    // Dimensiones del boleto (50x90mm a 300dpi)
    const W = 591
    const H = 1063

    // Área info evento — 11mm desde arriba = 130px
    const INFO_Y_NOMBRE = 175
    const INFO_Y_LUGAR = 225

    // QR centrado — empieza a 25mm desde arriba del centro
    const QR_SIZE = 390
    const QR_X = Math.round((W - QR_SIZE) / 2)
    const QR_Y = 295

    // Fecha y número — debajo del QR
    const FECHA_Y = QR_Y + QR_SIZE + 50
    const NUMERO_Y = FECHA_Y + 40

    // Logo centrado abajo
    const LOGO_SIZE = 120
    const LOGO_X = Math.round((W - LOGO_SIZE) / 2)
    const LOGO_Y = H - LOGO_SIZE - 20

    const zip = new JSZip()

    for (const ticket of tickets) {
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.id}`

      const canvas = createCanvas(W, H)
      const ctx = canvas.getContext('2d')

      // Diseño base
      ctx.drawImage(baseImage as any, 0, 0, W, H)

      // Nombre del evento
      ctx.fillStyle = '#1a1a2e'
      ctx.font = 'bold 40px Roboto'
      ctx.textAlign = 'center'
      ctx.fillText(event.name, W / 2, INFO_Y_NOMBRE)

      // Lugar
      ctx.fillStyle = '#555555'
      ctx.font = '30px Roboto'
      ctx.fillText(event.venue, W / 2, INFO_Y_LUGAR)

      // QR
      const qrBuffer = await QRCode.toBuffer(ticketUrl, {
        width: QR_SIZE,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
      const qrImage = await loadImage(qrBuffer)
      ctx.drawImage(qrImage as any, QR_X, QR_Y, QR_SIZE, QR_SIZE)

      // Fecha
      const fecha = new Date(event.date).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      ctx.fillStyle = '#1a1a2e'
      ctx.font = 'bold 29px Roboto'
      ctx.fillText(fecha, W / 2, FECHA_Y)

      // Número de boleto
      ctx.fillStyle = '#666666'
      ctx.font = '28px Roboto'
      ctx.fillText(`Boleto #${String(ticket.ticket_number).padStart(3, '0')}`, W / 2, NUMERO_Y)

      // Logo opcional centrado abajo
      if (logoBase64) {
        const logoData = logoBase64.replace(/^data:image\/\w+;base64,/, '')
        const logoBuffer = Buffer.from(logoData, 'base64')
        const logoImage = await loadImage(logoBuffer)
        ctx.drawImage(logoImage as any, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE)
      }

      const buffer = canvas.toBuffer('image/png')
      zip.file(`boleto-${String(ticket.ticket_number).padStart(3, '0')}.png`, buffer)
    }

    await supabase
      .from('ticket_templates')
      .upsert({
        event_id: eventId,
        design_file_url: 'design-base',
        qr_x: QR_X,
        qr_y: QR_Y,
        qr_size: QR_SIZE
      })

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipBase64 = zipBuffer.toString('base64')

    return NextResponse.json({ success: true, zipBase64, total: tickets.length })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}