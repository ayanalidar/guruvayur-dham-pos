import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/guests?search=phone_or_name — list all guests with aggregated stay history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim()
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

  const guests = await db.guest.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      checkIns: {
        include: {
          room: { select: { id: true, number: true, type: true } },
          hotelInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true, createdAt: true } },
          foodOrders: {
            where: { paymentMode: 'room_account', status: { not: 'cancelled' } },
            select: { id: true, orderNumber: true, grandTotal: true, createdAt: true },
          },
        },
        orderBy: { checkInAt: 'desc' },
      },
    },
  })

  // Aggregate stats per guest
  const enriched = guests.map(g => {
    const totalStays = g.checkIns.length
    const totalRoomCharges = g.checkIns.reduce((s, c) => s + (c.hotelInvoice?.grandTotal || 0), 0)
    const totalFoodSpend = g.checkIns.reduce(
      (s, c) => s + c.foodOrders.reduce((ss, o) => ss + o.grandTotal, 0),
      0
    )
    const totalSpend = totalRoomCharges + totalFoodSpend
    const lastVisit = g.checkIns[0]?.checkInAt || g.createdAt
    const roomsStayedIn = Array.from(
      new Set(g.checkIns.map(c => `${c.room.number} (${c.room.type})`))
    )
    return {
      id: g.id,
      name: g.name,
      phone: g.phone,
      email: g.email,
      address: g.address,
      idProofType: g.idProofType,
      idNumber: g.idNumber,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      stats: {
        totalStays,
        totalRoomCharges,
        totalFoodSpend,
        totalSpend,
        lastVisit,
        roomsStayedIn,
      },
      checkIns: g.checkIns.map(c => ({
        id: c.id,
        checkInAt: c.checkInAt,
        checkOutAt: c.checkOutAt,
        status: c.status,
        adults: c.adults,
        children: c.children,
        advanceAmount: c.advanceAmount,
        room: c.room,
        hotelInvoice: c.hotelInvoice,
        foodOrders: c.foodOrders,
      })),
    }
  })

  return NextResponse.json({ guests: enriched })
}
