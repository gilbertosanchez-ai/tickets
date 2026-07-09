import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { eventId, logoBase64, logoX, logoY, logoSize } = await request.json()

    // 1. Obtener evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) throw new Error('Evento no encontrado')

    // 2. Obtener boletos
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('ticket_number')

    if (ticketsError || !tickets) throw new Error('No se encontraron boletos')

    // 3. Cargar diseño base
    const designPath = path.join(process.cwd(), 'public', 'design-base.png')
    const baseImage = await loadImage(designPath)

    // Dimensiones del boleto
    const W = 591
    const H = 1063

    // Posición del QR (centro del boleto)
    const QR_SIZE = 390
    const QR_X = (W - QR_SIZE) / 2
    const QR_Y = 330

    // 4. Generar ZIP
    const zip = new JSZip()

    for (const ticket of tickets) {
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${ticket.id}`

      // Crear canvas
      const canvas = createCanvas(W, H)
      const ctx = canvas.getContext('2d')

      // Dibujar diseño base
      ctx.drawImage(baseImage, 0, 0, W, H)

      // Nombre del evento
      ctx.fillStyle = '#1a1a2e'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(event.name, W / 2, 180)

      // Lugar
      ctx.fillStyle = '#444'
      ctx.font = '26px sans-serif'
      ctx.fillText(event.venue, W / 2, 225)

      // Generar QR
      const qrBuffer = await QRCode.toBuffer(ticketUrl, {
        width: QR_SIZE,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
      const qrImage = await loadImage(qrBuffer)
      ctx.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE)

      // Fecha debajo del QR
      const fecha = new Date(event.date).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      ctx.fillStyle = '#1a1a2e'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(fecha, W / 2, QR_Y + QR_SIZE + 45)

      // Número de boleto
      ctx.fillStyle = '#666'
      ctx.font = '22px sans-serif'
      ctx.fillText(`Boleto #${String(ticket.ticket_number).padStart(3, '0')}`, W / 2, QR_Y + QR_SIZE + 80)

      // Logo opcional
      if (logoBase64) {
        const logoData = logoBase64.replace(/^data:image\/\w+;base64,/, '')
        const logoBuffer = Buffer.from(logoData, 'base64')
        const logoImage = await loadImage(logoBuffer)
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize)
      }

      // Guardar en ZIP
      const buffer = canvas.toBuffer('image/png')
      zip.file(`boleto-${String(ticket.ticket_number).padStart(3, '0')}.png`, buffer)
    }

    // 5. Guardar template
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