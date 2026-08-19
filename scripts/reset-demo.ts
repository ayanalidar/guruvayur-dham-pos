import { db } from '@/lib/db'

// Reset demo data — clear all transactions, keep config + rooms + menu
async function main() {
  console.log('🧹 Clearing old transactions...')

  await db.foodInvoice.deleteMany()
  await db.hotelInvoice.deleteMany()
  await db.foodOrderItem.deleteMany()
  await db.foodOrder.deleteMany()
  await db.checkIn.deleteMany()
  // Reset all rooms to available
  await db.room.updateMany({ data: { status: 'available' } })

  console.log('✓ Cleared invoices, orders, check-ins')
  console.log('✓ All rooms reset to available')

  const rooms = await db.room.count()
  const menu = await db.menuItem.count()
  console.log(`✓ ${rooms} rooms, ${menu} menu items remain`)
}

main().catch(console.error).finally(() => db.$disconnect())
