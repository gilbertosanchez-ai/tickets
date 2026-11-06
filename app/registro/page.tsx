'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleRegistro = async () => {
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/crear`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
     if (data.session) {
  window.location.href = '/crear'
      } else {
        setSuccess(true)
      }
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Revisa tu email!</h1>
          <p className="text-gray-500 mb-6">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>
          </p>
          <a
            href="/login"
            className="w-full block bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 text-center"
          >
            Ir al Login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <Link href="/" className="mb-5 inline-block text-sm font-medium text-blue-700 hover:underline">
          ← Regresar al inicio
        </Link>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-8">
              <path d="M4 6h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6V7a1 1 0 0 1 1-1Z" />
              <path d="M15 8v1m0 2.5v1m0 2.5v1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Crear Cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Empieza a generar boletos</p>
        </div>

        <Link href="/precios" className="mb-5 block rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-center font-semibold text-blue-700 hover:bg-blue-100">
          Comprar sin registro →
        </Link>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-gray-800"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleRegistro}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-blue-600 font-medium hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}