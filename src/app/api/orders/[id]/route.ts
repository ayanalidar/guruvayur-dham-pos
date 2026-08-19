import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/orders/[id] — update order status
// Body: { status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { status } = body
  const allowed = ['pending', 'preparing', 'ready', 'served', 'cancelled']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const order = await db.foodOrder.update({
    where: { id },
    data: { status },
    include: { items: true },
  })
  return NextResponse.json({ order })
}
