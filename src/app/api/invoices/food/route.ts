import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNumber } from '@/lib/pos-utils'

// GET /api/invoices/food — list all food invoices
export async function GET() {
  const invoices = await db.foodInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { order: { include: { items: true } } },
  })
  return NextResponse.json({ invoices })
}

// POST /api/invoices/food — generate a separate food invoice for an existing order
// Body: { orderId: string, paymentMethod?: string, notes?: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { orderId, paymentMethod = null, notes = null } = body
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const order = await db.foodOrder.findUnique({
    where: { id: orderId },
    include: { items: true, foodInvoice: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.foodInvoice) {
    return NextResponse.json({ error: 'Food invoice already exists for this order', invoice: order.foodInvoice }, { status: 400 })
  }
  if (order.paymentMode !== 'separate') {
    return NextResponse.json({ error: 'Order is on room account. Generate hotel invoice at checkout instead.' }, { status: 400 })
  }

  const invoiceNumber = await generateNumber('FOO')
  const invoice = await db.foodInvoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      customerName: order.customerName,
      roomNumber: order.roomNumber,
      tableNumber: order.tableNumber,
      orderType: order.orderType,
      itemsTotal: order.itemsTotal,
      cgstRate: order.cgstAmount ? (order.cgstAmount / order.itemsTotal) * 100 : 9,
      sgstRate: order.sgstAmount ? (order.sgstAmount / order.itemsTotal) * 100 : 9,
      igstRate: 0,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount || 0,
      grandTotal: order.grandTotal,
      paymentMethod,
      notes,
    },
    include: { order: { include: { items: true } } },
  })

  return NextResponse.json({ invoice })
}
