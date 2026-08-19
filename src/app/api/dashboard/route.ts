import { NextResponse } from 'next/server'
import { db, ensureSeeded } from '@/lib/db'

// GET /api/dashboard — overview stats
export async function GET() {
  await ensureSeeded()
  const totalRooms = await db.room.count()
  const occupied = await db.room.count({ where: { status: 'occupied' } })
  const available = await db.room.count({ where: { status: 'available' } })
  const cleaning = await db.room.count({ where: { status: 'cleaning' } })
  const maintenance = await db.room.count({ where: { status: 'maintenance' } })

  const activeCheckIns = await db.checkIn.count({ where: { status: 'active' } })

  // today's revenue (based on invoice createdAt date)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const todayHotelInvoices = await db.hotelInvoice.findMany({
    where: { createdAt: { gte: startOfToday, lte: endOfToday } },
  })
  const todayFoodInvoices = await db.foodInvoice.findMany({
    where: { createdAt: { gte: startOfToday, lte: endOfToday } },
  })

  const hotelRevenueToday = todayHotelInvoices.reduce((s, i) => s + i.grandTotal, 0)
  const foodRevenueToday = todayFoodInvoices.reduce((s, i) => s + i.grandTotal, 0)

  const pendingOrders = await db.foodOrder.count({
    where: { status: { in: ['pending', 'preparing'] } },
  })

  const recentInvoices = await Promise.all([
    db.hotelInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    db.foodInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  return NextResponse.json({
    rooms: { total: totalRooms, occupied, available, cleaning, maintenance },
    activeCheckIns,
    revenue: { hotelToday: hotelRevenueToday, foodToday: foodRevenueToday, totalToday: hotelRevenueToday + foodRevenueToday },
    pendingOrders,
    recentHotelInvoices: recentInvoices[0],
    recentFoodInvoices: recentInvoices[1],
  })
}
