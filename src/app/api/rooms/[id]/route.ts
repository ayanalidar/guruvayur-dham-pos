import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/rooms/[id] — update room attributes (rate, type, bed, capacity, status, notes)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.number != null) {
    const num = String(body.number).trim().slice(0, 10)
    if (!num) return NextResponse.json({ error: 'Room number cannot be empty' }, { status: 400 })
    const existing = await db.room.findFirst({ where: { number: num, NOT: { id } } })
    if (existing) return NextResponse.json({ error: `Room number ${num} already exists` }, { status: 400 })
    data.number = num
  }
  if (body.floor != null) {
    const f = Number(body.floor)
    if (isNaN(f) || f < 1 || f > 50) return NextResponse.json({ error: 'Floor must be 1-50' }, { status: 400 })
    data.floor = f
  }
  if (body.type != null) {
    const validTypes = ['Twin Bedroom', 'Deluxe Bedroom', 'Family Room', 'Superior', 'GVD Suite', 'Standard', 'Deluxe', 'Suite']
    data.type = validTypes.includes(body.type) ? body.type : 'Deluxe Bedroom'
  }
  if (body.ratePerNight != null) {
    const r = Number(body.ratePerNight)
    if (isNaN(r) || r < 0 || r > 1000000) return NextResponse.json({ error: 'Rate must be 0-1,000,000' }, { status: 400 })
    data.ratePerNight = r
  }
  if (body.bedType != null) {
    const validBeds = ['Single', 'Double', 'Twin', 'King']
    data.bedType = validBeds.includes(body.bedType) ? body.bedType : 'Double'
  }
  if (body.capacity != null) {
    const c = Number(body.capacity)
    if (isNaN(c) || c < 1 || c > 20) return NextResponse.json({ error: 'Capacity must be 1-20' }, { status: 400 })
    data.capacity = c
  }
  if (body.status != null) {
    const validStatus = ['available', 'occupied', 'cleaning', 'maintenance']
    data.status = validStatus.includes(body.status) ? body.status : 'available'
  }
  if (body.notes != null) {
    data.notes = body.notes ? String(body.notes).trim().slice(0, 1000) : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const room = await db.room.update({ where: { id }, data: data as any })
  return NextResponse.json({ room })
}
