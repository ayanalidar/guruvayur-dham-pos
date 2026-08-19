import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/checkins?status=active — list check-ins
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'active' | 'checked_out' | undefined (all)
  const checkIns = await db.checkIn.findMany({
    where: status ? { status } : undefined,
    orderBy: { checkInAt: 'desc' },
    include: {
      guest: true,
      room: true,
      foodOrders: {
        where: { paymentMode: 'room_account', status: { not: 'cancelled' } },
        select: { id: true, grandTotal: true, orderNumber: true, createdAt: true },
      },
      hotelInvoice: { select: { id: true, invoiceNumber: true } },
    },
  })
  return NextResponse.json({ checkIns })
}

// POST /api/checkins — create a new check-in (guest + room occupancy)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    // guest fields
    guestName, phone, email, address, idProofType, idNumber,
    // stay fields
    roomId, adults, children, expectedCheckOut, advanceAmount, notes,
  } = body

  if (!guestName || !phone || !roomId) {
    return NextResponse.json({ error: 'guestName, phone, roomId are required' }, { status: 400 })
  }

  // verify room is available
  const room = await db.room.findUnique({ where: { id: roomId } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status === 'occupied') {
    return NextResponse.json({ error: `Room ${room.number} is already occupied` }, { status: 400 })
  }

  // upsert guest (by phone)
  let guest = await db.guest.findFirst({ where: { phone } })
  if (!guest) {
    guest = await db.guest.create({
      data: {
        name: guestName,
        phone,
        email: email || null,
        address: address || null,
        idProofType: idProofType || null,
        idNumber: idNumber || null,
      },
    })
  } else {
    guest = await db.guest.update({
      where: { id: guest.id },
      data: {
        name: guestName,
        ...(email && { email }),
        ...(address && { address }),
        ...(idProofType && { idProofType }),
        ...(idNumber && { idNumber }),
      },
    })
  }

  const checkIn = await db.checkIn.create({
    data: {
      guestId: guest.id,
      roomId,
      adults: adults ?? 1,
      children: children ?? 0,
      expectedCheckOut: expectedCheckOut ? new Date(expectedCheckOut) : null,
      advanceAmount: Number(advanceAmount) || 0,
      notes: notes || null,
      status: 'active',
    },
    include: { guest: true, room: true },
  })

  // mark room as occupied
  await db.room.update({ where: { id: roomId }, data: { status: 'occupied' } })

  return NextResponse.json({ checkIn })
}
