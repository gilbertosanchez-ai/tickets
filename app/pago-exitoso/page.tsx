'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function PagoExitosoContent() {
  const searchParams = useSearchParams()
  const boletos = parseInt(searchParams.get('boletos') || '0')
  const [guardado, setGuardado] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const guardarCreditos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || boletos === 0) return

      const { data: existing } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase
          .from('credits')
          .update({ boletos: existing.boletos + boletos })
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('credits')
          .insert({ user_id: user.id, boletos })
      }
      setGuardado(true)
    }
    guardarCreditos()
  }, [])

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-6">
          Se agregaron <strong>{boletos} boletos</strong> a tu cuenta
        </p>
        
          <a href="/"
          className="w-full block bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 text-center"
        >
          Crear mi primer evento →
        </a>
      </div>
    </main>
  )
}

export default function PagoExitosoPage() {
  return (
    <Suspense>
      <PagoExitosoContent />
    </Suspense>
  )
}