import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/hotel/[id] — single hotel invoice for printing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.hotelInvoice.findUnique({
    where: { id },
    include: {
      checkIn: {
        include: {
          guest: true,
          room: true,
          foodOrders: {
            where: { paymentMode: 'room_account', status: { not: 'cancelled' } },
            include: { items: true },
          },
        },
      },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}
