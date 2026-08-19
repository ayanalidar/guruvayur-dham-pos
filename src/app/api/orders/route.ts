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

  // VAPT: Validate orderType and paymentMode against allowed values
  const validOrderTypes = ['dine_in', 'room_service', 'takeaway']
  const validPaymentModes = ['room_account', 'separate']
  const safeOrderType = validOrderTypes.includes(orderType) ? orderType : 'dine_in'
  const safePaymentMode = validPaymentModes.includes(paymentMode) ? paymentMode : 'separate'

  // VAPT: Sanitize string inputs
  const safeCustomerName = String(customerName).trim().slice(0, 200)
  const safeRoomNumber = roomNumber ? String(roomNumber).trim().slice(0, 10) : null
  const safeTableNumber = tableNumber ? String(tableNumber).trim().slice(0, 10) : null
  const safeNotes = notes ? String(notes).trim().slice(0, 1000) : null

  // if room_account, ensure a valid active check-in exists
  if (safePaymentMode === 'room_account') {
    if (!checkInId) return NextResponse.json({ error: 'checkInId required for room_account' }, { status: 400 })
    const ci = await db.checkIn.findUnique({ where: { id: String(checkInId) } })
    if (!ci || ci.status !== 'active') {
      return NextResponse.json({ error: 'Active check-in not found' }, { status: 400 })
    }
  }

  // VAPT: Validate and sanitize each item
  const orderItems = items.slice(0, 100).map((it: any) => {
    const qty = Math.max(1, Math.min(999, Number(it.quantity) || 1))
    const price = Math.max(0, Math.min(100000, Number(it.price) || 0))
    return {
      menuItemId: it.menuItemId ? String(it.menuItemId) : null,
      name: String(it.name || '').trim().slice(0, 200),
      price,
      quantity: qty,
      total: price * qty,
      notes: it.notes ? String(it.notes).trim().slice(0, 500) : null,
    }
  })
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
      checkInId: safePaymentMode === 'room_account' ? String(checkInId) : null,
      customerName: safeCustomerName,
      roomNumber: safeRoomNumber,
      tableNumber: safeTableNumber,
      orderType: safeOrderType,
      paymentMode: safePaymentMode,
      status: 'pending',
      itemsTotal,
      cgstAmount,
      sgstAmount,
      grandTotal,
      notes: safeNotes,
      items: { create: orderItems },
    },
    include: { items: true },
  })

  return NextResponse.json({ order })
}
