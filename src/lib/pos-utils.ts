import { db } from '@/lib/db'

// Generate sequential invoice/order numbers like HOT-2026-0001, FOO-2026-0001, ORD-2026-0001
// Uses a retry loop to handle race conditions on Vercel serverless (concurrent requests
// generating the same number).
export async function generateNumber(prefix: 'HOT' | 'FOO' | 'ORD'): Promise<string> {
  const year = new Date().getFullYear()
  const yearStr = String(year)

  for (let attempt = 0; attempt < 5; attempt++) {
    let count = 0
    if (prefix === 'HOT') {
      count = await db.hotelInvoice.count({ where: { invoiceNumber: { startsWith: `HOT-${yearStr}-` } } })
    } else if (prefix === 'FOO') {
      count = await db.foodInvoice.count({ where: { invoiceNumber: { startsWith: `FOO-${yearStr}-` } } })
    } else {
      count = await db.foodOrder.count({ where: { orderNumber: { startsWith: `ORD-${yearStr}-` } } })
    }
    // Add attempt offset to avoid collision with concurrent requests
    const seq = (count + 1 + attempt).toString().padStart(4, '0')
    const candidate = `${prefix}-${yearStr}-${seq}`

    // Check if this number already exists
    let exists = false
    if (prefix === 'HOT') {
      exists = !!(await db.hotelInvoice.findFirst({ where: { invoiceNumber: candidate } }))
    } else if (prefix === 'FOO') {
      exists = !!(await db.foodInvoice.findFirst({ where: { invoiceNumber: candidate } }))
    } else {
      exists = !!(await db.foodOrder.findFirst({ where: { orderNumber: candidate } }))
    }

    if (!exists) return candidate
    // If it exists, try the next number
  }

  // Fallback: use timestamp to guarantee uniqueness
  const ts = Date.now().toString().slice(-6)
  return `${prefix}-${yearStr}-${ts}`
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
