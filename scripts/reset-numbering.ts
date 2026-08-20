import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Delete all existing invoices and orders so numbering restarts from 1
  console.log('🧹 Clearing all transactions to reset numbering...')

  await db.foodInvoice.deleteMany()
  console.log('✓ Deleted all food invoices')

  await db.hotelInvoice.deleteMany()
  console.log('✓ Deleted all hotel invoices')

  await db.foodOrderItem.deleteMany()
  console.log('✓ Deleted all food order items')

  await db.foodOrder.deleteMany()
  console.log('✓ Deleted all food orders')

  // Check in any active check-ins so rooms are free
  await db.checkIn.updateMany({
    where: { status: 'active' },
    data: { status: 'checked_out', checkOutAt: new Date() },
  })
  console.log('✓ Checked out all active guests')

  // Reset all rooms to available
  await db.room.updateMany({ data: { status: 'available' } })
  console.log('✓ All rooms reset to available')

  console.log('\n✅ Database is clean — next invoice will be HOT-2026-0001, next order ORD-2026-0001')
}

main().catch(console.error).finally(() => db.$disconnect())
