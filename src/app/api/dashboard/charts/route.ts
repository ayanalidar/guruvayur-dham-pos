import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard/charts?days=7
// Returns aggregated data for dashboard charts:
//   - 7-day revenue trend (hotel + food per day)
//   - Room occupancy count per day
//   - Top 10 selling menu items (last 30 days)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = Math.min(Number(searchParams.get('days')) || 7, 30)

  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  // 1. Revenue trend — fetch all invoices in range, group by day
  const [hotelInvoices, foodInvoices] = await Promise.all([
    db.hotelInvoice.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, grandTotal: true },
    }),
    db.foodInvoice.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, grandTotal: true },
    }),
  ])

  // Build per-day buckets
  const revenueByDay: { date: string; label: string; hotel: number; food: number; total: number }[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    revenueByDay.push({ date: dateStr, label, hotel: 0, food: 0, total: 0 })
  }

  for (const inv of hotelInvoices) {
    const dateStr = inv.createdAt.toISOString().slice(0, 10)
    const bucket = revenueByDay.find(b => b.date === dateStr)
    if (bucket) {
      bucket.hotel += inv.grandTotal
      bucket.total += inv.grandTotal
    }
  }
  for (const inv of foodInvoices) {
    const dateStr = inv.createdAt.toISOString().slice(0, 10)
    const bucket = revenueByDay.find(b => b.date === dateStr)
    if (bucket) {
      bucket.food += inv.grandTotal
      bucket.total += inv.grandTotal
    }
  }

  // 2. Top selling items — fetch food order items in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentOrders = await db.foodOrder.findMany({
    where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'cancelled' } },
    include: { items: true },
  })

  const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const order of recentOrders) {
    for (const item of order.items) {
      itemCounts[item.name] = itemCounts[item.name] || { name: item.name, quantity: 0, revenue: 0 }
      itemCounts[item.name].quantity += item.quantity
      itemCounts[item.name].revenue += item.total
    }
  }
  const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 10)

  // 3. Room occupancy count per day
  const rooms = await db.room.count()
  const checkIns = await db.checkIn.findMany({
    where: {
      OR: [
        { checkInAt: { gte: startDate, lte: endDate } },
        { checkOutAt: { gte: startDate, lte: endDate } },
        { status: 'active' },
      ],
    },
    select: { roomId: true, checkInAt: true, checkOutAt: true },
  })

  const occupancyByDay: { date: string; occupied: number }[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    d.setHours(12, 0, 0, 0) // noon on that day
    const occupied = checkIns.filter(ci => {
      const ciDate = new Date(ci.checkInAt)
      const coDate = ci.checkOutAt ? new Date(ci.checkOutAt) : new Date()
      return ciDate <= d && coDate >= d
    }).length
    occupancyByDay.push({
      date: d.toISOString().slice(0, 10),
      occupied,
    })
  }

  return NextResponse.json({
    revenueTrend: revenueByDay,
    topItems,
    occupancyByDay,
    totalRooms: rooms,
  })
}
