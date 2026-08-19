import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/rooms — list all rooms with active check-in info
export async function GET() {
  const rooms = await db.room.findMany({
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    include: {
      checkIns: {
        where: { status: 'active' },
        include: { guest: true },
        take: 1,
      },
    },
  })
  return NextResponse.json({ rooms })
}

// PATCH /api/rooms — update room status (cleaning / maintenance / available)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { roomId, status } = body as { roomId: string; status: string }
  if (!roomId || !status) {
    return NextResponse.json({ error: 'roomId and status are required' }, { status: 400 })
  }
  const allowed = ['available', 'cleaning', 'maintenance']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const room = await db.room.update({
    where: { id: roomId },
    data: { status },
  })
  return NextResponse.json({ room })
}
