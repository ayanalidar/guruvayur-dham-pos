import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/food/[id] — single food invoice for printing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.foodInvoice.findUnique({
    where: { id },
    include: { order: { include: { items: true } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

// PATCH /api/invoices/food/[id] — update any editable field on the food invoice
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  // String fields
  const strFields = ['invoiceNumber', 'customerName', 'roomNumber', 'tableNumber', 'orderType', 'paymentMethod', 'notes']
  for (const k of strFields) {
    if (body[k] != null) {
      if (k === 'invoiceNumber') {
        const num = String(body[k]).trim()
        if (!num) return NextResponse.json({ error: 'invoiceNumber cannot be empty' }, { status: 400 })
        const exists = await db.foodInvoice.findFirst({ where: { invoiceNumber: num, NOT: { id } } })
        if (exists) return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 })
        data.invoiceNumber = num
      } else {
        data[k] = String(body[k])
      }
    }
  }

  // Numeric fields
  const numFields = ['itemsTotal', 'cgstRate', 'sgstRate', 'cgstAmount', 'sgstAmount', 'grandTotal']
  for (const k of numFields) {
    if (body[k] != null) data[k] = Number(body[k])
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const invoice = await db.foodInvoice.update({ where: { id }, data: data as any })
  return NextResponse.json({ invoice })
}
