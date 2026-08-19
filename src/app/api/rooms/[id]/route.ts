import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/rooms/[id] — update room attributes (rate, type, bed, capacity, status, notes)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.number != null) {
    // Validate uniqueness if number is changing
    const num = String(body.number).trim()
    if (!num) return NextResponse.json({ error: 'Room number cannot be empty' }, { status: 400 })
    const existing = await db.room.findFirst({ where: { number: num, NOT: { id } } })
    if (existing) return NextResponse.json({ error: `Room number ${num} already exists` }, { status: 400 })
    data.number = num
  }
  if (body.floor != null) data.floor = Number(body.floor)
  if (body.type != null) data.type = String(body.type)
  if (body.ratePerNight != null) data.ratePerNight = Number(body.ratePerNight)
  if (body.bedType != null) data.bedType = String(body.bedType)
  if (body.capacity != null) data.capacity = Number(body.capacity)
  if (body.status != null) data.status = String(body.status)
  if (body.notes != null) data.notes = body.notes ? String(body.notes) : null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const room = await db.room.update({ where: { id }, data: data as any })
  return NextResponse.json({ room })
}
