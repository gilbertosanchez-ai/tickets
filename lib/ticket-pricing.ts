export const ticketPlans = [
  { id: 'starter', nombre: 'Starter', boletos: 100, precio: 78, popular: false },
  { id: 'popular', nombre: 'Popular', boletos: 500, precio: 345, popular: true },
  { id: 'pro', nombre: 'Pro', boletos: 2000, precio: 1240, popular: false },
  { id: 'graduacion', nombre: 'Graduación', boletos: 10000, precio: 5900, popular: false },
] as const

export function quoteTickets(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 100 || quantity > 10000) return null
  const nextIndex = ticketPlans.findIndex(plan => quantity < plan.boletos)
  if (nextIndex === -1) return ticketPlans[3].precio * 100
  const current = ticketPlans[nextIndex - 1]
  const next = ticketPlans[nextIndex]
  return Math.min(Math.round(quantity * current.precio * 100 / current.boletos), next.precio * 100)
}

export function formatTicketPrice(cents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100) + ' MXN'
}
