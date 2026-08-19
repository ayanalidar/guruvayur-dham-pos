import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/guests/lookup?phone=9876543210
// Returns the guest record if a guest with this phone exists, plus aggregated stay stats.
// Used by the Check-In dialog to detect returning guests and auto-fill their details.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')?.trim()

  if (!phone || phone.length < 4) {
    return NextResponse.json({ found: false })
  }

  const guest = await db.guest.findFirst({
    where: {
      OR: [
        { phone: { contains: phone } },
        { phone: { contains: phone.replace(/\D/g, '') } },
      ],
    },
    include: {
      checkIns: {
        include: { room: true },
        orderBy: { checkInAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!guest) {
    return NextResponse.json({ found: false })
  }

  const totalStays = await db.checkIn.count({ where: { guestId: guest.id } })
  const lastCheckIn = guest.checkIns[0]
  const roomsStayedIn = Array.from(new Set(guest.checkIns.map(c => c.room.number)))

  return NextResponse.json({
    found: true,
    guest: {
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      address: guest.address,
      idProofType: guest.idProofType,
      idNumber: guest.idNumber,
      totalStays,
      lastVisit: lastCheckIn?.checkInAt || guest.createdAt,
      lastRoom: lastCheckIn?.room.number,
      roomsStayedIn,
    },
  })
}
