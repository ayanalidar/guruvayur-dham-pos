import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/menu/[id] — delete a menu item (only if not referenced in orders)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // check if any order items reference this menu item
  const usageCount = await db.foodOrderItem.count({ where: { menuItemId: id } })
  if (usageCount > 0) {
    // soft delete — just mark unavailable to preserve history
    const item = await db.menuItem.update({ where: { id }, data: { available: false } })
    return NextResponse.json({
      item,
      softDeleted: true,
      message: 'Item is referenced in past orders — marked as unavailable instead of deleting.',
    })
  }
  await db.menuItem.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
