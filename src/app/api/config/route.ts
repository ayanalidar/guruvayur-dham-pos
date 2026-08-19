import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSeeded } from '@/lib/db'

// GET /api/config — get hotel config (PIN is included for the login screen to compare)
export async function GET() {
  await ensureSeeded()
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main' } })
  }
  return NextResponse.json({ config })
}

// PATCH /api/config — update hotel config (including posPin)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const allowed = ['name', 'address', 'phone', 'email', 'gstNumber', 'sacCode', 'cgstRate', 'sgstRate', 'posPin', 'reviewLink', 'bankName', 'bankAccount', 'bankIfsc', 'bankBranch']
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] != null) {
      if (k === 'cgstRate' || k === 'sgstRate') data[k] = Number(body[k])
      else if (k === 'posPin') {
        // Validate: 4-6 digits only
        const pin = String(body[k]).trim()
        if (!/^\d{4,6}$/.test(pin)) {
          return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
        }
        data[k] = pin
      } else {
        data[k] = body[k]
      }
    }
  }
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main', ...(data as any) } })
  } else {
    config = await db.hotelConfig.update({ where: { id: 'main' }, data: data as any })
  }
  return NextResponse.json({ config })
}
