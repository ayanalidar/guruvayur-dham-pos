import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/pos-utils'

// GET /api/orders — list all food orders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const orders = await db.foodOrder.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { items: true, checkIn: { include: { guest: true, room: true } }, foodInvoice: { select: { id: true, invoiceNumber: true } } },
    take: 200,
  })
  return NextResponse.json({ orders })
}

// POST /api/orders — create a new food order
// Body: {
//   checkInId?: string | null,        // null = walk-in
//   customerName: string,
//   roomNumber?: string,
//   tableNumber?: string,
//   orderType: 'dine_in' | 'room_service' | 'takeaway',
//   paymentMode: 'room_account' | 'separate',
//   notes?: string,
//   items: [{ menuItemId: string, name: string, price: number, quantity: number, notes?: string }]
// }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    checkInId = null,
    customerName,
    roomNumber = null,
    tableNumber = null,
    orderType = 'dine_in',
    paymentMode = 'separate',
    notes = null,
    items = [],
  } = body

  if (!customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 })
  }

  // if room_account, ensure a valid active check-in exists
  if (paymentMode === 'room_account') {
    if (!checkInId) return NextResponse.json({ error: 'checkInId required for room_account' }, { status: 400 })
    const ci = await db.checkIn.findUnique({ where: { id: checkInId } })
    if (!ci || ci.status !== 'active') {
      return NextResponse.json({ error: 'Active check-in not found' }, { status: 400 })
    }
  }

  // compute totals
  const orderItems = items.map((it: any) => ({
    menuItemId: it.menuItemId || null,
    name: it.name,
    price: Number(it.price),
    quantity: Number(it.quantity),
    total: Number(it.price) * Number(it.quantity),
    notes: it.notes || null,
  }))
  const itemsTotal = orderItems.reduce((s: number, it: any) => s + it.total, 0)

  const config = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  const cgstRate = config?.cgstRate ?? 9
  const sgstRate = config?.sgstRate ?? 9
  const cgstAmount = Math.round(itemsTotal * cgstRate) / 100
  const sgstAmount = Math.round(itemsTotal * sgstRate) / 100
  const grandTotal = itemsTotal + cgstAmount + sgstAmount

  const orderNumber = await generateNumber('ORD')

  const order = await db.foodOrder.create({
    data: {
      orderNumber,
      checkInId: paymentMode === 'room_account' ? checkInId : null,
      customerName,
      roomNumber,
      tableNumber,
      orderType,
      paymentMode,
      status: 'pending',
      itemsTotal,
      cgstAmount,
      sgstAmount,
      grandTotal,
      notes,
      items: { create: orderItems },
    },
    include: { items: true },
  })

  return NextResponse.json({ order })
}
