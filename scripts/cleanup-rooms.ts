import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Delete all rooms that don't have a numeric number (101-208 pattern)
// First delete any check-ins, orders, invoices referencing those rooms
async function main() {
  const allRooms = await db.room.findMany()
  const badRooms = allRooms.filter(r => !/^\d{3}$/.test(r.number))
  console.log('Bad rooms to delete:', badRooms.map(r => `${r.number} (${r.id})`))

  for (const room of badRooms) {
    // Delete in order: invoices → food orders → check-ins → reservations → room
    // 1. Find all check-ins for this room
    const checkIns = await db.checkIn.findMany({ where: { roomId: room.id }, select: { id: true } })
    for (const ci of checkIns) {
      // Delete hotel invoices referencing this check-in
      await db.hotelInvoice.deleteMany({ where: { checkInId: ci.id } })
      // Delete food orders + their items referencing this check-in
      const foodOrders = await db.foodOrder.findMany({ where: { checkInId: ci.id }, select: { id: true } })
      for (const fo of foodOrders) {
        await db.foodInvoice.deleteMany({ where: { orderId: fo.id } })
        await db.foodOrderItem.deleteMany({ where: { orderId: fo.id } })
        await db.foodOrder.delete({ where: { id: fo.id } })
      }
      // Now safe to delete the check-in
      await db.checkIn.delete({ where: { id: ci.id } })
    }
    // Delete reservations
    await db.reservation.deleteMany({ where: { roomId: room.id } })
    // Now delete the room
    await db.room.delete({ where: { id: room.id } })
    console.log(`✓ Deleted room: ${room.number}`)
  }

  // Verify — should be exactly 15 rooms
  const remaining = await db.room.findMany({ orderBy: { number: 'asc' }, select: { number: true, type: true } })
  console.log(`\n✅ Remaining rooms: ${remaining.length}`)
  remaining.forEach(r => console.log(`  ${r.number}: ${r.type}`))
}

main().catch(console.error).finally(() => db.$disconnect())
