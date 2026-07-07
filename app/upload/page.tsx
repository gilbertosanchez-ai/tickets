'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'

export default function UploadPage() {
  const [image, setImage] = useState<string | null>(null)
  const [qrPosition, setQrPosition] = useState({ x: 0, y: 0, size: 150 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ zipBase64: string; total: number } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      })
      setQrPosition({
        x: imageRef.current.naturalWidth / 2 - 75,
        y: imageRef.current.naturalHeight / 2 - 75,
        size: 150
      })
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
    if (!eventId) return alert('Ingresa el ID del evento')
    if (!image) return alert('Sube una imagen primero')
    setLoading(true)

    const res = await fetch('/api/tickets/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
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
    } else {
      alert('Error: ' + data.error)
    }
  }

  const handleDownload = () => {
    if (!done) return
    const link = document.createElement('a')
    link.href = `data:application/zip;base64,${done.zipBase64}`
    link.download = 'boletos.zip'
    link.click()
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🎨 Generar Boletos con QR</h1>
        <p className="text-gray-500 mb-6">Sube tu diseño y posiciona el QR</p>

        {done ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Boletos listos!</h2>
            <p className="text-gray-500 mb-6">Se generaron {done.total} boletos con QR</p>
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-green-700"
            >
              ⬇️ Descargar ZIP con todos los boletos
            </button>
            <button
              onClick={() => { setDone(null); setImage(null); setEventId('') }}
              className="w-full mt-3 border border-gray-300 text-gray-700 rounded-xl py-3 hover:bg-gray-50"
            >
              Generar otro evento
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">ID del evento</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-gray-800 font-mono text-sm"
                placeholder="Pega aquí el ID del evento de Supabase"
                value={eventId}
                onChange={e => setEventId(e.target.value)}
              />
            </div>

            {!image ? (
              <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-5xl mb-4">📁</div>
                <p className="text-gray-600 font-medium">Haz clic para subir tu diseño</p>
                <p className="text-gray-400 text-sm mt-1">PNG, JPG — exporta tu diseño de Corel como imagen</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="bg-white rounded-2xl shadow p-4">
                <p className="text-sm text-blue-600 font-medium mb-3">👆 Haz clic para posicionar el QR</p>
                <div className="relative cursor-crosshair" onClick={handleImageClick}>
                  <Image
                    ref={imageRef}
                    src={image}
                    alt="Diseño"
                    width={600}
                    height={400}
                    className="w-full rounded-lg"
                    onLoad={handleImageLoad}
                  />
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
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño del QR: {qrPosition.size}px</label>
                  <input
                    type="range" min="80" max="400"
                    value={qrPosition.size}
                    onChange={e => setQrPosition(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !image || !eventId}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ Generando boletos...' : '🚀 Generar todos los boletos'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}