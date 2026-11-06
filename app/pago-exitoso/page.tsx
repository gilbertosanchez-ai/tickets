import Link from 'next/link'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { admin } from '@/lib/server-auth'
import { CodeForm } from '@/app/login/code-form'

export default async function PagoExitosoPage({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const session = typeof sessionId === 'string' && /^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)
    ? await stripe.checkout.sessions.retrieve(sessionId).catch(() => null)
    : null
  const paid = session?.payment_status === 'paid'
  const { data: fulfillment } = paid && session.metadata?.fulfillment_version === '2'
    ? await admin.from('ticket_checkout_fulfillments').select('session_id').eq('session_id', session.id).maybeSingle()
    : { data: null }
  const ready = paid && (fulfillment || session.metadata?.fulfillment_version !== '2')
  const jar = await cookies()
  const code = ready && sessionId ? jar.get(`guest-${sessionId}`)?.value : undefined

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          {ready ? '¡Pago confirmado!' : session ? 'Estamos confirmando tu compra' : 'Compra no encontrada'}
        </h1>
        {code ? (
          <>
            <p className="mb-3 text-gray-600">Guarda este código privado. Lo podrás usar para recuperar y descargar tus boletos desde otro dispositivo.</p>
            <p className="mb-5 break-all rounded-lg bg-blue-50 p-3 font-mono font-bold text-blue-900">{code}</p>
            <CodeForm initialCode={code} destination="/crear" />
          </>
        ) : ready ? (
          <Link href="/crear" className="block rounded-xl bg-blue-600 py-3 font-semibold text-white">Crear evento</Link>
        ) : session ? (
          <>
            <p className="mb-4 text-gray-600">Conserva esta pestaña y vuelve a consultar en unos segundos.</p>
            <a href={`/pago-exitoso?session_id=${encodeURIComponent(session.id)}`} className="font-semibold text-blue-700">Volver a consultar</a>
          </>
        ) : (
          <Link href="/" className="font-semibold text-blue-700">Regresar al inicio</Link>
        )}
        <p className="mt-6 text-sm text-gray-600">
          ¿Ya pagaste y no aparece tu código? Escríbenos a{' '}
          <a href="mailto:publiestampagil@gmail.com" className="break-all font-medium text-blue-700 underline">
            publiestampagil@gmail.com
          </a>{' '}con la referencia de tu pago.
        </p>
      </div>
    </main>
  )
}
