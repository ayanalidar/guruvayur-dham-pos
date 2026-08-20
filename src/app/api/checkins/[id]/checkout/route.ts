import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/pos-utils'

// POST /api/checkins/[id]/checkout
// Performs checkout: marks check-in as checked_out, room as cleaning.
// If generateInvoice=true (default), also generates a Hotel Invoice for the stay.
// Body: { generateInvoice?: boolean, paymentMethod?: string, discount?: number, extraCharges?: number, notes?: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const generateInvoice = body.generateInvoice !== false
  const paymentMethod = body.paymentMethod || null
  const discount = Number(body.discount) || 0
  const extraCharges = Number(body.extraCharges) || 0
  const notes = body.notes || null
  // Allow custom GST rates — defaults to config values
  const customCgstRate = body.cgstRate != null ? Math.max(0, Math.min(100, Number(body.cgstRate))) : null
  const customSgstRate = body.sgstRate != null ? Math.max(0, Math.min(100, Number(body.sgstRate))) : null

  const checkIn = await db.checkIn.findUnique({
    where: { id },
    include: {
      guest: true,
      room: true,
      foodOrders: {
        where: { paymentMode: 'room_account', status: { not: 'cancelled' } },
        include: { items: true },
      },
      hotelInvoice: true,
    },
  })

  if (!checkIn) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
  if (checkIn.status === 'checked_out') {
    return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
  }

  const checkOutAt = new Date()
  // calculate nights (min 1)
  const ms = checkOutAt.getTime() - new Date(checkIn.checkInAt).getTime()
  const nights = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))

  const roomCharges = nights * checkIn.room.ratePerNight
  const foodCharges = checkIn.foodOrders.reduce((s, o) => s + o.grandTotal, 0)
  const taxableAmount = Math.max(0, roomCharges + foodCharges + extraCharges - discount)

  // fetch tax rates from hotel config
  const config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  // Use custom rates if provided, else fall back to config
  const cgstRate = customCgstRate != null ? customCgstRate : (config?.cgstRate ?? 9)
  const sgstRate = customSgstRate != null ? customSgstRate : (config?.sgstRate ?? 9)
  const cgstAmount = Math.round(taxableAmount * cgstRate) / 100
  const sgstAmount = Math.round(taxableAmount * sgstRate) / 100
  const grandTotal = taxableAmount + cgstAmount + sgstAmount
  const balanceDue = Math.max(0, grandTotal - checkIn.advanceAmount)

  let invoice = checkIn.hotelInvoice

  if (generateInvoice && !checkIn.hotelInvoice) {
    const invoiceNumber = await generateNumber('HOT')
    invoice = await db.hotelInvoice.create({
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
        extraCharges,
        discount,
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
  }

  // mark check-in as checked out
  await db.checkIn.update({
    where: { id: checkIn.id },
    data: { status: 'checked_out', checkOutAt },
    // apply discount on check-in too (for record)
  })

  // apply discount to check-in record
  await db.checkIn.update({
    where: { id: checkIn.id },
    data: { discount },
  })

  // mark room as cleaning (so staff can clean it before next check-in)
  await db.room.update({
    where: { id: checkIn.roomId },
    data: { status: 'cleaning' },
  })

  return NextResponse.json({ checkInId: checkIn.id, invoice, grandTotal, balanceDue })
}
