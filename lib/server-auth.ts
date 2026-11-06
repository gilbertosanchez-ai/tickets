import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function serverAuth() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => jar.getAll(),
      setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)),
    } }
  )
}

export function guestEmail(code: string) {
  const hash = createHash('sha256').update(code).digest('hex')
  return `qr-${hash.slice(0, 56)}@guest.invalid`
}
