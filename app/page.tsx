'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'

type Step = 'event' | 'design' | 'done'

interface EventResult {
  id: string
  name: string
}

export default function Home() {
  const [step, setStep] = useState<Step>('event')
  const [form, setForm] = useState({ eventName: '', eventDate: '', eventVenue: '', quantity: 100 })
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<EventResult | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [qrPosition, setQrPosition] = useState({ x: 0, y: 0, size: 150 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState<{ zipBase64: string; total: number } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const ADMIN_ID = '73cdbd9a-db59-40e0-90e3-d8fa1d56748e'
const esAdmin = userId === ADMIN_ID
  const [creditos, setCreditos] = useState<number | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

  const handleCreateEvent = async () => {
    if (!form.eventName || !form.eventDate || !form.eventVenue) return alert('Llena todos los campos')
    if (!userId) return alert('Debes iniciar sesión')
    if (!esAdmin && creditos !== null && creditos < form.quantity) {
  return alert(`No tienes suficientes boletos. Tienes ${creditos} y necesitas ${form.quantity}. Compra más en /precios`)
}
    setLoading(true)
    console.log('userId que se envía:', userId)
    const res = await fetch('/api/tickets/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userId })
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setEvent(data.event)
      setCreditos(data.creditosRestantes)
      setStep('design')
    } else {
      alert(data.error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight })
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
    setQrPosition(prev => ({ ...prev, x, y }))
    setDragging(true)
    setTimeout(() => setDragging(false), 300)
  }

  const handleGenerate = async () => {
    if (!image) return alert('Sube una imagen primero')
    setLoading(true)
    const res = await fetch('/api/tickets/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: event?.id,
        imageBase64: image,
        qrX: Math.round(qrPosition.x),
        qrY: Math.round(qrPosition.y),
        qrSize: qrPosition.size
      })
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setDone(data)
      setStep('done')
    } else {
      alert('Error: ' + data.error)
    }
  }

  const handleDownload = () => {
    if (!done) return
    const link = document.createElement('a')
    link.href = `data:application/zip;base64,${done.zipBase64}`
    link.download = `boletos-${event?.name}.zip`
    link.click()
  }

  const handleReset = () => {
    setStep('event')
    setForm({ eventName: '', eventDate: '', eventVenue: '', quantity: 100 })
    setEvent(null)
    setImage(null)
    setDone(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎟️</span>
            <div>
              <p className="text-xs text-gray-500">Boletos disponibles</p>
              <p className="text-lg font-bold text-gray-800">
                {creditos === null ? '...' : creditos === 0 ? (
                  <a href="/precios" className="text-red-500 text-sm">Sin boletos — Comprar →</a>
                ) : creditos}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
  <a href="/eventos" className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">
    Mis eventos
  </a>
  <a href="/precios" className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
    Comprar boletos
  </a>
  <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
    Salir
  </button>
</div>
        </div>

        {/* Pasos */}
        <div className="flex items-center justify-between mb-8">
          {['event', 'design', 'done'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-blue-600 text-white' : ['event', 'design', 'done'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {['event', 'design', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`h-1 w-24 mx-2 ${['event', 'design', 'done'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Paso 1 */}
        {step === 'event' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">🎟️ Nuevo Evento</h1>
            <p className="text-gray-500 mb-6">Ingresa los datos del evento</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del evento</label>
                <input className="w-full border rounded-lg px-3 py-2 text-gray-800" placeholder="Ej: Boda de Ana y Carlos" value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })} />
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
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-gray-800" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })} />
              </div>
              <button onClick={handleCreateEvent} disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Creando evento...' : 'Siguiente →'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 2 */}
        {step === 'design' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">🎨 Diseño del Boleto</h1>
            <p className="text-gray-500 mb-6">Sube tu diseño y haz clic donde va el QR</p>
            {!image ? (
              <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
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
                <button onClick={handleGenerate} disabled={loading} className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {loading ? '⏳ Generando boletos...' : `🚀 Generar ${form.quantity} boletos`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paso 3 */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Boletos listos!</h1>
            <p className="text-gray-500 mb-2">Se generaron <strong>{done?.total}</strong> boletos para <strong>{event?.name}</strong></p>
            <p className="text-sm text-gray-400 mb-6">Te quedan <strong>{creditos}</strong> boletos en tu cuenta</p>
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