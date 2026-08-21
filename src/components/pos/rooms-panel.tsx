'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Bed, BedDouble, Users, Sparkles, Wrench, CheckCircle2, LogIn, LogOut, RefreshCw, Pencil, Utensils, CalendarClock, QrCode as QrIcon, Printer, UserPlus } from 'lucide-react'
import { formatINR, formatDateShort, formatDate, apiFetch } from '@/lib/format'
import { QrCode } from './qr-code'

type Room = {
  id: string; number: string; floor: number; type: string; ratePerNight: number
  bedType: string; capacity: number; status: string; notes?: string | null
  checkIns: Array<{
    id: string; checkInAt: string; expectedCheckOut: string | null; advanceAmount: number
    adults: number; children: number
    guest: { id: string; name: string; phone: string; email: string | null }
  }>
}

export function RoomsPanel({ onOrderFoodForCheckIn }: { onOrderFoodForCheckIn?: (checkInId: string, roomNumber: string, guestName: string) => void }) {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [extendStayOpen, setExtendStayOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ rooms: Room[] }>('/api/rooms')
      setRooms(d.rooms)
    } catch (e: any) {
      toast({ title: 'Failed to load rooms', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const d = await apiFetch<{ rooms: Room[] }>('/api/rooms')
        if (active) { setRooms(d.rooms); setLoading(false) }
      } catch (e: any) {
        if (active) { toast({ title: 'Failed to load rooms', description: e.message, variant: 'destructive' }); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [toast])

  async function updateRoomStatus(room: Room, status: string) {
    try {
      await apiFetch('/api/rooms', {
        method: 'PATCH',
        body: JSON.stringify({ roomId: room.id, status }),
      })
      toast({ title: `Room ${room.number} → ${status}` })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  function handleEditRoom(room: Room) {
    setSelectedRoom(room)
    setEditOpen(true)
  }

  function handleOrderFood(room: Room) {
    const ci = room.checkIns[0]
    if (!ci) {
      toast({ title: 'Room is not occupied', variant: 'destructive' }); return
    }
    if (!onOrderFoodForCheckIn) {
      toast({ title: 'Order food not available', description: 'Kitchen tab not wired up', variant: 'destructive' })
      return
    }
    onOrderFoodForCheckIn(ci.id, room.number, ci.guest.name)
  }

  function handleExtendStay(room: Room) {
    const ci = room.checkIns[0]
    if (!ci) {
      toast({ title: 'Room is not occupied', variant: 'destructive' }); return
    }
    setSelectedRoom(room)
    setExtendStayOpen(true)
  }

  function handleShowQR(room: Room) {
    setSelectedRoom(room)
    setQrOpen(true)
  }

  const floor1 = rooms.filter(r => r.floor === 1)
  const floor2 = rooms.filter(r => r.floor === 2)

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">{Array.from({ length: 15 }).map((_, i) => <Card key={i} className="animate-pulse h-32" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rooms</h2>
          <p className="text-sm text-muted-foreground">
            {rooms.length} rooms · {rooms.filter(r => r.status === 'available').length} available · {rooms.filter(r => r.status === 'occupied').length} occupied
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setWalkInOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Walk-in Check-in
          </Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <FloorBlock title="First Floor" subtitle="Standard & Deluxe" rooms={floor1}
        onSelect={setSelectedRoom} onCheckIn={(r) => { setSelectedRoom(r); setCheckInOpen(true) }}
        onCheckout={(r) => { setSelectedRoom(r); setCheckoutOpen(true) }}
        onStatusChange={updateRoomStatus}
        onEdit={handleEditRoom}
        onOrderFood={handleOrderFood}
        onExtendStay={handleExtendStay}
        onShowQR={handleShowQR} />

      <FloorBlock title="Second Floor" subtitle="Deluxe & Suite" rooms={floor2}
        onSelect={setSelectedRoom} onCheckIn={(r) => { setSelectedRoom(r); setCheckInOpen(true) }}
        onCheckout={(r) => { setSelectedRoom(r); setCheckoutOpen(true) }}
        onStatusChange={updateRoomStatus}
        onEdit={handleEditRoom}
        onOrderFood={handleOrderFood}
        onExtendStay={handleExtendStay}
        onShowQR={handleShowQR} />

      <CheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        room={selectedRoom}
        onDone={() => { setCheckInOpen(false); load() }}
      />
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        room={selectedRoom}
        onDone={() => { setCheckoutOpen(false); load() }}
      />
      <EditRoomDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        room={selectedRoom}
        onDone={() => { setEditOpen(false); load() }}
      />
      <ExtendStayDialog
        open={extendStayOpen}
        onOpenChange={setExtendStayOpen}
        room={selectedRoom}
        onDone={() => { setExtendStayOpen(false); load() }}
      />
      <RoomQRDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        room={selectedRoom}
      />
      <WalkInDrawer
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        rooms={rooms}
        onDone={() => { setWalkInOpen(false); load() }}
      />
    </div>
  )
}

function FloorBlock({ title, subtitle, rooms, onSelect, onCheckIn, onCheckout, onStatusChange, onEdit, onOrderFood, onExtendStay, onShowQR }: {
  title: string; subtitle: string; rooms: Room[]
  onSelect: (r: Room) => void
  onCheckIn: (r: Room) => void
  onCheckout: (r: Room) => void
  onStatusChange: (r: Room, s: string) => void
  onEdit: (r: Room) => void
  onOrderFood: (r: Room) => void
  onExtendStay: (r: Room) => void
  onShowQR: (r: Room) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room}
            onCheckIn={() => onCheckIn(room)}
            onCheckout={() => onCheckout(room)}
            onStatusChange={(s) => onStatusChange(room, s)}
            onEdit={() => onEdit(room)}
            onOrderFood={() => onOrderFood(room)}
            onExtendStay={() => onExtendStay(room)}
            onShowQR={() => onShowQR(room)}
          />
        ))}
      </div>
    </div>
  )
}

const RoomCard = memo(function RoomCard({ room, onCheckIn, onCheckout, onStatusChange, onEdit, onOrderFood, onExtendStay, onShowQR }: {
  room: Room
  onCheckIn: () => void
  onCheckout: () => void
  onStatusChange: (s: string) => void
  onEdit: () => void
  onOrderFood?: () => void  // only when occupied
  onExtendStay?: () => void  // only when occupied
  onShowQR?: () => void  // optional — show QR code for room service menu
}) {
  const status = room.status
  const activeCheckIn = room.checkIns[0]

  const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
    available:   { label: 'Available',   cls: 'border-emerald-200 bg-emerald-50/50', dot: 'bg-emerald-500' },
    occupied:    { label: 'Occupied',     cls: 'border-rose-200 bg-rose-50/50',       dot: 'bg-rose-500' },
    cleaning:    { label: 'Cleaning',     cls: 'border-amber-200 bg-amber-50/50',     dot: 'bg-amber-500' },
    maintenance: { label: 'Maintenance',  cls: 'border-slate-300 bg-slate-100',       dot: 'bg-slate-500' },
  }
  const cfg = statusConfig[status] ?? statusConfig.available

  return (
    <Card className={`${cfg.cls} transition-shadow hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold leading-none">{room.number}</p>
            <p className="text-xs text-muted-foreground mt-1">{room.type}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs font-medium">{cfg.label}</span>
            {/* Edit room attributes (rate, type, bed, capacity) */}
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 ml-1 opacity-60 hover:opacity-100"
              onClick={onEdit}
              title="Edit room details"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {room.bedType}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.capacity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Rate</span>
            <span className="font-medium text-foreground">{formatINR(room.ratePerNight)}/night</span>
          </div>
        </div>

        {activeCheckIn && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <p className="text-sm font-medium truncate">{activeCheckIn.guest.name}</p>
            <p className="text-xs text-muted-foreground">{activeCheckIn.guest.phone}</p>
            <p className="text-xs text-muted-foreground mt-1">
              In: {formatDateShort(activeCheckIn.checkInAt)}
              {activeCheckIn.expectedCheckOut && ` · Out: ${formatDateShort(activeCheckIn.expectedCheckOut)}`}
            </p>
            {activeCheckIn.advanceAmount > 0 && (
              <p className="text-xs mt-1 text-emerald-700">Advance: {formatINR(activeCheckIn.advanceAmount)}</p>
            )}
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {status === 'available' && (
            <Button size="sm" className="w-full" onClick={onCheckIn}>
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> Check In
            </Button>
          )}
          {status === 'occupied' && activeCheckIn && (
            <>
              <Button size="sm" variant="destructive" className="w-full" onClick={onCheckout}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Check Out
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                {onOrderFood && (
                  <Button size="sm" variant="outline" onClick={onOrderFood}>
                    <Utensils className="h-3.5 w-3.5 mr-1" /> Food
                  </Button>
                )}
                {onExtendStay && (
                  <Button size="sm" variant="outline" onClick={onExtendStay}>
                    <CalendarClock className="h-3.5 w-3.5 mr-1" /> Extend
                  </Button>
                )}
              </div>
              {onShowQR && (
                <Button size="sm" variant="ghost" className="w-full text-xs" onClick={onShowQR}>
                  <QrIcon className="h-3 w-3 mr-1" /> Show Room Menu QR
                </Button>
              )}
            </>
          )}
          {status === 'cleaning' && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onStatusChange('available')}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Available
            </Button>
          )}
          {status === 'maintenance' && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onStatusChange('available')}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Available
            </Button>
          )}
          {(status === 'available' || status === 'cleaning') && (
            <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => onStatusChange('maintenance')}>
              <Wrench className="h-3 w-3 mr-1" /> Mark Maintenance
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

function CheckInDialog({ open, onOpenChange, room, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: Room | null; onDone: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    guestName: '', phone: '', email: '', address: '',
    idProofType: 'Aadhaar', idNumber: '',
    adults: 2, children: 0, advanceAmount: 0,
    expectedCheckOut: '', notes: '',
  })
  // Returning-guest detection
  const [returningGuest, setReturningGuest] = useState<{
    found: boolean
    guest?: {
      id: string; name: string; phone: string; email: string | null; address: string | null
      idProofType: string | null; idNumber: string | null
      totalStays: number; lastVisit: string; lastRoom: string | null; roomsStayedIn: string[]
    }
  } | null>(null)
  const [checkingGuest, setCheckingGuest] = useState(false)

  useEffect(() => {
    if (open) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(11, 0, 0, 0)
      setForm({
        guestName: '', phone: '', email: '', address: '',
        idProofType: 'Aadhaar', idNumber: '',
        adults: 2, children: 0, advanceAmount: 0,
        expectedCheckOut: tomorrow.toISOString().slice(0, 16),
        notes: '',
      })
      setReturningGuest(null)
    }
  }, [open, room])

  // Debounced lookup when phone number changes (length >= 4)
  useEffect(() => {
    if (!form.phone || form.phone.replace(/\D/g, '').length < 4) {
      setReturningGuest(null)
      return
    }
    setCheckingGuest(true)
    const t = setTimeout(async () => {
      try {
        const d = await apiFetch<{ found: boolean; guest?: any }>(`/api/guests/lookup?phone=${encodeURIComponent(form.phone)}`)
        setReturningGuest(d as any)
        if (d.found && d.guest) {
          // Auto-fill form fields from existing guest record
          setForm(prev => ({
            ...prev,
            guestName: prev.guestName || d.guest.name,
            email: prev.email || d.guest.email || '',
            address: prev.address || d.guest.address || '',
            idProofType: prev.idProofType !== 'Aadhaar' ? prev.idProofType : (d.guest.idProofType || 'Aadhaar'),
            idNumber: prev.idNumber || d.guest.idNumber || '',
          }))
        }
      } catch {
        setReturningGuest(null)
      } finally {
        setCheckingGuest(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [form.phone])

  async function submit() {
    if (!room) return
    if (!form.guestName.trim() || !form.phone.trim()) {
      toast({ title: 'Guest name and phone are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/checkins', {
        method: 'POST',
        body: JSON.stringify({
          roomId: room.id,
          guestName: form.guestName.trim(),
          phone: form.phone.trim(),
          email: form.email || undefined,
          address: form.address || undefined,
          idProofType: form.idProofType,
          idNumber: form.idNumber || undefined,
          adults: Number(form.adults) || 1,
          children: Number(form.children) || 0,
          advanceAmount: Number(form.advanceAmount) || 0,
          expectedCheckOut: form.expectedCheckOut ? new Date(form.expectedCheckOut).toISOString() : undefined,
          notes: form.notes || undefined,
        }),
      })
      toast({ title: `Checked in to Room ${room.number}`, description: `Guest: ${form.guestName}` })
      onDone()
    } catch (e: any) {
      toast({ title: 'Check-in failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" /> Check In — Room {room.number}
          </DialogTitle>
          <DialogDescription>
            {room.type} · {room.bedType} · {formatINR(room.ratePerNight)}/night
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Guest Name *">
              <Input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label="Phone *">
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
            </Field>
          </div>

          {/* Returning-guest detection banner */}
          {checkingGuest && (
            <p className="text-xs text-muted-foreground animate-pulse">Checking guest records...</p>
          )}
          {returningGuest?.found && returningGuest.guest && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs">
              <p className="font-semibold text-emerald-800 flex items-center gap-2">
                ↻ Returning Guest · {returningGuest.guest.totalStays} previous stay(s)
              </p>
              <p className="text-emerald-700 mt-0.5">
                Last visited: {formatDateShort(returningGuest.guest.lastVisit)}
                {returningGuest.guest.lastRoom && ` · Last room: ${returningGuest.guest.lastRoom}`}
              </p>
              {returningGuest.guest.roomsStayedIn.length > 0 && (
                <p className="text-emerald-700 mt-0.5">
                  Rooms stayed in: {returningGuest.guest.roomsStayedIn.join(', ')}
                </p>
              )}
              <p className="text-[10px] text-emerald-600 mt-1 italic">
                Form fields auto-filled from existing records — review and edit if needed.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Email (optional)">
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address (optional)">
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="ID Proof Type">
              <Select value={form.idProofType} onValueChange={v => setForm({ ...form, idProofType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                  <SelectItem value="Voter ID">Voter ID</SelectItem>
                  <SelectItem value="PAN">PAN</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="ID Number">
              <Input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
            </Field>
            <Field label="Expected Check-out">
              <Input type="datetime-local" value={form.expectedCheckOut} onChange={e => setForm({ ...form, expectedCheckOut: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Adults">
              <Input type="number" min={1} value={form.adults} onChange={e => setForm({ ...form, adults: Number(e.target.value) })} />
            </Field>
            <Field label="Children">
              <Input type="number" min={0} value={form.children} onChange={e => setForm({ ...form, children: Number(e.target.value) })} />
            </Field>
            <Field label="Advance Paid (₹)">
              <Input type="number" min={0} value={form.advanceAmount} onChange={e => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special requests, etc." />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Checking in...' : 'Confirm Check-In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckoutDialog({ open, onOpenChange, room, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: Room | null; onDone: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [extraCharges, setExtraCharges] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [summary, setSummary] = useState<any>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  // Editable GST rates — default 9% each (configurable in Settings)
  const [cgstRate, setCgstRate] = useState(9)
  const [sgstRate, setSgstRate] = useState(9)
  const [igstRate, setIgstRate] = useState(0) // 0 = use CGST+SGST, >0 = inter-state

  useEffect(() => {
    if (open && room) {
      setDiscount(0); setExtraCharges(0); setPaymentMethod('Cash'); setSummary(null)
      setCgstRate(9); setSgstRate(9); setIgstRate(0) // Reset to default on open
      // fetch summary + current tax rates from config
      setLoadingSummary(true)
      Promise.all([
        apiFetch<{ checkIns: any[] }>(`/api/checkins?status=active`),
        apiFetch<{ config: any }>(`/api/config`),
      ]).then(([d, cfg]) => {
        // Set tax rates from hotel config
        if (cfg.config?.cgstRate) setCgstRate(cfg.config.cgstRate)
        if (cfg.config?.sgstRate) setSgstRate(cfg.config.sgstRate)
        const ci = d.checkIns.find(c => c.roomId === room.id)
        if (ci) {
          const nights = Math.max(1, Math.ceil((Date.now() - new Date(ci.checkInAt).getTime()) / 86400000))
          const roomCharges = nights * room.ratePerNight
          const foodCharges = (ci.foodOrders || []).reduce((s: number, o: any) => s + o.grandTotal, 0)
          const total = roomCharges + foodCharges
          setSummary({ checkIn: ci, nights, roomCharges, foodCharges, total, advance: ci.advanceAmount, balance: Math.max(0, total - ci.advanceAmount) })
        }
      }).finally(() => setLoadingSummary(false))
    }
  }, [open, room])

  async function submit() {
    if (!room) return
    setSubmitting(true)
    try {
      const r = await apiFetch<{ invoice: any; grandTotal: number; balanceDue: number }>(
        `/api/checkins/${summary.checkIn.id}/checkout`,
        {
          method: 'POST',
          body: JSON.stringify({
            generateInvoice: true,
            paymentMethod,
            discount: Number(discount) || 0,
            extraCharges: Number(extraCharges) || 0,
            cgstRate: Number(cgstRate) || 0,
            sgstRate: Number(sgstRate) || 0,
            igstRate: Number(igstRate) || 0,
          }),
        }
      )
      toast({
        title: `Checked out of Room ${room.number}`,
        description: `Invoice ${r.invoice?.invoiceNumber} · Total ${formatINR(r.grandTotal)} · Balance ${formatINR(r.balanceDue)}`,
      })
      onDone()
    } catch (e: any) {
      toast({ title: 'Checkout failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room || !summary) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out — Room {room?.number}</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-sm text-muted-foreground">
            {loadingSummary ? 'Loading stay summary...' : 'No active check-in found for this room.'}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const taxableAmount = Math.max(0, summary.total + Number(extraCharges) - Number(discount))
  // If IGST > 0, use IGST only (inter-state). Otherwise CGST+SGST (intra-state).
  const useIgst = Number(igstRate) > 0
  const cgst = useIgst ? 0 : Math.round(taxableAmount * (Number(cgstRate) || 0)) / 100
  const sgst = useIgst ? 0 : Math.round(taxableAmount * (Number(sgstRate) || 0)) / 100
  const igst = useIgst ? Math.round(taxableAmount * (Number(igstRate) || 0)) / 100 : 0
  const grandTotal = taxableAmount + cgst + sgst + igst
  const balance = Math.max(0, grandTotal - summary.advance)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" /> Check Out — Room {room.number}
          </DialogTitle>
          <DialogDescription>
            {summary.checkIn.guest.name} · In: {formatDate(summary.checkIn.checkInAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nights</span>
              <span className="font-medium">{summary.nights}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room Charges</span>
              <span className="font-medium">{formatINR(summary.roomCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Food Charges (room account)</span>
              <span className="font-medium">{formatINR(summary.foodCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatINR(summary.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Extra Charges (₹)">
              <Input type="number" min={0} value={extraCharges} onChange={e => setExtraCharges(Number(e.target.value))} />
            </Field>
            <Field label="Discount (₹)">
              <Input type="number" min={0} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Payment Method">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Final total with editable GST */}
          <div className="rounded-lg border bg-primary/5 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>Taxable Amount</span><span className="font-mono">{formatINR(taxableAmount)}</span>
            </div>
            {/* IGST (inter-state) — if >0, CGST/SGST are zeroed */}
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5">
                IGST
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={igstRate}
                  onChange={e => setIgstRate(Number(e.target.value) || 0)}
                  className="h-5 w-14 text-xs font-mono px-1"
                  placeholder="0"
                />
                %
                <span className="text-[10px]">(inter-state)</span>
              </span>
              <span className="font-mono">{formatINR(igst)}</span>
            </div>
            {/* CGST — editable rate (only if IGST is 0) */}
            {!useIgst && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  CGST
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={cgstRate}
                    onChange={e => setCgstRate(Number(e.target.value) || 0)}
                    className="h-5 w-14 text-xs font-mono px-1"
                  />
                  %
                </span>
                <span className="font-mono">{formatINR(cgst)}</span>
              </div>
            )}
            {/* SGST — editable rate (only if IGST is 0) */}
            {!useIgst && (
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  SGST
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={sgstRate}
                    onChange={e => setSgstRate(Number(e.target.value) || 0)}
                    className="h-5 w-14 text-xs font-mono px-1"
                  />
                  %
                </span>
                <span className="font-mono">{formatINR(sgst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <span>Grand Total</span><span className="font-mono">{formatINR(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Advance Paid</span><span className="font-mono">- {formatINR(summary.advance)}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Balance Due</span><span className="font-mono text-primary">{formatINR(balance)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            On confirm, a <strong>Hotel Invoice</strong> will be generated automatically. The room will be marked as &quot;Cleaning&quot;.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Checking out...' : 'Confirm Check-Out & Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

// ====== Edit Room Dialog — edit rate, type, bed, capacity, status ======
function EditRoomDialog({ open, onOpenChange, room, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: Room | null; onDone: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    number: '', floor: 1, type: 'Standard', ratePerNight: 1500,
    bedType: 'Double', capacity: 2, status: 'available', notes: '',
  })

  useEffect(() => {
    if (open && room) {
      setForm({
        number: room.number,
        floor: room.floor,
        type: room.type,
        ratePerNight: room.ratePerNight,
        bedType: room.bedType,
        capacity: room.capacity,
        status: room.status,
        notes: room.notes || '',
      })
    }
  }, [open, room])

  async function submit() {
    if (!room) return
    if (!form.number.trim()) {
      toast({ title: 'Room number cannot be empty', variant: 'destructive' }); return
    }
    setSubmitting(true)
    try {
      await apiFetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          number: form.number.trim(),
          floor: Number(form.floor),
          type: form.type,
          ratePerNight: Number(form.ratePerNight),
          bedType: form.bedType,
          capacity: Number(form.capacity),
          status: form.status,
          notes: form.notes || null,
        }),
      })
      toast({ title: `Room ${form.number} updated` })
      onDone()
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Room {room.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room Number">
              <Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </Field>
            <Field label="Floor">
              <Input type="number" min={1} max={10} value={form.floor} onChange={e => setForm({ ...form, floor: Number(e.target.value) })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Room Type">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Twin Bedroom">Twin Bedroom</SelectItem>
                  <SelectItem value="Deluxe Bedroom">Deluxe Bedroom</SelectItem>
                  <SelectItem value="Family Room">Family Room</SelectItem>
                  <SelectItem value="Superior">Superior</SelectItem>
                  <SelectItem value="GVD Suite">GVD Suite</SelectItem>
                  <SelectItem value="Standard">Standard (legacy)</SelectItem>
                  <SelectItem value="Deluxe">Deluxe (legacy)</SelectItem>
                  <SelectItem value="Suite">Suite (legacy)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Bed Type">
              <Select value={form.bedType} onValueChange={v => setForm({ ...form, bedType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Twin">Twin</SelectItem>
                  <SelectItem value="King">King</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate per Night (₹)">
              <Input type="number" min={0} step="50" value={form.ratePerNight} onChange={e => setForm({ ...form, ratePerNight: Number(e.target.value) })} />
            </Field>
            <Field label="Capacity (guests)">
              <Input type="number" min={1} max={10} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Status">
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes (optional)">
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. AC not working, room needs painting" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====== Extend Stay / Modify Stay Dialog ======
function ExtendStayDialog({ open, onOpenChange, room, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: Room | null; onDone: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [newCheckOut, setNewCheckOut] = useState('')
  const [additionalAdvance, setAdditionalAdvance] = useState(0)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)

  useEffect(() => {
    if (open && room) {
      const ci = room.checkIns[0]
      if (ci) {
        // Default new checkout = existing expected checkout + 1 day, or tomorrow + 1 day
        const base = ci.expectedCheckOut ? new Date(ci.expectedCheckOut) : new Date(Date.now() + 86400000)
        base.setDate(base.getDate() + 1)
        setNewCheckOut(base.toISOString().slice(0, 16))
        setAdults(ci.adults)
        setChildren(ci.children)
        setAdditionalAdvance(0)
      }
    }
  }, [open, room])

  async function submit() {
    if (!room) return
    const ci = room.checkIns[0]
    if (!ci) return

    setSubmitting(true)
    try {
      await apiFetch(`/api/checkins/${ci.id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({
          expectedCheckOut: newCheckOut ? new Date(newCheckOut).toISOString() : undefined,
          adults: Number(adults),
          children: Number(children),
          additionalAdvance: Number(additionalAdvance) || 0,
        }),
      })
      toast({ title: 'Stay extended', description: `New checkout: ${formatDateShort(newCheckOut)}` })
      onDone()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room) return null
  const ci = room.checkIns[0]
  if (!ci) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Extend / Modify Stay — Room {room.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p><span className="text-muted-foreground">Guest:</span> <strong>{ci.guest.name}</strong></p>
            <p><span className="text-muted-foreground">Current check-in:</span> {formatDateShort(ci.checkInAt)}</p>
            <p><span className="text-muted-foreground">Current checkout:</span> {ci.expectedCheckOut ? formatDateShort(ci.expectedCheckOut) : '—'}</p>
            <p><span className="text-muted-foreground">Advance paid:</span> {formatINR(ci.advanceAmount)}</p>
          </div>

          <Field label="New Check-out Date & Time">
            <Input type="datetime-local" value={newCheckOut} onChange={e => setNewCheckOut(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Adults">
              <Input type="number" min={1} value={adults} onChange={e => setAdults(Number(e.target.value))} />
            </Field>
            <Field label="Children">
              <Input type="number" min={0} value={children} onChange={e => setChildren(Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Additional Advance (₹)">
            <Input type="number" min={0} value={additionalAdvance} onChange={e => setAdditionalAdvance(Number(e.target.value))} />
          </Field>

          <p className="text-xs text-muted-foreground italic">
            For early checkout, set the new checkout date to an earlier time. The hotel invoice (when generated at checkout) will use this updated date.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Update Stay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====== Room QR Code Dialog — for room service menu ======
function RoomQRDialog({ open, onOpenChange, room }: {
  open: boolean; onOpenChange: (v: boolean) => void; room: Room | null
}) {
  if (!room) return null

  // Build the public menu URL for this room
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const menuUrl = `${origin}/menu/${room.id}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrIcon className="h-4 w-4" /> Room {room.number} — Menu QR Code
          </DialogTitle>
          <DialogDescription>
            Display this QR code in the room. Guests scan it with their phone to view the menu and place orders directly — orders appear instantly in the Kitchen and Orders tabs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div className="p-4 bg-white border rounded-lg">
            <QrCode value={menuUrl} size={240} alt={`Menu QR for Room ${room.number}`} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center break-all">
            {menuUrl}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(menuUrl)
              // Toast via parent — simple alert for now
              alert('URL copied to clipboard')
            }}
          >
            Copy URL
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====== Walk-in Drawer — quick check-in for walk-in customers ======
function WalkInDrawer({ open, onOpenChange, rooms, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; rooms: Room[]; onDone: () => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const availableRooms = rooms.filter(r => r.status === 'available')
  const [returningGuest, setReturningGuest] = useState<any>(null)
  const [checkingGuest, setCheckingGuest] = useState(false)
  const [form, setForm] = useState({
    guestName: '', phone: '', email: '', address: '',
    idProofType: 'Aadhaar', idNumber: '',
    adults: 2, children: 0, advanceAmount: 0,
    expectedCheckOut: '', notes: '', roomId: '',
  })

  useEffect(() => {
    if (open) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(11, 0, 0, 0)
      setForm({
        guestName: '', phone: '', email: '', address: '',
        idProofType: 'Aadhaar', idNumber: '',
        adults: 2, children: 0, advanceAmount: 0,
        expectedCheckOut: tomorrow.toISOString().slice(0, 16),
        notes: '', roomId: '',
      })
      setReturningGuest(null)
    }
  }, [open])

  // Debounced phone lookup for returning guest detection
  useEffect(() => {
    if (!form.phone || form.phone.replace(/\D/g, '').length < 4) {
      setReturningGuest(null)
      return
    }
    setCheckingGuest(true)
    const t = setTimeout(async () => {
      try {
        const d = await apiFetch<{ found: boolean; guest?: any }>(`/api/guests/lookup?phone=${encodeURIComponent(form.phone)}`)
        setReturningGuest(d as any)
        if (d.found && d.guest) {
          setForm(prev => ({
            ...prev,
            guestName: prev.guestName || d.guest.name,
            email: prev.email || d.guest.email || '',
            address: prev.address || d.guest.address || '',
            idProofType: prev.idProofType !== 'Aadhaar' ? prev.idProofType : (d.guest.idProofType || 'Aadhaar'),
            idNumber: prev.idNumber || d.guest.idNumber || '',
          }))
        }
      } catch { setReturningGuest(null) }
      finally { setCheckingGuest(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [form.phone])

  async function submit() {
    if (!form.guestName.trim() || !form.phone.trim() || !form.roomId) {
      toast({ title: 'Guest name, phone, and room are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/checkins', {
        method: 'POST',
        body: JSON.stringify({
          roomId: form.roomId,
          guestName: form.guestName.trim(),
          phone: form.phone.trim(),
          email: form.email || undefined,
          address: form.address || undefined,
          idProofType: form.idProofType,
          idNumber: form.idNumber || undefined,
          adults: Number(form.adults) || 1,
          children: Number(form.children) || 0,
          advanceAmount: Number(form.advanceAmount) || 0,
          expectedCheckOut: form.expectedCheckOut ? new Date(form.expectedCheckOut).toISOString() : undefined,
          notes: form.notes || undefined,
        }),
      })
      const room = availableRooms.find(rm => rm.id === form.roomId)
      toast({
        title: `Checked in to Room ${room?.number}`,
        description: `Guest: ${form.guestName}`,
      })
      onDone()
    } catch (e: any) {
      toast({ title: 'Check-in failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Walk-in Check-in
          </DrawerTitle>
          <DrawerDescription>
            Quick check-in for walk-in customers. {availableRooms.length} rooms available.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4 max-w-2xl mx-auto w-full">
          {/* Room selection first */}
          <div className="space-y-2 mb-4">
            <Label className="text-xs font-semibold">Select Available Room *</Label>
            {availableRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 rounded border bg-muted/30">
                No rooms available. All rooms are occupied or under maintenance.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableRooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setForm({ ...form, roomId: r.id })}
                    className={`p-2 rounded-lg border text-center transition ${form.roomId === r.id ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <p className="font-bold text-lg">{r.number}</p>
                    <p className="text-[10px] text-muted-foreground">{r.type}</p>
                    <p className="text-[10px] font-medium">{formatINR(r.ratePerNight)}/night</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guest details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Guest Name *">
                <Input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} placeholder="Full name" />
              </Field>
              <Field label="Phone *">
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
              </Field>
            </div>

            {/* Returning guest indicator */}
            {checkingGuest && <p className="text-xs text-muted-foreground animate-pulse">Checking guest records...</p>}
            {returningGuest?.found && returningGuest.guest && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs">
                <p className="font-semibold text-emerald-800">↻ Returning Guest · {returningGuest.guest.totalStays} previous stay(s)</p>
                <p className="text-emerald-700 mt-0.5">
                  Last visited: {formatDateShort(returningGuest.guest.lastVisit)}
                  {returningGuest.guest.lastRoom && ` · Last room: ${returningGuest.guest.lastRoom}`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Email (optional)">
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Address (optional)">
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="ID Proof Type">
                <Select value={form.idProofType} onValueChange={v => setForm({ ...form, idProofType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                    <SelectItem value="Passport">Passport</SelectItem>
                    <SelectItem value="Driving License">Driving License</SelectItem>
                    <SelectItem value="Voter ID">Voter ID</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="ID Number">
                <Input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              </Field>
              <Field label="Expected Check-out">
                <Input type="datetime-local" value={form.expectedCheckOut} onChange={e => setForm({ ...form, expectedCheckOut: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Adults">
                <Input type="number" min={1} value={form.adults} onChange={e => setForm({ ...form, adults: Number(e.target.value) })} />
              </Field>
              <Field label="Children">
                <Input type="number" min={0} value={form.children} onChange={e => setForm({ ...form, children: Number(e.target.value) })} />
              </Field>
              <Field label="Advance Paid (₹)">
                <Input type="number" min={0} value={form.advanceAmount} onChange={e => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
              </Field>
            </div>

            <Field label="Notes">
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special requests, etc." />
            </Field>
          </div>

          {/* Summary + submit */}
          {form.roomId && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">
                Room {availableRooms.find(r => r.id === form.roomId)?.number} · {availableRooms.find(r => r.id === form.roomId)?.type}
              </p>
              <p className="text-muted-foreground text-xs">
                Rate: {formatINR(availableRooms.find(r => r.id === form.roomId)?.ratePerNight || 0)}/night
                {form.advanceAmount > 0 && ` · Advance: ${formatINR(form.advanceAmount)}`}
              </p>
            </div>
          )}

          <Button
            className="w-full mt-4"
            onClick={submit}
            disabled={submitting || !form.roomId || !form.guestName || !form.phone}
          >
            {submitting ? 'Checking in...' : 'Confirm Check-in'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
