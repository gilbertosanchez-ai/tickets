'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const stagger = {
  visible: { transition: { staggerChildren: 0.2 } }
}

const planes = [
  { nombre: 'Starter', boletos: 100, precio: 78, popular: false },
  { nombre: 'Popular', boletos: 500, precio: 345, popular: true },
  { nombre: 'Pro', boletos: 2000, precio: 1240, popular: false },
  { nombre: 'Graduación', boletos: 10000, precio: 5900, popular: false },
]

const pasos = [
  { emoji: '📝', titulo: 'Crea tu evento', desc: 'Ingresa el nombre, fecha y lugar de tu evento en segundos.' },
  { emoji: '🎨', titulo: 'Elige tu diseño', desc: 'Usa nuestro diseño profesional o sube el tuyo desde Corel.' },
  { emoji: '📲', titulo: 'Descarga y valida', desc: 'Descarga todos los boletos con QR único y valídalos el día del evento.' },
]

// FIX: Patrón fijo en lugar de Math.random()
// Siempre genera el mismo resultado en servidor y cliente
const qrPattern = Array.from({ length: 25 }, (_, i) => (i * 7 + 11) % 3 === 0)

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎟</span>
            <span className="font-bold text-xl text-gray-800">PubliTickets</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
              ✨ La forma más fácil de hacer boletos con QR
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              Genera boletos con QR únicos en minutos
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-gray-500 mb-8">
              Diseño profesional, validación en tiempo real y descarga instantánea. Perfecto para graduaciones, bodas y eventos.
            </motion.p>
            <motion.div variants={fadeUp} className="flex gap-4">
              <Link href="/registro" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors">
                Crear mis boletos →
              </Link>
              <Link href="#precios" className="border border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                Ver precios
              </Link>
            </motion.div>
          </motion.div>

          {/* Boleto flotante */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-64 border border-gray-100">
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">PubliTickets</p>
                  <p className="font-bold text-gray-800 text-lg">Graduación 2026</p>
                  <p className="text-gray-500 text-sm">Salón Versalles</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-1">
                    {qrPattern.map((isDark, i) => (
                      <div key={i} className={`w-3 h-3 rounded-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Fecha</p>
                    <p className="text-sm font-medium text-gray-700">25 Oct 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Boleto</p>
                    <p className="text-sm font-bold text-blue-600">#001</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-blue-200/30 rounded-full blur-xl" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 mb-4">
              ¿Cómo funciona?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-gray-500">
              En 3 simples pasos tienes tus boletos listos
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {pasos.map((paso, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="text-center p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="text-6xl mb-6">{paso.emoji}</div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{paso.titulo}</h3>
                <p className="text-gray-500">{paso.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 mb-4">
              Precios simples y transparentes
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-gray-500">
              Paga solo por los boletos que necesitas. Sin suscripciones.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {planes.map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`bg-white rounded-2xl p-6 flex flex-col relative ${plan.popular ? 'ring-2 ring-blue-500 shadow-xl' : 'border border-gray-100 shadow-sm'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MÁS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-800 mb-1">{plan.nombre}</h3>
                <p className="text-gray-500 text-sm mb-4">{new Intl.NumberFormat('es-MX').format(plan.boletos)} boletos</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-800">${plan.precio}</span>
                  <span className="text-gray-500 text-sm ml-1">MXN</span>
                  <p className="text-gray-400 text-xs mt-1">${(plan.precio / plan.boletos).toFixed(2)} por boleto</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1 text-sm text-gray-600">
                  <li className="flex gap-2"><span className="text-green-500">✓</span> QR único por boleto</li>
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Validación en tiempo real</li>
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Sin fecha de caducidad</li>
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Descarga ZIP inmediata</li>
                </ul>
                <Link
                  href="/registro"
                  className={`w-full py-3 rounded-xl font-semibold text-center transition-colors ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-white hover:bg-gray-900'}`}
                >
                  Empezar →
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-blue-600">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white mb-6">
            ¿Listo para generar tus boletos?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-xl text-blue-100 mb-8">
            Únete a los organizadores que ya confían en PubliTickets
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/registro" className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors">
              Crear mi cuenta gratis →
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟</span>
            <span className="font-bold text-white">PubliTickets</span>
          </div>
          <p className="text-sm">© 2026 PubliTickets · Todos los derechos reservados</p>
        </div>
      </footer>

    </main>
  )
}