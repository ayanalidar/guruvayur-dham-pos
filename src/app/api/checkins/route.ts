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

  // VAPT: Input validation — sanitize all string inputs to prevent XSS
  const safeGuestName = String(guestName).trim().slice(0, 200)
  const safePhone = String(phone).trim().slice(0, 20)
  const safeEmail = email ? String(email).trim().slice(0, 200) : null
  const safeAddress = address ? String(address).trim().slice(0, 500) : null
  const safeIdProofType = idProofType ? String(idProofType).trim().slice(0, 50) : null
  const safeIdNumber = idNumber ? String(idNumber).trim().slice(0, 100) : null
  const safeNotes = notes ? String(notes).trim().slice(0, 1000) : null

  // Validate numeric fields
  const safeAdults = Math.max(1, Math.min(20, Number(adults) || 1))
  const safeChildren = Math.max(0, Math.min(20, Number(children) || 0))
  const safeAdvance = Math.max(0, Math.min(10000000, Number(advanceAmount) || 0))

  // verify room is available
  const room = await db.room.findUnique({ where: { id: String(roomId) } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status === 'occupied') {
    return NextResponse.json({ error: `Room ${room.number} is already occupied` }, { status: 400 })
  }

  // upsert guest (by phone)
  let guest = await db.guest.findFirst({ where: { phone: safePhone } })
  if (!guest) {
    guest = await db.guest.create({
      data: {
        name: safeGuestName,
        phone: safePhone,
        email: safeEmail,
        address: safeAddress,
        idProofType: safeIdProofType,
        idNumber: safeIdNumber,
      },
    })
  } else {
    guest = await db.guest.update({
      where: { id: guest.id },
      data: {
        name: safeGuestName,
        ...(safeEmail && { email: safeEmail }),
        ...(safeAddress && { address: safeAddress }),
        ...(safeIdProofType && { idProofType: safeIdProofType }),
        ...(safeIdNumber && { idNumber: safeIdNumber }),
      },
    })
  }

  const checkIn = await db.checkIn.create({
    data: {
      guestId: guest.id,
      roomId: String(roomId),
      adults: safeAdults,
      children: safeChildren,
      expectedCheckOut: expectedCheckOut ? new Date(expectedCheckOut) : null,
      advanceAmount: safeAdvance,
      notes: safeNotes,
      status: 'active',
    },
    include: { guest: true, room: true },
  })

  // mark room as occupied
  await db.room.update({ where: { id: roomId }, data: { status: 'occupied' } })

  return NextResponse.json({ checkIn })
}
