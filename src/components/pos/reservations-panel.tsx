'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Plus, Trash2, RefreshCw, CheckIn as CheckInIcon, Phone, Mail } from 'lucide-react'
import { formatINR, formatDateShort, apiFetch } from '@/lib/format'

type Reservation = {
  id: string; guestName: string; guestPhone: string; guestEmail: string | null
  roomId: string; room: { id: string; number: string; type: string; ratePerNight: number }
  checkInDate: string; checkOutDate: string; nights: number
  adults: number; children: number; advanceAmount: number
  status: string; notes: string | null; source: string
  createdAt: string
}

export function ReservationsPanel() {
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch<{ reservations: Reservation[] }>('/api/reservations')
      setReservations(d.reservations)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function cancel(id: string) {
    if (!confirm('Cancel this reservation? This cannot be undone.')) return
    try {
      await apiFetch(`/api/reservations/${id}`, { method: 'DELETE' })
      toast({ title: 'Reservation cancelled' })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = reservations.filter(r => r.status === 'confirmed' && r.checkOutDate >= today)
  const past = reservations.filter(r => r.status !== 'confirmed' || r.checkOutDate < today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reservations</h2>
          <p className="text-sm text-muted-foreground">{upcoming.length} upcoming · {past.length} past/cancelled</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> New Reservation</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : upcoming.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No upcoming reservations. Click "New Reservation" to create one.
        </CardContent></Card>
      ) : (
        <div>
          <h3 className="text-sm font-semibold mb-2">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map(r => <ReservationCard key={r.id} r={r} onCancel={() => cancel(r.id)} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 mt-4">Past / Cancelled</h3>
          <div className="space-y-2 opacity-60">
            {past.map(r => <ReservationCard key={r.id} r={r} onCancel={() => cancel(r.id)} />)}
          </div>
        </div>
      )}

      <NewReservationDialog open={showAdd} onOpenChange={setShowAdd} onDone={() => { setShowAdd(false); load() }} />
    </div>
  )
}

function ReservationCard({ r, onCancel }: { r: Reservation; onCancel: () => void }) {
  const statusCfg: Record<string, { cls: string; label: string }> = {
    confirmed: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Confirmed' },
    cancelled: { cls: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Cancelled' },
    checked_in: { cls: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Checked In' },
  }
  const cfg = statusCfg[r.status] || statusCfg.confirmed

  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{r.guestName}</p>
            <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
            <Badge variant="secondary" className="text-[10px]">{r.source}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <Phone className="h-3 w-3" /> {r.guestPhone}
            {r.guestEmail && <><Mail className="h-3 w-3 ml-2" /> {r.guestEmail}</>}
          </p>
          <p className="text-xs mt-1">
            <Calendar className="h-3 w-3 inline mr-1" />
            {formatDateShort(r.checkInDate)} → {formatDateShort(r.checkOutDate)} · {r.nights} night(s)
            {' · '}Room {r.room.number} ({r.room.type})
            {' · '}{r.adults} adults{r.children > 0 ? `, ${r.children} kids` : ''}
          </p>
          {r.advanceAmount > 0 && (
            <p className="text-xs text-emerald-700 mt-0.5">Advance: {formatINR(r.advanceAmount)}</p>
          )}
          {r.notes && <p className="text-xs italic text-muted-foreground mt-0.5">Note: {r.notes}</p>}
        </div>
        {r.status === 'confirmed' && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onCancel}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function NewReservationDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    guestName: '', guestPhone: '', guestEmail: '',
    roomId: '',
    checkInDate: '', checkOutDate: '',
    adults: 1, children: 0,
    advanceAmount: 0, notes: '', source: 'walk_in',
  })

  useEffect(() => {
    if (open) {
      apiFetch<{ rooms: any[] }>('/api/rooms').then(d => setRooms(d.rooms)).catch(() => {})
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2)
      setForm({
        guestName: '', guestPhone: '', guestEmail: '',
        roomId: '',
        checkInDate: tomorrow.toISOString().slice(0, 10),
        checkOutDate: dayAfter.toISOString().slice(0, 10),
        adults: 1, children: 0,
        advanceAmount: 0, notes: '', source: 'walk_in',
      })
    }
  }, [open])

  async function submit() {
    if (!form.guestName || !form.guestPhone || !form.roomId) {
      toast({ title: 'Guest name, phone, and room are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast({ title: 'Reservation created' })
      onDone()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> New Reservation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Guest Name"><Input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} /></FieldRow>
          </div>
          <FieldRow label="Email (optional)"><Input type="email" value={form.guestEmail} onChange={e => setForm({ ...form, guestEmail: e.target.value })} /></FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Check-in Date"><Input type="date" value={form.checkInDate} onChange={e => setForm({ ...form, checkInDate: e.target.value })} /></FieldRow>
            <FieldRow label="Check-out Date"><Input type="date" value={form.checkOutDate} onChange={e => setForm({ ...form, checkOutDate: e.target.value })} /></FieldRow>
          </div>
          <FieldRow label="Room">
            <Select value={form.roomId} onValueChange={v => setForm({ ...form, roomId: v })}>
              <SelectTrigger><SelectValue placeholder="Select room..." /></SelectTrigger>
              <SelectContent>
                {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.number} ({r.type}) · {formatINR(r.ratePerNight)}/night</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Adults"><Input type="number" min={1} value={form.adults} onChange={e => setForm({ ...form, adults: Number(e.target.value) })} /></FieldRow>
            <FieldRow label="Children"><Input type="number" min={0} value={form.children} onChange={e => setForm({ ...form, children: Number(e.target.value) })} /></FieldRow>
            <FieldRow label="Advance (₹)"><Input type="number" min={0} value={form.advanceAmount} onChange={e => setForm({ ...form, advanceAmount: Number(e.target.value) })} /></FieldRow>
          </div>
          <FieldRow label="Source">
            <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Notes"><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Creating...' : 'Create Reservation'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
