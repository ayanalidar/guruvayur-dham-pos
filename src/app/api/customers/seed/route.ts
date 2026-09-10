import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/customers/seed — import all unique customers from existing custom invoices
// Deduplicates by phone number (if present) or by name+address.
export async function POST() {
  // Fetch all custom invoices
  const invoices = await db.customInvoice.findMany({
    select: {
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerGstIn: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by phone (if present) or by name (lowercased)
  const customerMap = new Map<string, {
    name: string
    phone: string | null
    address: string | null
    gstin: string | null
    lastUsedAt: Date
    visitCount: number
  }>()

  for (const inv of invoices) {
    const phone = inv.customerPhone?.trim() || null
    const key = phone || `name:${inv.customerName.trim().toLowerCase()}`

    const existing = customerMap.get(key)
    if (existing) {
      existing.visitCount += 1
      existing.lastUsedAt = inv.createdAt
      // Fill in any missing fields from later invoices
      if (!existing.gstin && inv.customerGstIn) existing.gstin = inv.customerGstIn
      if (!existing.address && inv.customerAddress) existing.address = inv.customerAddress
      if (!existing.phone && phone) existing.phone = phone
    } else {
      customerMap.set(key, {
        name: inv.customerName.trim(),
        phone,
        address: inv.customerAddress?.trim() || null,
        gstin: inv.customerGstIn?.trim() || null,
        lastUsedAt: inv.createdAt,
        visitCount: 1,
      })
    }
  }

  // Upsert into the Customer table
  let created = 0
  let updated = 0
  for (const [, data] of customerMap) {
    if (data.phone) {
      // Check if customer with this phone already exists in Customer table
      const existing = await db.customer.findFirst({ where: { phone: data.phone } })
      if (existing) {
        await db.customer.update({
          where: { id: existing.id },
          data: {
            visitCount: Math.max(existing.visitCount, data.visitCount),
            lastUsedAt: data.lastUsedAt,
            gstin: existing.gstin || data.gstin,
            address: existing.address || data.address,
          },
        })
        updated++
        continue
      }
    }
    await db.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        gstin: data.gstin,
        visitCount: data.visitCount,
        lastUsedAt: data.lastUsedAt,
      },
    })
    created++
  }

  return NextResponse.json({
    seeded: true,
    created,
    updated,
    totalUnique: customerMap.size,
  })
}
