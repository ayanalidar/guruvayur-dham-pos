import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers/[id] — single customer
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}

// PATCH /api/customers/[id] — update customer
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  const strFields = ['name', 'phone', 'email', 'gstin', 'address', 'notes']
  for (const k of strFields) {
    if (body[k] != null) data[k] = String(body[k]).trim() || null
  }
  // name must not be empty
  if (data.name === '') return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const customer = await db.customer.update({ where: { id }, data: data as any })
  return NextResponse.json({ customer })
}

// DELETE /api/customers/[id] — delete customer
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// POST /api/customers/[id]/touch — increment visit count + update lastUsedAt
// (called when a customer is selected for a new invoice)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.customer.update({
    where: { id },
    data: {
      visitCount: customer.visitCount + 1,
      lastUsedAt: new Date(),
      // Optionally update fields if provided (e.g., corrected address)
      ...(body.name ? { name: String(body.name).trim() } : {}),
      ...(body.phone != null ? { phone: String(body.phone).trim() || null } : {}),
      ...(body.gstin != null ? { gstin: String(body.gstin).trim() || null } : {}),
      ...(body.address != null ? { address: String(body.address).trim() || null } : {}),
    },
  })
  return NextResponse.json({ customer: updated })
}
