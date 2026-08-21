import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/hotel/[id] — single hotel invoice for printing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.hotelInvoice.findUnique({
    where: { id },
    include: {
      checkIn: {
        include: {
          guest: true,
          room: true,
          foodOrders: {
            where: { paymentMode: 'room_account', status: { not: 'cancelled' } },
            include: { items: true },
          },
        },
      },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

// PATCH /api/invoices/hotel/[id] — update any editable field on the hotel invoice
// All fields are optional; only provided ones are updated.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}

  // String fields
  const strFields = ['invoiceNumber', 'guestName', 'guestPhone', 'roomNumber', 'roomType', 'paymentMethod', 'notes']
  for (const k of strFields) {
    if (body[k] != null) {
      if (k === 'invoiceNumber') {
        const num = String(body[k]).trim()
        if (!num) return NextResponse.json({ error: 'invoiceNumber cannot be empty' }, { status: 400 })
        const exists = await db.hotelInvoice.findFirst({ where: { invoiceNumber: num, NOT: { id } } })
        if (exists) return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 })
        data.invoiceNumber = num
      } else {
        data[k] = String(body[k])
      }
    }
  }

  // Numeric fields
  const numFields = ['nights', 'ratePerNight', 'roomCharges', 'foodCharges', 'extraCharges', 'discount', 'taxableAmount', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmount', 'sgstAmount', 'igstAmount', 'grandTotal', 'advancePaid', 'balanceDue']
  for (const k of numFields) {
    if (body[k] != null) data[k] = Number(body[k])
  }

  // Date fields
  if (body.checkInAt != null) data.checkInAt = new Date(body.checkInAt)
  if (body.checkOutAt != null) data.checkOutAt = new Date(body.checkOutAt)

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const invoice = await db.hotelInvoice.update({ where: { id }, data: data as any })
  return NextResponse.json({ invoice })
}

// DELETE /api/invoices/hotel/[id] — permanently delete a hotel invoice
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.hotelInvoice.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Invoice not found or could not be deleted' }, { status: 404 })
  }
}
