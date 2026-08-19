import { db } from '@/lib/db'

async function main() {
  const cfg = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  console.log('Config:', cfg?.name, 'PIN:', cfg?.posPin, 'reviewLink:', cfg?.reviewLink)
  const rooms = await db.room.count()
  console.log('Rooms:', rooms)
  const menu = await db.menuItem.count()
  console.log('Menu items:', menu)
  const checkIns = await db.checkIn.count()
  console.log('Check-ins:', checkIns)
  const hotelInv = await db.hotelInvoice.count()
  console.log('Hotel invoices:', hotelInv)
  const foodInv = await db.foodInvoice.count()
  console.log('Food invoices:', foodInv)
}
main().catch(console.error).finally(() => db.$disconnect())
