import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/config — get hotel config
export async function GET() {
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main' } })
  }
  return NextResponse.json({ config })
}

// PATCH /api/config — update hotel config
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const allowed = ['name', 'address', 'phone', 'email', 'gstNumber', 'sacCode', 'cgstRate', 'sgstRate']
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] != null) data[k] = body[k]
  }
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main', ...(data as any) } })
  } else {
    config = await db.hotelConfig.update({ where: { id: 'main' }, data: data as any })
  }
  return NextResponse.json({ config })
}
