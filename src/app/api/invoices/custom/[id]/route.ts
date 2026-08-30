import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/custom/[id] — single custom invoice for printing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.customInvoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

// PATCH /api/invoices/custom/[id] — update editable fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  // String fields
  const strFields = ['invoiceNumber', 'customerName', 'customerPhone', 'customerAddress', 'customerGstIn', 'paymentMethod', 'notes']
  for (const k of strFields) {
    if (body[k] != null) {
      if (k === 'invoiceNumber') {
        const num = String(body[k]).trim()
        if (!num) return NextResponse.json({ error: 'invoiceNumber cannot be empty' }, { status: 400 })
        const exists = await db.customInvoice.findFirst({ where: { invoiceNumber: num, NOT: { id } } })
        if (exists) return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 })
        data.invoiceNumber = num
      } else {
        data[k] = String(body[k])
      }
    }
  }

  // Numeric fields
  const numFields = ['itemsTotal', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmount', 'sgstAmount', 'igstAmount', 'grandTotal', 'discount']
  for (const k of numFields) {
    if (body[k] != null) data[k] = Number(body[k])
  }

  // Date fields
  if (body.checkInDate != null) data.checkInDate = body.checkInDate ? new Date(body.checkInDate) : null
  if (body.checkOutDate != null) data.checkOutDate = body.checkOutDate ? new Date(body.checkOutDate) : null

  // Items (JSON field)
  if (body.items != null) data.items = body.items

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const invoice = await db.customInvoice.update({ where: { id }, data: data as any })
  return NextResponse.json({ invoice })
}

// DELETE /api/invoices/custom/[id] — delete a custom invoice
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.customInvoice.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
