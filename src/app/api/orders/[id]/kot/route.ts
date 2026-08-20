import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/orders/[id]/kot
// Returns a Kitchen Order Ticket (KOT) — a kitchen-only printout with NO prices.
// Used by the chef to prepare the order. Includes:
//   - Order number, time, type (dine_in/room_service/takeaway)
//   - Customer name + room/table
//   - Item list with quantities (no prices)
//   - Special notes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await db.foodOrder.findUnique({
    where: { id },
    include: { items: true, checkIn: { include: { room: true, guest: true } } },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    kot: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      orderType: order.orderType,
      status: order.status,
      customerName: order.customerName,
      roomNumber: order.roomNumber,
      tableNumber: order.tableNumber,
      notes: order.notes,
      items: order.items.map(it => ({
        name: it.name,
        quantity: it.quantity,
        notes: it.notes,
      })),
      itemCount: order.items.reduce((s, it) => s + it.quantity, 0),
    },
  })
}
