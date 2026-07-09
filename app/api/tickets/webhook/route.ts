import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const boletos = parseInt(session.metadata?.boletos || '0')
    const userId = session.metadata?.user_id

    if (userId && boletos > 0) {
      const { data: existing } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabase
          .from('credits')
          .update({ boletos: existing.boletos + boletos })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('credits')
          .insert({ user_id: userId, boletos })
      }
    }
  }

  return NextResponse.json({ received: true })
}