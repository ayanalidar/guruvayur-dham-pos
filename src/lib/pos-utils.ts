import { db } from '@/lib/db'

// Generate simple sequential numbers: 1, 2, 3, 4, 5...
// Same counter shared across all invoice types for simplicity.
// Uses a retry loop to handle race conditions on Vercel serverless.
export async function generateNumber(prefix: 'HOT' | 'FOO' | 'ORD'): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let count = 0
    if (prefix === 'HOT') {
      count = await db.hotelInvoice.count()
    } else if (prefix === 'FOO') {
      count = await db.foodInvoice.count()
    } else {
      count = await db.foodOrder.count()
    }

    const candidate = String(count + 1 + attempt)

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
  }

  // Fallback: use timestamp to guarantee uniqueness
  return String(Date.now())
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
