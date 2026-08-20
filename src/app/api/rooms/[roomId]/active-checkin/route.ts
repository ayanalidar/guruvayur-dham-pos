import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/rooms/[roomId]/active-checkin
// Returns the active check-in for this room (if any).
// Used by the public QR menu page to auto-link guest orders to their check-in.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  const checkIn = await db.checkIn.findFirst({
    where: { roomId, status: 'active' },
    include: {
      guest: { select: { name: true, phone: true } },
      room: { select: { number: true, type: true } },
    },
    orderBy: { checkInAt: 'desc' },
  })

  if (!checkIn) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    checkIn: {
      id: checkIn.id,
      guestName: checkIn.guest.name,
      roomNumber: checkIn.room.number,
      roomType: checkIn.room.type,
      checkInAt: checkIn.checkInAt,
    },
  })
}
