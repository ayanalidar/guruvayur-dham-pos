import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers — list all customers (optionally filtered by ?q=search)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q } },
          { gstin: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const customers = await db.customer.findMany({
    where,
    orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
  return NextResponse.json({ customers })
}

// POST /api/customers — create a new customer
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, phone, email, gstin, address, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Deduplicate by phone: if a customer with the same phone exists, update instead of create
  if (phone?.trim()) {
    const existing = await db.customer.findFirst({ where: { phone: phone.trim() } })
    if (existing) {
      const updated = await db.customer.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          gstin: gstin?.trim() || null,
          address: address?.trim() || null,
          notes: notes?.trim() || existing.notes,
          visitCount: existing.visitCount + 1,
          lastUsedAt: new Date(),
        },
      })
      return NextResponse.json({ customer: updated, created: false })
    }
  }

  const customer = await db.customer.create({
    data: {
      name: String(name).trim().slice(0, 200),
      phone: phone ? String(phone).trim().slice(0, 20) : null,
      email: email ? String(email).trim().slice(0, 100) : null,
      gstin: gstin ? String(gstin).trim().slice(0, 20) : null,
      address: address ? String(address).trim().slice(0, 500) : null,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      lastUsedAt: new Date(),
    },
  })
  return NextResponse.json({ customer, created: true })
}
