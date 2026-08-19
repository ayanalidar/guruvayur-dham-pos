import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/reservations/[id] — update reservation fields (e.g., change status, dates, room)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: any = {}

  if (body.guestName != null) data.guestName = body.guestName
  if (body.guestPhone != null) data.guestPhone = body.guestPhone
  if (body.guestEmail != null) data.guestEmail = body.guestEmail || null
  if (body.roomId != null) {
    const room = await db.room.findUnique({ where: { id: body.roomId } })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    data.roomId = body.roomId
  }
  if (body.checkInDate != null) data.checkInDate = new Date(body.checkInDate)
  if (body.checkOutDate != null) {
    data.checkOutDate = new Date(body.checkOutDate)
    // Recompute nights
    const ci = data.checkInDate ? new Date(data.checkInDate) : await (await db.reservation.findUnique({ where: { id } }))?.checkInDate
    if (ci) {
      data.nights = Math.max(1, Math.ceil((new Date(body.checkOutDate).getTime() - new Date(ci).getTime()) / (1000 * 60 * 60 * 24)))
    }
  }
  if (body.adults != null) data.adults = Number(body.adults)
  if (body.children != null) data.children = Number(body.children)
  if (body.advanceAmount != null) data.advanceAmount = Number(body.advanceAmount)
  if (body.status != null) data.status = body.status
  if (body.notes != null) data.notes = body.notes || null
  if (body.source != null) data.source = body.source

  const reservation = await db.reservation.update({
    where: { id },
    data,
    include: { room: true },
  })
  return NextResponse.json({ reservation })
}

// DELETE /api/reservations/[id] — cancel a reservation
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Soft delete by marking as cancelled
  const reservation = await db.reservation.update({
    where: { id },
    data: { status: 'cancelled' },
  })
  return NextResponse.json({ reservation })
}
