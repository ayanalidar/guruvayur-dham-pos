import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSeeded } from '@/lib/db'

// GET /api/config — get hotel config
// SECURITY: posPin is NOT returned — only a boolean 'hasPin' flag.
// PIN verification happens via /api/auth/verify-pin (server-side, rate-limited).
export async function GET() {
  await ensureSeeded()
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main' } })
  }
  // Strip the PIN before returning — client should never see it
  const { posPin, ...safeConfig } = config
  return NextResponse.json({ config: { ...safeConfig, hasPin: !!posPin } })
}

// PATCH /api/config — update hotel config (including posPin)
// SECURITY: This is a write operation — should require auth.
// For now, we rely on the PIN-gated frontend. In production, add a session check.
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const allowed = ['name', 'address', 'phone', 'email', 'gstNumber', 'sacCode', 'cgstRate', 'sgstRate', 'posPin', 'reviewLink', 'bankName', 'bankAccount', 'bankIfsc', 'bankBranch']
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] != null) {
      if (k === 'cgstRate' || k === 'sgstRate') {
        const v = Number(body[k])
        if (isNaN(v) || v < 0 || v > 100) {
          return NextResponse.json({ error: `${k} must be between 0 and 100` }, { status: 400 })
        }
        data[k] = v
      } else if (k === 'posPin') {
        // Validate: 4-6 digits only
        const pin = String(body[k]).trim()
        if (!/^\d{4,6}$/.test(pin)) {
          return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
        }
        data[k] = pin
      } else {
        // Sanitize: limit string length to prevent abuse
        const v = String(body[k])
        if (v.length > 500) {
          return NextResponse.json({ error: `${k} is too long (max 500 chars)` }, { status: 400 })
        }
        data[k] = v
      }
    }
  }
  let config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  if (!config) {
    config = await db.hotelConfig.create({ data: { id: 'main', ...(data as any) } })
  } else {
    config = await db.hotelConfig.update({ where: { id: 'main' }, data: data as any })
  }
  // Strip PIN from response
  const { posPin, ...safeConfig } = config
  return NextResponse.json({ config: { ...safeConfig, hasPin: !!posPin } })
}
