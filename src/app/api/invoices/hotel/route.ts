import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/pos-utils'

// GET /api/invoices/hotel — list all hotel invoices
export async function GET() {
  const invoices = await db.hotelInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ invoices })
}

// POST /api/invoices/hotel — generate a hotel invoice from a check-in
// This is also auto-called by the checkout endpoint; provided separately so
// you can regenerate or pre-generate an invoice without checking out.
// Body: { checkInId: string, paymentMethod?: string, discount?: number, extraCharges?: number, notes?: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { checkInId, paymentMethod = null, discount = 0, extraCharges = 0, notes = null } = body
  if (!checkInId) return NextResponse.json({ error: 'checkInId required' }, { status: 400 })

  const checkIn = await db.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      guest: true,
      room: true,
      foodOrders: { where: { paymentMode: 'room_account', status: { not: 'cancelled' } }, include: { items: true } },
      hotelInvoice: true,
    },
  })
  if (!checkIn) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })

  if (checkIn.hotelInvoice) {
    return NextResponse.json({ error: 'Invoice already exists for this check-in', invoice: checkIn.hotelInvoice }, { status: 400 })
  }

  const checkOutAt = checkIn.checkOutAt ?? new Date()
  const ms = new Date(checkOutAt).getTime() - new Date(checkIn.checkInAt).getTime()
  const nights = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))

  const roomCharges = nights * checkIn.room.ratePerNight
  const foodCharges = checkIn.foodOrders.reduce((s, o) => s + o.grandTotal, 0)
  const taxableAmount = Math.max(0, roomCharges + foodCharges + Number(extraCharges) - Number(discount))

  const config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  const cgstRate = config?.cgstRate ?? 9
  const sgstRate = config?.sgstRate ?? 9
  const cgstAmount = Math.round(taxableAmount * cgstRate) / 100
  const sgstAmount = Math.round(taxableAmount * sgstRate) / 100
  const grandTotal = taxableAmount + cgstAmount + sgstAmount
  const balanceDue = Math.max(0, grandTotal - checkIn.advanceAmount)

  const invoiceNumber = await generateNumber('HOT')
  const invoice = await db.hotelInvoice.create({
    data: {
      invoiceNumber,
      checkInId: checkIn.id,
      guestName: checkIn.guest.name,
      guestPhone: checkIn.guest.phone,
      roomNumber: checkIn.room.number,
      roomType: checkIn.room.type,
      checkInAt: checkIn.checkInAt,
      checkOutAt,
      nights,
      ratePerNight: checkIn.room.ratePerNight,
      roomCharges,
      foodCharges,
      extraCharges: Number(extraCharges),
      discount: Number(discount),
      taxableAmount,
      cgstRate,
      sgstRate,
      cgstAmount,
      sgstAmount,
      grandTotal,
      advancePaid: checkIn.advanceAmount,
      balanceDue,
      paymentMethod,
      notes,
    },
  })

  return NextResponse.json({ invoice })
}

// GET single hotel invoice (for printing)
// /api/invoices/hotel/[id]
export async function GET_single(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.hotelInvoice.findUnique({
    where: { id },
    include: { checkIn: { include: { guest: true, room: true, foodOrders: { include: { items: true } } } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}
