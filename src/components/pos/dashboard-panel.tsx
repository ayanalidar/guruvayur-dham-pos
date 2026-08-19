'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bed, Utensils, Receipt, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { formatINR, formatDateShort, timeAgo, apiFetch } from '@/lib/format'

type DashboardData = {
  rooms: { total: number; occupied: number; available: number; cleaning: number; maintenance: number }
  activeCheckIns: number
  revenue: { hotelToday: number; foodToday: number; totalToday: number }
  pendingOrders: number
  recentHotelInvoices: any[]
  recentFoodInvoices: any[]
}

export function DashboardPanel({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const d = await apiFetch<DashboardData>('/api/dashboard')
        if (mounted) { setData(d); setLoading(false) }
      } catch (e) {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse h-32" />
        ))}
      </div>
    )
  }

  const occRate = data.rooms.total ? Math.round((data.rooms.occupied / data.rooms.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupied Rooms"
          value={`${data.rooms.occupied} / ${data.rooms.total}`}
          sub={`${occRate}% occupancy`}
          icon={<Bed className="h-5 w-5" />}
          accent="bg-amber-50 text-amber-700 border-amber-200"
        />
        <StatCard
          title="Active Check-ins"
          value={String(data.activeCheckIns)}
          sub="Guests in-house"
          icon={<Bed className="h-5 w-5" />}
          accent="bg-teal-50 text-teal-700 border-teal-200"
        />
        <StatCard
          title="Today's Revenue"
          value={formatINR(data.revenue.totalToday)}
          sub={`Hotel ${formatINR(data.revenue.hotelToday)} · Food ${formatINR(data.revenue.foodToday)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Pending Orders"
          value={String(data.pendingOrders)}
          sub="Kitchen queue"
          icon={<Clock className="h-5 w-5" />}
          accent="bg-rose-50 text-rose-700 border-rose-200"
        />
      </div>

      {/* Room status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RoomStatusPill label="Available" count={data.rooms.available} dot="bg-emerald-500" />
            <RoomStatusPill label="Occupied" count={data.rooms.occupied} dot="bg-rose-500" />
            <RoomStatusPill label="Cleaning" count={data.rooms.cleaning} dot="bg-amber-500" />
            <RoomStatusPill label="Maintenance" count={data.rooms.maintenance} dot="bg-slate-400" />
          </div>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => onNavigate('rooms')}>
            <Bed className="h-4 w-4 mr-2" /> Manage Rooms
          </Button>
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Recent Hotel Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentHotelInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hotel invoices yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentHotelInvoices.map((inv) => (
                  <li key={inv.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Room {inv.roomNumber} · {inv.guestName} · {formatDateShort(inv.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono">{formatINR(inv.grandTotal)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-3" size="sm" variant="ghost" onClick={() => onNavigate('invoices')}>
              View all invoices →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4" /> Recent Food Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentFoodInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No food invoices yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentFoodInvoices.map((inv) => (
                  <li key={inv.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.customerName} · {timeAgo(inv.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono">{formatINR(inv.grandTotal)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-3" size="sm" variant="ghost" onClick={() => onNavigate('invoices')}>
              View all invoices →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, icon, accent }: {
  title: string; value: string; sub: string; icon: React.ReactNode; accent: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`p-2 rounded-lg border ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function RoomStatusPill({ label, count, dot }: { label: string; count: number; dot: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{count}</p>
      </div>
    </div>
  )
}
