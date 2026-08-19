'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Search, Users, Phone, Mail, MapPin, RefreshCw, Calendar, IndianRupee, BedDouble, Receipt } from 'lucide-react'
import { formatINR, formatDate, formatDateShort, apiFetch } from '@/lib/format'

type GuestCheckIn = {
  id: string; checkInAt: string; checkOutAt: string | null; status: string
  adults: number; children: number; advanceAmount: number
  room: { id: string; number: string; type: string }
  hotelInvoice: { id: string; invoiceNumber: string; grandTotal: number; createdAt: string } | null
  foodOrders: Array<{ id: string; orderNumber: string; grandTotal: number; createdAt: string }>
}

type Guest = {
  id: string; name: string; phone: string; email: string | null; address: string | null
  idProofType: string | null; idNumber: string | null
  createdAt: string; updatedAt: string
  stats: {
    totalStays: number
    totalRoomCharges: number
    totalFoodSpend: number
    totalSpend: number
    lastVisit: string
    roomsStayedIn: string[]
  }
  checkIns: GuestCheckIn[]
}

export function GuestsPanel() {
  const { toast } = useToast()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Guest | null>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const url = q ? `/api/guests?search=${encodeURIComponent(q)}` : '/api/guests'
      const d = await apiFetch<{ guests: Guest[] }>(url)
      setGuests(d.guests)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 350)
    return () => clearTimeout(t)
  }, [search, load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Customer Records</h2>
          <p className="text-sm text-muted-foreground">
            {guests.length} guest{guests.length !== 1 ? 's' : ''} · linked to their stay history
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(search)}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}
        </div>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {search ? `No guests matching "${search}"` : 'No guests yet. Check in a guest to see their records here.'}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border divide-y">
          {guests.map(g => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{g.name}</p>
                  {g.stats.totalStays > 1 && (
                    <Badge variant="secondary" className="text-[10px]">↻ {g.stats.totalStays} stays</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <Phone className="h-3 w-3" /> {g.phone}
                  {g.email && <><Mail className="h-3 w-3 ml-2" /> {g.email}</>}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Last visit: {formatDateShort(g.stats.lastVisit)}
                  {g.stats.roomsStayedIn.length > 0 && ` · Rooms: ${g.stats.roomsStayedIn.join(', ')}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatINR(g.stats.totalSpend)}</p>
                <p className="text-[10px] text-muted-foreground">total spend</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <GuestDetailDialog guest={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function GuestDetailDialog({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  if (!guest) return null

  return (
    <Dialog open={!!guest} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> {guest.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> {guest.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> {guest.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> {guest.address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ID Proof</p>
              <p className="font-medium">{guest.idProofType || '—'} {guest.idNumber ? `: ${guest.idNumber}` : ''}</p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Total Stays" value={String(guest.stats.totalStays)} icon={<BedDouble className="h-4 w-4" />} />
            <StatBox label="Room Charges" value={formatINR(guest.stats.totalRoomCharges)} icon={<IndianRupee className="h-4 w-4" />} />
            <StatBox label="Food Spend" value={formatINR(guest.stats.totalFoodSpend)} icon={<IndianRupee className="h-4 w-4" />} />
            <StatBox label="Total Spend" value={formatINR(guest.stats.totalSpend)} icon={<IndianRupee className="h-4 w-4" />} highlight />
          </div>

          {/* Stay history */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Stay History
            </h3>
            {guest.checkIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stays recorded.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {guest.checkIns.map(ci => (
                  <div key={ci.id} className="rounded-lg border p-3 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-medium">
                          Room {ci.room.number} <span className="text-muted-foreground">({ci.room.type})</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          In: {formatDateShort(ci.checkInAt)}
                          {ci.checkOutAt && ` · Out: ${formatDateShort(ci.checkOutAt)}`}
                        </p>
                      </div>
                      <Badge variant={ci.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {ci.status === 'active' ? 'Active' : ci.status === 'checked_out' ? 'Checked Out' : ci.status}
                      </Badge>
                    </div>
                    {ci.hotelInvoice && (
                      <p className="mt-1 flex items-center gap-1 text-emerald-700">
                        <Receipt className="h-3 w-3" /> Invoice {ci.hotelInvoice.invoiceNumber}: {formatINR(ci.hotelInvoice.grandTotal)}
                      </p>
                    )}
                    {ci.foodOrders.length > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        Food orders: {ci.foodOrders.length} · Total {formatINR(ci.foodOrders.reduce((s, o) => s + o.grandTotal, 0))}
                      </p>
                    )}
                    {ci.advanceAmount > 0 && (
                      <p className="mt-1 text-muted-foreground">Advance: {formatINR(ci.advanceAmount)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}
