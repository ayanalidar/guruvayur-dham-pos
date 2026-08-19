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

// PATCH /api/invoices/food/[id] — update editable fields (invoiceNumber, paymentMethod, notes)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.invoiceNumber != null) {
    const num = String(body.invoiceNumber).trim()
    if (!num) return NextResponse.json({ error: 'invoiceNumber cannot be empty' }, { status: 400 })
    const exists = await db.foodInvoice.findFirst({ where: { invoiceNumber: num, NOT: { id } } })
    if (exists) return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 })
    data.invoiceNumber = num
  }
  if (body.paymentMethod != null) data.paymentMethod = body.paymentMethod
  if (body.notes != null) data.notes = body.notes
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const invoice = await db.foodInvoice.update({ where: { id }, data: data as any })
  return NextResponse.json({ invoice })
}
