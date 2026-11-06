import Link from 'next/link'
import { CodeForm } from '@/app/login/code-form'

export default function CodigoPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <Link href="/" className="mb-5 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Regresar al inicio
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Entrar con mi código</h1>
        <p className="mb-5 text-sm text-gray-600">Usa el código que recibiste con tu compra para recuperar tus boletos.</p>
        <CodeForm />
      </div>
    </main>
  )
}
