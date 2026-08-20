import { db } from '@/lib/db'
import { RoomServiceOrder } from '@/components/pos/room-service-order'

// Public page — accessible without login.
// Guests scan the QR code in their room to view the menu AND place orders directly.
// Orders appear in the Kitchen + Orders tabs as "Room Service" orders.
export default async function PublicMenuPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  const [room, items, config] = await Promise.all([
    db.room.findUnique({ where: { id: roomId } }),
    db.menuItem.findMany({ where: { available: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    db.hotelConfig.findUnique({ where: { id: 'main' } }),
  ])

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-800" style={{ fontFamily: 'Georgia, serif' }}>
            Room Not Found
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            The QR code you scanned is no longer valid. Please ask the front desk for assistance.
          </p>
        </div>
      </div>
    )
  }

  const hotelName = config?.name || 'Hotel Guruvayur Dham'
  const hotelPhone = config?.phone || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img src="/gvd-logo.webp" alt="GVD" className="h-10 w-14 object-contain" />
              <div>
                <h1 className="text-lg font-bold leading-tight" style={{ color: '#B22222', fontFamily: 'Georgia, serif' }}>
                  {hotelName.toUpperCase()}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  Room {room.number} · {room.type} · Room Service Menu
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Tap + to add</p>
              <p className="text-[10px] text-muted-foreground">Order from your phone!</p>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="bg-amber-100 border-b border-amber-200">
        <div className="max-w-2xl mx-auto px-4 py-3 text-center">
          <p className="text-sm font-medium text-amber-900">
            🍽️ Welcome to Room {room.number}!
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Browse the menu below, tap + to add items, then place your order.
            It will be delivered to your room.
          </p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-3">
        <RoomServiceOrder
          roomId={roomId}
          room={{ id: room.id, number: room.number, type: room.type }}
          menu={items}
          config={{
            name: hotelName,
            phone: hotelPhone,
            cgstRate: config?.cgstRate ?? 9,
            sgstRate: config?.sgstRate ?? 9,
          }}
        />
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
