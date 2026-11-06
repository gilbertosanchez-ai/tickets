'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { quoteTickets, formatTicketPrice } from '@/lib/ticket-pricing'
import { createBrowserClient } from '@supabase/ssr'

type Step = 'event' | 'design' | 'logo' | 'done'
type DesignMode = 'publitickets' | 'custom' | null

interface EventResult {
  id: string
  name: string
}

const ADMIN_ID = '73cdbd9a-db59-40e0-90e3-d8fa1d56748e'

export function TicketEditor({ guest = false }: { guest?: boolean }) {
  const [step, setStep] = useState<Step>('event')
  const [form, setForm] = useState({ eventName: '', eventDate: '', eventVenue: '', quantity: 100 })
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftError, setDraftError] = useState('')
  const restoredQr = useRef(false)
  const cents = quoteTickets(form.quantity)
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<EventResult | null>(null)
  const [designMode, setDesignMode] = useState<DesignMode>(null)
  const [image, setImage] = useState<string | null>(null)
  const [qrPosition, setQrPosition] = useState({ x: 0, y: 0, size: 150 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState<{ downloadUrl: string; total: number } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [creditos, setCreditos] = useState<number | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50, size: 120 })
  const [preview, setPreview] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const previewRef = useRef<HTMLImageElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const esAdmin = userId === ADMIN_ID

  useEffect(() => {
    const cargarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: credits } = await supabase
          .from('credits')
          .select('boletos')
          .eq('user_id', user.id)
          .single()
        setCreditos(credits?.boletos ?? 0)
      }
    }
    cargarUsuario()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('borrador')
    if (id) {
      try {
        const raw = sessionStorage.getItem(`ticket-draft-${id}`)
        if (!raw) throw new Error()
        const draft = JSON.parse(raw)
        setDraftId(id)
        setForm(draft.form)
        setDesignMode(draft.designMode)
        setLogo(draft.logo)
        setImage(draft.image)
        setQrPosition(draft.qrPosition)
        restoredQr.current = Boolean(draft.image)
        if (!guest) setEvent(draft.event ?? null)
        setStep('design')
      } catch {
        setDraftError('No encontramos el diseño en esta pestaña. Si ya pagaste, tus boletos siguen disponibles en tu saldo.')
      }
    } else if (guest) {
      const quantity = Number(params.get('cantidad'))
      if (quoteTickets(quantity) !== null) setForm(previous => ({ ...previous, quantity }))
    }
  }, [guest])

  async function requestEvent() {
    const res = await fetch('/api/tickets/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo crear el evento.')
    setEvent(data.event)
    setCreditos(data.creditosRestantes)
    if (draftId) {
      const key = `ticket-draft-${draftId}`
      const raw = sessionStorage.getItem(key)
      if (raw) sessionStorage.setItem(key, JSON.stringify({ ...JSON.parse(raw), event: data.event }))
    }
    return data.event as EventResult
  }

  const handleCreateEvent = async () => {
    if (!form.eventName.trim() || !form.eventDate || !form.eventVenue.trim()) return alert('Llena todos los campos')
    if (guest) {
      if (cents === null) return alert('Elige de 100 a 10,000 boletos.')
      setStep('design')
      return
    }
    if (!userId) return alert('Debes iniciar sesión')
    if (!esAdmin && creditos !== null && creditos < form.quantity) {
      return alert(`No tienes suficientes boletos. Tienes ${creditos} y necesitas ${form.quantity}. Compra más en /precios`)
    }
    setLoading(true)
    try {
      await requestEvent()
      setStep('design')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo crear el evento.')
    } finally {
      setLoading(false)
    }
  }

  async function payForDraft() {
    if (cents === null) throw new Error('Elige de 100 a 10,000 boletos.')
    const id = draftId ?? crypto.randomUUID()
    try {
      sessionStorage.setItem(`ticket-draft-${id}`, JSON.stringify({ form, designMode, image, qrPosition, logo }))
    } catch {
      throw new Error('No se pudo guardar el diseño en esta pestaña. Prueba con una imagen más pequeña o habilita el almacenamiento.')
    }
    setDraftId(id)
    const res = await fetch('/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: form.quantity, draft: id })
    })
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo abrir Stripe.')
    window.location.assign(data.url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight })
      if (restoredQr.current) {
        restoredQr.current = false
        return
      }
      setQrPosition({ x: imageRef.current.naturalWidth / 2 - 75, y: imageRef.current.naturalHeight / 2 - 75, size: 150 })
    }
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height
    const x = (e.clientX - rect.left) * scaleX - qrPosition.size / 2
    const y = (e.clientY - rect.top) * scaleY - qrPosition.size / 2
    setQrPosition(prev => ({ ...prev, x: Math.max(0, Math.min(x, imageSize.width - prev.size)), y: Math.max(0, Math.min(y, imageSize.height - prev.size)) }))
    setDragging(true)
    setTimeout(() => setDragging(false), 300)
  }

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const scaleX = 591 / rect.width
    const scaleY = 1063 / rect.height
    const x = (e.clientX - rect.left) * scaleX - logoPosition.size / 2
    const y = (e.clientY - rect.top) * scaleY - logoPosition.size / 2
    setLogoPosition(prev => ({ ...prev, x: Math.round(x), y: Math.round(y) }))
  }

  async function generateTickets() {
    if (designMode === 'custom') {
      if (!image) return alert('Sube una imagen primero')
      const { x, y, size } = qrPosition
      if (x < 0 || y < 0 || x + size > imageSize.width || y + size > imageSize.height) {
        return alert('Ajusta el tamaño y la posición para que el QR quede dentro del boleto.')
      }
    }
    setLoading(true)
    try {
      if (guest) {
        await payForDraft()
        return
      }
      const currentEvent = event ?? await requestEvent()
      const custom = designMode === 'custom'
      const res = await fetch(`/api/tickets/${custom ? 'generate-images' : 'generate-design'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(custom
          ? { eventId: currentEvent.id, imageBase64: image, qrX: Math.round(qrPosition.x), qrY: Math.round(qrPosition.y), qrSize: qrPosition.size }
          : { eventId: currentEvent.id, logoBase64: logo })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron generar los boletos.')
      setDone(data)
      setStep('done')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudieron preparar los boletos.')
    } finally {
      setLoading(false)
    }
  }

  const generateLabel = loading ? 'Preparando…' : guest && cents !== null
    ? `Pagar boletos · ${formatTicketPrice(cents)}`
    : `Generar ${form.quantity} boletos`

  const handleDownload = () => {
    if (!done) return
    const link = document.createElement('a')
    link.href = done.downloadUrl
    link.download = `boletos-${event?.name}.zip`
    link.click()
  }

  const handleReset = () => {
    if (draftId) {
      sessionStorage.removeItem(`ticket-draft-${draftId}`)
      window.history.replaceState(null, '', '/crear')
      setDraftId(null)
    }
    setStep('event')
    setForm({ eventName: '', eventDate: '', eventVenue: '', quantity: 100 })
    setEvent(null)
    setImage(null)
    setLogo(null)
    setDone(null)
    setDesignMode(null)
    setPreview(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">

        {guest && <Link href="/registro" className="mb-5 inline-block font-medium text-blue-700">← Volver al registro</Link>}
        {guest && step !== 'event' && <button type="button" onClick={() => setStep('event')} className="mb-5 ml-5 font-medium text-blue-700">Editar datos y cantidad</button>}
        {draftError && <p role="alert" className="mb-4 text-sm text-red-700">{draftError}</p>}
        {/* Header */}
        {!guest && <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎟️</span>
            <div>
              <p className="text-xs text-gray-500">Boletos disponibles</p>
              <p className="text-lg font-bold text-gray-800">
                {esAdmin ? '∞' : creditos === null ? '...' : creditos === 0 ? (
                  <a href="/precios" className="text-red-500 text-sm">Sin boletos — Comprar →</a>
                ) : creditos}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/eventos" className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">Mis eventos</a>
            <a href="/precios" className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Comprar boletos</a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
          </div>
        </div>}

        {/* Pasos */}
        <div className="flex items-center justify-between mb-8">
          {['event', 'design', 'done'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s || (step === 'logo' && s === 'design') ? 'bg-blue-600 text-white' : ['event', 'design', 'logo', 'done'].indexOf(step) > ['event', 'design', 'done'].indexOf(s) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {['event', 'design', 'logo', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`h-1 w-24 mx-2 ${['event', 'design', 'logo', 'done'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Paso 1: Datos del evento */}
        {step === 'event' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">🎟️ Nuevo Evento</h1>
            <p className="text-gray-500 mb-6">Ingresa los datos del evento</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del evento</label>
                <input className="w-full border rounded-lg px-3 py-2 text-gray-800" placeholder="Ej: Graduación CETYS 2026" value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-gray-800" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                <input className="w-full border rounded-lg px-3 py-2 text-gray-800" placeholder="Ej: Salón Versalles, Guadalajara" value={form.eventVenue} onChange={e => setForm({ ...form, eventVenue: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de boletos</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-gray-800" min={guest ? 100 : 1} max={10000} step={1} value={Number.isNaN(form.quantity) ? '' : form.quantity} onChange={e => setForm({ ...form, quantity: e.target.valueAsNumber })} />
              </div>
              {guest && <p className="text-sm text-gray-600" aria-live="polite">{cents === null ? 'Mínimo 100 y máximo 10,000 boletos.' : `Total: ${formatTicketPrice(cents)}`}</p>}
              <button onClick={handleCreateEvent} disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Creando evento...' : 'Siguiente →'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Elegir diseño */}
        {step === 'design' && !designMode && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">🎨 Diseño del Boleto</h1>
            <p className="text-gray-500 mb-6">¿Cómo quieres el diseño de tus boletos?</p>
            <div className="space-y-4">
              <button
                onClick={() => setDesignMode('publitickets')}
                className="w-full border-2 border-blue-500 rounded-2xl p-6 text-left hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">✨</span>
                  <div>
                    <p className="font-bold text-gray-800">Usar diseño PubliTickets</p>
                    <p className="text-sm text-gray-500">Diseño profesional con tus datos automáticamente</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setDesignMode('custom')}
                className="w-full border-2 border-gray-200 rounded-2xl p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">📁</span>
                  <div>
                    <p className="font-bold text-gray-800">Subir mi propio diseño</p>
                    <p className="text-sm text-gray-500">Sube tu diseño de Corel u otro programa</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

       {/* Paso 2a: Diseño PubliTickets */}
{step === 'design' && designMode === 'publitickets' && (
  <div className="bg-white rounded-2xl shadow-lg p-8">
    <h1 className="text-2xl font-bold text-gray-800 mb-1">✨ Diseño PubliTickets</h1>
    <p className="text-gray-500 mb-6">Vista previa de tu boleto con los datos del evento</p>

    <div className="relative rounded-lg overflow-hidden mb-4 border">
  <Image
    src="/design-base.png"
    alt="Diseño base"
    width={591}
    height={1063}
    className="w-full"
  />
  {/* Nombre del evento — área superior */}
  <div className="absolute w-full text-center" style={{ top: '14%' }}>
    <p className="font-bold text-blue-900 px-4" style={{ fontSize: 'clamp(12px, 4vw, 22px)' }}>
      {form.eventName}
    </p>
    <p className="text-gray-600 px-4" style={{ fontSize: 'clamp(10px, 3vw, 18px)' }}>
      {form.eventVenue}
    </p>
  </div>
  {/* Fecha y número — área inferior */}
  <div className="absolute w-full text-center" style={{ top: '78%' }}>
    <p className="font-bold text-blue-900 px-4" style={{ fontSize: 'clamp(10px, 3vw, 16px)' }}>
      {form.eventDate ? new Date(form.eventDate).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }) : ''}
    </p>
    <p className="text-gray-500 px-4" style={{ fontSize: 'clamp(clamp(9px, 2.5vw, 14px)' }}>
      Boleto #001
    </p>
  </div>
  {/* Logo preview */}
  {logo && (
    <div className="absolute w-full flex justify-center" style={{ bottom: '2%' }}>
      <img src={logo} alt="Logo" style={{ width: '20%', objectFit: 'contain' }} />
    </div>
  )}
</div>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo de tu empresa (opcional)</label>
        <label className="block border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50">
          <p className="text-gray-500 text-sm">
            {logo ? '✅ Logo cargado — se colocará en la parte inferior del boleto' : '📁 Haz clic para subir tu logo o continúa sin él'}
          </p>
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setDesignMode(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 hover:bg-gray-50">
          ← Cambiar diseño
        </button>
        <button onClick={generateTickets} disabled={loading} className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
          {generateLabel}
        </button>
      </div>
    </div>
  </div>
)}

        {/* Paso 2b: Diseño personalizado */}
{step === 'design' && designMode === 'custom' && (
  <div className="bg-white rounded-2xl shadow-lg p-8">
    <h1 className="text-2xl font-bold text-gray-800 mb-1">📁 Tu Diseño</h1>
    <p className="text-gray-500 mb-6">Sube tu diseño y haz clic donde va el QR</p>
    {!image ? (
      <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50">
        <div className="text-5xl mb-4">📁</div>
        <p className="text-gray-600 font-medium">Haz clic para subir tu diseño</p>
        <p className="text-gray-400 text-sm mt-1">PNG o JPG exportado de Corel</p>
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </label>
    ) : (
      <div className="space-y-4">
        <p className="text-sm text-blue-600 font-medium">👆 Haz clic en el diseño para posicionar el QR</p>
        <div className="relative cursor-crosshair rounded-lg overflow-hidden" onClick={handleImageClick}>
          <Image ref={imageRef} src={image} alt="Diseño" width={600} height={400} className="w-full" onLoad={handleImageLoad} />
          {imageSize.width > 0 && (
            <div
              className={`absolute border-4 border-blue-500 bg-blue-200/50 rounded flex items-center justify-center transition-all ${dragging ? 'scale-110' : ''}`}
              style={{
                left: `${(qrPosition.x / imageSize.width) * 100}%`,
                top: `${(qrPosition.y / imageSize.height) * 100}%`,
                width: `${(qrPosition.size / imageSize.width) * 100}%`,
                height: `${(qrPosition.size / imageSize.height) * 100}%`,
              }}
            >
              <span className="text-blue-600 font-bold text-xs">QR</span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño del QR: {qrPosition.size}px</label>
          <input type="range" min="80" max="400" value={qrPosition.size} onChange={e => setQrPosition(prev => ({ ...prev, size: parseInt(e.target.value) }))} className="w-full" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setDesignMode(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 hover:bg-gray-50">
            ← Cambiar diseño
          </button>
          <button onClick={generateTickets} disabled={loading} className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
            {generateLabel}
          </button>
        </div>
      </div>
    )}
  </div>
)}
        {/* Paso 3: Listo */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Boletos listos!</h1>
            <p className="text-gray-500 mb-2">Se generaron <strong>{done?.total}</strong> boletos para <strong>{event?.name}</strong></p>
            <p className="text-sm text-gray-400 mb-6">Te quedan <strong>{esAdmin ? '∞' : creditos}</strong> boletos en tu cuenta</p>
            <button onClick={handleDownload} className="w-full bg-green-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-green-700 mb-3">
              ⬇️ Descargar ZIP con todos los boletos
            </button>
            <button onClick={handleReset} className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 hover:bg-gray-50">
              Crear otro evento
            </button>
          </div>
        )}

      </div>
    </main>
  )
}