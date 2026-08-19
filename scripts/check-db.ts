import { db } from '@/lib/db'

async function main() {
  const hotelInvoices = await db.hotelInvoice.findMany()
  console.log('HotelInvoice count:', hotelInvoices.length)
  hotelInvoices.forEach(i => console.log(' -', i.invoiceNumber, i.guestName, '₹' + i.grandTotal, 'created', i.createdAt))

  const foodInvoices = await db.foodInvoice.findMany()
  console.log('FoodInvoice count:', foodInvoices.length)
  foodInvoices.forEach(i => console.log(' -', i.invoiceNumber, i.customerName, '₹' + i.grandTotal))

  const checkIns = await db.checkIn.findMany({ include: { room: true, guest: true, hotelInvoice: true } })
  console.log('\nCheckIns count:', checkIns.length)
  checkIns.forEach(c => console.log(' - Room', c.room.number, c.guest.name, 'status:', c.status, 'has invoice:', !!c.hotelInvoice))

  const rooms = await db.room.findMany({ orderBy: { number: 'asc' } })
  console.log('\nRooms:', rooms.map(r => `${r.number}:${r.status}`).join(', '))
}

main().catch(console.error).finally(() => db.$disconnect())
