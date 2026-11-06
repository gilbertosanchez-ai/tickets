import Stripe from 'stripe'
import { quoteTickets } from '@/lib/ticket-pricing'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { admin, guestEmail, serverAuth } from '@/lib/server-auth'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLANES: Record<string, { priceId: string; boletos: number; nombre: string }> = {
  starter: { priceId: 'price_1TrPOE0PwVndiXSQxLOttril', boletos: 100, nombre: 'Starter 100 boletos' },
  popular: { priceId: 'price_1TrPOc0PwVndiXSQhD8TBv68', boletos: 500, nombre: 'Popular 500 boletos' },
  pro: { priceId: 'price_1TrPOz0PwVndiXSQB9xyfwA4', boletos: 2000, nombre: 'Pro 2,000 boletos' },
  graduacion: { priceId: 'price_1TrPPM0PwVndiXSQvNvT30Ro', boletos: 10000, nombre: 'Graduación 10,000 boletos' },
}

export async function POST(request: Request) {
  try {
    const { plan, quantity, draft } = await request.json()
    const planData = typeof plan === 'string' && Object.hasOwn(PLANES, plan) ? PLANES[plan] : null
    const cents = typeof quantity === 'number' ? quoteTickets(quantity) : null
    if (!planData && cents === null) {
      return NextResponse.json({ error: 'Elige entre 100 y 10,000 boletos.' }, { status: 400 })
    }
    const boletos = planData?.boletos ?? quantity
    const draftId = typeof draft === 'string' && /^[0-9a-f-]{36}$/.test(draft) ? draft : ''
    const lineItem = planData
      ? { price: planData.priceId, quantity: 1 }
      : { price_data: { currency: 'mxn', unit_amount: cents!, product_data: { name: `${boletos} boletos QR` } }, quantity: 1 }

    const { error: readinessError } = await admin.from('ticket_checkout_fulfillments').select('session_id').limit(0)
    if (readinessError) return NextResponse.json({ error: 'El pago aún no está disponible.' }, { status: 503 })

    const auth = await serverAuth()
    const { data: { user } } = await auth.auth.getUser()
    let userId = user?.id
    let code: string | undefined
    if (!userId) {
      code = 'QR-' + randomBytes(16).toString('hex').toUpperCase()
      const { data, error } = await admin.auth.admin.createUser({
        email: guestEmail(code), password: code, email_confirm: true,
      })
      if (error || !data.user) throw new Error('No se pudo preparar tu compra.')
      userId = data.user.id
    }
    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: 'payment',
      integration_identifier: 'ticket-checkout-nqvpajrt',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}${draftId ? `/disenar?borrador=${draftId}` : "/precios"}`,
      metadata: {
        boletos: String(boletos),
        plan: planData ? plan : "personalizado",
        draft_id: draftId,
        user_id: userId,
        fulfillment_version: '2'
      }
    })

    if (code) {
      const jar = await cookies()
      jar.set(`guest-${session.id}`, code, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/pago-exitoso', maxAge: 7 * 24 * 60 * 60,
      })
    }
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}