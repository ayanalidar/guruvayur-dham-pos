import { db } from '@/lib/db'
import { QrCode } from '@/components/pos/qr-code'
import Link from 'next/link'
import { ArrowLeft, Leaf, Drumstick } from 'lucide-react'

// Public page — accessible without login.
// Guests scan the QR code in their room to see the menu.
// URL: /menu/[roomId] — where roomId is the room's UUID.
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

  // Group by category
  const grouped = items.reduce((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m); return acc
  }, {} as Record<string, typeof items>)

  const hotelName = config?.name || 'Hotel Guruvayur Dham'
  const hotelPhone = config?.phone || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-200 sticky top-0 z-10 shadow-sm">
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
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Welcome banner */}
        <div className="rounded-xl border border-amber-200 bg-white p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            Welcome to Room <span className="font-bold text-red-800">{room.number}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Browse the menu below, then call the front desk to place your order.
          </p>
          {hotelPhone && (
            <a
              href={`tel:${hotelPhone.split(',')[0].trim()}`}
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-red-800 text-white text-sm font-semibold"
            >
              📞 Call to Order: {hotelPhone.split(',')[0].trim()}
            </a>
          )}
        </div>

        {/* Menu by category */}
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <section key={cat} className="mb-6">
            <h2 className="text-base font-bold mb-2 text-red-800" style={{ fontFamily: 'Georgia, serif' }}>
              {cat}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {items.map(m => (
                <div key={m.id} className="rounded-lg border border-amber-100 bg-white p-3 flex items-start justify-between gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border ${m.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                        {m.isVeg ? <Leaf className="h-2.5 w-2.5 text-emerald-500" /> : <Drumstick className="h-2.5 w-2.5 text-rose-500" />}
                      </span>
                      <p className="font-medium text-sm">{m.name}</p>
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{m.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">
                      {m.prepTime} min prep
                    </p>
                  </div>
                  <p className="font-semibold text-sm shrink-0" style={{ color: '#B22222' }}>
                    ₹{m.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-amber-200 text-center text-[10px] text-muted-foreground">
          <p>Menu prices are inclusive of taxes.</p>
          <p className="mt-1">© {hotelName} · Powered by GuardianX POS</p>
        </footer>
      </main>
    </div>
  )
}

// Server component — QrCode is client-only, so we need to mark the page as dynamic
export const dynamic = 'force-dynamic'
