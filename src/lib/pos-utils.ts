import { db } from '@/lib/db'

// Generate sequential invoice/order numbers like HOT-2026-0001, FOO-2026-0001, ORD-2026-0001
export async function generateNumber(prefix: 'HOT' | 'FOO' | 'ORD'): Promise<string> {
  const year = new Date().getFullYear()
  const yearStr = String(year)

  let count = 0
  if (prefix === 'HOT') {
    count = await db.hotelInvoice.count({ where: { invoiceNumber: { startsWith: `HOT-${yearStr}-` } } })
  } else if (prefix === 'FOO') {
    count = await db.foodInvoice.count({ where: { invoiceNumber: { startsWith: `FOO-${yearStr}-` } } })
  } else {
    count = await db.foodOrder.count({ where: { orderNumber: { startsWith: `ORD-${yearStr}-` } } })
  }
  const seq = (count + 1).toString().padStart(4, '0')
  return `${prefix}-${yearStr}-${seq}`
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n || 0)
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
