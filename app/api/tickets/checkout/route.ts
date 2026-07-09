import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLANES: Record<string, { priceId: string; boletos: number; nombre: string }> = {
  starter: { priceId: 'price_1Tqkrq0PwVndiXSQgg6jujJy', boletos: 100, nombre: 'Starter 100 boletos' },
  popular: { priceId: 'price_1Tqkrq0PwVndiXSQgg6jujJy', boletos: 500, nombre: 'Popular 500 boletos' },
  pro: { priceId: 'price_1Tqkrq0PwVndiXSQgg6jujJy', boletos: 2000, nombre: 'Pro 2,000 boletos' },
  graduacion: { priceId: 'price_1Tqkrq0PwVndiXSQgg6jujJy', boletos: 10000, nombre: 'Graduación 10,000 boletos' },
}

export async function POST(request: Request) {
  try {
    const { plan, userId } = await request.json()
    const planData = PLANES[plan]
    if (!planData) throw new Error('Plan no válido')

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: planData.priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}&boletos=${planData.boletos}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios`,
      metadata: {
        boletos: planData.boletos.toString(),
        plan,
        user_id: userId || ''
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}