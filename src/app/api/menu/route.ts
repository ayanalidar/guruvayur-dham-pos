import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSeeded } from '@/lib/db'

// GET /api/menu — list all menu items
export async function GET() {
  await ensureSeeded()
  const items = await db.menuItem.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ items })
}

// POST /api/menu — create new menu item
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, category, price, isVeg, prepTime, description } = body
  if (!name || !category || price == null) {
    return NextResponse.json({ error: 'name, category, price are required' }, { status: 400 })
  }
  const item = await db.menuItem.create({
    data: {
      name,
      category,
      price: Number(price),
      isVeg: isVeg ?? true,
      prepTime: prepTime ?? 15,
      description: description ?? null,
    },
  })
  return NextResponse.json({ item })
}

// PATCH /api/menu — update menu item (toggle availability, change price, etc.)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const item = await db.menuItem.update({
    where: { id },
    data: {
      ...(updates.name != null && { name: updates.name }),
      ...(updates.category != null && { category: updates.category }),
      ...(updates.price != null && { price: Number(updates.price) }),
      ...(updates.isVeg != null && { isVeg: updates.isVeg }),
      ...(updates.available != null && { available: updates.available }),
      ...(updates.prepTime != null && { prepTime: Number(updates.prepTime) }),
      ...(updates.description != null && { description: updates.description }),
    },
  })
  return NextResponse.json({ item })
}
