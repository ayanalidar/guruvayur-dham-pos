import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/checkins/[id]/extend
// Modify an active check-in:
//   - extend expectedCheckOut (for stay extensions)
//   - change room (move guest to a different room mid-stay)
//   - update adults/children count
//   - add more advance payment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { expectedCheckOut, newRoomId, adults, children, additionalAdvance, notes } = body

  const checkIn = await db.checkIn.findUnique({
    where: { id },
    include: { room: true },
  })

  if (!checkIn) {
    return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
  }
  if (checkIn.status !== 'active') {
    return NextResponse.json({ error: 'Check-in is not active' }, { status: 400 })
  }

  // If moving to a new room, verify the new room is available
  if (newRoomId && newRoomId !== checkIn.roomId) {
    const newRoom = await db.room.findUnique({ where: { id: newRoomId } })
    if (!newRoom) {
      return NextResponse.json({ error: 'New room not found' }, { status: 404 })
    }
    if (newRoom.status === 'occupied') {
      return NextResponse.json({ error: `Room ${newRoom.number} is already occupied` }, { status: 400 })
    }
  }

  const updates: any = {}
  if (expectedCheckOut) updates.expectedCheckOut = new Date(expectedCheckOut)
  if (adults != null) updates.adults = Number(adults)
  if (children != null) updates.children = Number(children)
  if (notes != null) updates.notes = notes
  if (additionalAdvance) updates.advanceAmount = checkIn.advanceAmount + Number(additionalAdvance)

  // If moving rooms, do it as a transaction: mark old room available, mark new room occupied
  if (newRoomId && newRoomId !== checkIn.roomId) {
    await db.$transaction(async (tx) => {
      // Update check-in with new room
      await tx.checkIn.update({ where: { id }, data: { ...updates, roomId: newRoomId } })
      // Mark old room as cleaning (needs to be cleaned before next use)
      await tx.room.update({ where: { id: checkIn.roomId }, data: { status: 'cleaning' } })
      // Mark new room as occupied
      await tx.room.update({ where: { id: newRoomId }, data: { status: 'occupied' } })
    })
  } else {
    await db.checkIn.update({ where: { id }, data: updates })
  }

  const updated = await db.checkIn.findUnique({
    where: { id },
    include: { guest: true, room: true },
  })

  return NextResponse.json({ checkIn: updated })
}

// DELETE /api/checkins/[id]/extend?action=early_checkout
// Perform early checkout — same as regular checkout but flags it as early
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // This is a no-op placeholder — early checkout uses the existing /api/checkins/[id]/checkout endpoint
  return NextResponse.json({ error: 'Use POST /api/checkins/[id]/checkout for early checkout' }, { status: 400 })
}
