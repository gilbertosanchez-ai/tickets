import { guestEmail, serverAuth } from '@/lib/server-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!/^QR-[A-F0-9]{32}$/.test(code)) {
    return NextResponse.json({ error: 'Revisa el código de tu compra.' }, { status: 400 })
  }
  const supabase = await serverAuth()
  const { error } = await supabase.auth.signInWithPassword({ email: guestEmail(code), password: code })
  if (error) {
    return NextResponse.json({ error: 'No se pudo entrar con ese código. Revísalo e inténtalo de nuevo.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
