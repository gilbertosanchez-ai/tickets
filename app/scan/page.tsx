'use client'
import { useState, useEffect, useRef } from 'react'

export default function ScanPage() {
  const [result, setResult] = useState<null | { valid: boolean; message: string; ticket?: { ticket_number: number; events?: { name: string } } }>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef<unknown>(null)

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const stopScanner = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current as { stop: () => Promise<void> }
      try { await scanner.stop() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  const startScanner = async () => {
    setScanning(true)
    setResult(null)

    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' }, // cámara trasera directamente
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await stopScanner()
          setLoading(true)

          const ticketId = decodedText.includes('/ticket/')
            ? decodedText.split('/ticket/')[1]
            : decodedText

          const res = await fetch('/api/tickets/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId })
          })

          const data = await res.json()
          setResult(data)
          setLoading(false)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      alert('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const reset = async () => {
    await stopScanner()
    setResult(null)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">📷 Escáner</h1>
        <p className="text-gray-400 text-center mb-8">Escanea el QR del boleto</p>

        {!scanning && !result && !loading && (
          <button
            onClick={startScanner}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 text-lg font-semibold hover:bg-blue-700"
          >
            📷 Abrir Cámara
          </button>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="bg-black rounded-2xl overflow-hidden">
              <div id="qr-reader" className="w-full" />
            </div>
            <button
              onClick={stopScanner}
              className="w-full border border-gray-600 text-gray-300 rounded-xl py-3 hover:bg-gray-800"
            >
              Cancelar
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-white text-lg">Validando boleto...</p>
          </div>
        )}

        {result && (
          <div className={`rounded-2xl p-8 text-center ${result.valid ? 'bg-green-500' : 'bg-red-500'}`}>
            <div className="text-7xl mb-4">{result.valid ? '✅' : '❌'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {result.valid ? '¡ENTRADA VÁLIDA!' : 'NO VÁLIDO'}
            </h2>
            <p className="text-white/80 mb-2">{result.message}</p>
            {result.ticket && (
              <div className="bg-white/20 rounded-xl p-3 mt-4">
                <p className="text-white font-semibold">{result.ticket.events?.name}</p>
                <p className="text-white/80">Boleto #{result.ticket.ticket_number}</p>
              </div>
            )}
            <button
              onClick={reset}
              className="mt-6 bg-white text-gray-800 rounded-xl px-6 py-3 font-semibold hover:bg-gray-100"
            >
              Escanear otro
            </button>
          </div>
        )}
      </div>
    </main>
  )
}