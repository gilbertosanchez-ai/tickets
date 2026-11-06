'use client'

import { useState, type FormEvent } from 'react'

export function CodeForm({ initialCode, destination = '/eventos' }: {
  initialCode?: string
  destination?: '/crear' | '/eventos' | `/crear?borrador=${string}`
}) {
  const [code, setCode] = useState(initialCode ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/tickets/codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) throw new Error((await response.json()).error)
      window.location.assign(destination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {!initialCode && (
        <label className="block text-sm font-medium text-gray-700">
          Código de compra
          <input type="password" value={code} onChange={event => setCode(event.target.value)}
            required maxLength={40} autoComplete="off" placeholder="QR-…"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-gray-800" />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? 'Entrando…' : initialCode ? destination.includes('borrador=') ? 'Continuar con mi diseño' : 'Crear mi evento' : 'Entrar con mi código'}
      </button>
    </form>
  )
}
