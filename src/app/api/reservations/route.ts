import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reservations?status=confirmed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const reservations = await db.reservation.findMany({
    where: status ? { status } : undefined,
    orderBy: { checkInDate: 'asc' },
    include: { room: true },
  })
  return NextResponse.json({ reservations })
}

// POST /api/reservations — create a new reservation
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    guestName, guestPhone, guestEmail, roomId,
    checkInDate, checkOutDate, adults, children,
    advanceAmount, notes, source,
  } = body

  if (!guestName || !guestPhone || !roomId || !checkInDate || !checkOutDate) {
    return NextResponse.json({ error: 'guestName, guestPhone, roomId, checkInDate, checkOutDate are required' }, { status: 400 })
  }

  // Verify room exists
  const room = await db.room.findUnique({ where: { id: roomId } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // Compute nights
  const ci = new Date(checkInDate)
  const co = new Date(checkOutDate)
  const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)))

  const reservation = await db.reservation.create({
    data: {
      guestName,
      guestPhone,
      guestEmail: guestEmail || null,
      roomId,
      checkInDate: ci,
      checkOutDate: co,
      nights,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      advanceAmount: Number(advanceAmount) || 0,
      notes: notes || null,
      source: source || 'walk_in',
      status: 'confirmed',
    },
    include: { room: true },
  })

  return NextResponse.json({ reservation })
}
