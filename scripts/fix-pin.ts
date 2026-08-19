import { db } from '@/lib/db'

async function main() {
  const all = await db.hotelConfig.findMany()
  console.log('Total HotelConfig rows:', all.length)
  all.forEach((c, i) => {
    console.log(`Row ${i}: id=${c.id} posPin=${c.posPin} name=${c.name}`)
  })
  // Delete duplicates — keep the one with posPin set
  if (all.length > 1) {
    // Keep the last one (most recently updated), delete others
    const keep = all[all.length - 1]
    for (const c of all) {
      if (c.id !== keep.id) {
        console.log(`Deleting duplicate: id=${c.id}`)
        await db.hotelConfig.delete({ where: { id: c.id } })
      }
    }
    // Also ensure the kept one has posPin set
    if (!keep.posPin) {
      await db.hotelConfig.update({ where: { id: keep.id }, data: { posPin: '1234' } })
    }
    console.log('Cleanup done.')
  }
  // final check
  const final = await db.hotelConfig.findUnique({ where: { id: 'main' } })
  console.log('Final:', final)
}
main().catch(console.error).finally(() => db.$disconnect())
