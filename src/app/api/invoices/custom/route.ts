import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/pos-utils'

// GET /api/invoices/custom — list all custom invoices
export async function GET() {
  const invoices = await db.customInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ invoices })
}

// POST /api/invoices/custom — create a new custom invoice
// Body: { customerName, customerPhone?, customerAddress?, items: [{name, quantity, rate}], discount?, cgstRate?, sgstRate?, paymentMethod?, notes? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customerName, customerPhone, customerAddress, items, discount, cgstRate, sgstRate, paymentMethod, notes } = body

  if (!customerName?.trim()) {
    return NextResponse.json({ error: 'customerName is required' }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
  }

  // Sanitize + compute item amounts
  const safeItems = items.slice(0, 50).map((it: any) => {
    const qty = Math.max(1, Math.min(999, Number(it.quantity) || 1))
    const rate = Math.max(0, Math.min(1000000, Number(it.rate) || 0))
    return {
      name: String(it.name || '').trim().slice(0, 200),
      quantity: qty,
      rate,
      amount: Math.round(rate * qty * 100) / 100,
    }
  })

  const itemsTotal = safeItems.reduce((s: number, it: any) => s + it.amount, 0)
  const safeDiscount = Math.max(0, Math.min(itemsTotal, Number(discount) || 0))
  const taxable = Math.max(0, itemsTotal - safeDiscount)
  const cRate = Math.max(0, Math.min(100, Number(cgstRate) || 0))
  const sRate = Math.max(0, Math.min(100, Number(sgstRate) || 0))
  const cgstAmount = Math.round(taxable * cRate) / 100
  const sgstAmount = Math.round(taxable * sRate) / 100
  const grandTotal = taxable + cgstAmount + sgstAmount

  const invoiceNumber = await generateNumber('HOT') // uses same counter as hotel invoices

  const invoice = await db.customInvoice.create({
    data: {
      invoiceNumber,
      customerName: String(customerName).trim().slice(0, 200),
      customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : null,
      customerAddress: customerAddress ? String(customerAddress).trim().slice(0, 500) : null,
      items: safeItems,
      itemsTotal,
      cgstRate: cRate,
      sgstRate: sRate,
      cgstAmount,
      sgstAmount,
      grandTotal,
      discount: safeDiscount,
      paymentMethod: paymentMethod || null,
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
    },
  })

  return NextResponse.json({ invoice })
}
