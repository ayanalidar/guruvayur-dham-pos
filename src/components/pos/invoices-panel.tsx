'use client'
import { printInvoice } from '@/lib/print'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Receipt, Utensils, Printer, RefreshCw, FileText, Plus, Pencil, Shield, CheckCircle2, X, Save, RotateCcw, Trash2 } from 'lucide-react'
import { formatINR, formatDateShort, formatDate, formatTime, apiFetch } from '@/lib/format'
import { QrCode } from './qr-code'

type HotelInvoice = {
  id: string; invoiceNumber: string; guestName: string; guestPhone: string
  roomNumber: string; roomType: string; checkInAt: string; checkOutAt: string
  nights: number; ratePerNight: number; roomCharges: number; foodCharges: number
  extraCharges: number; discount: number; taxableAmount: number
  cgstRate: number; sgstRate: number; cgstAmount: number; sgstAmount: number
  grandTotal: number; advancePaid: number; balanceDue: number
  paymentMethod: string | null; notes: string | null; createdAt: string
  checkIn?: {
    foodOrders: Array<{
      id: string; orderNumber: string; createdAt: string; grandTotal: number
      items: Array<{ id: string; name: string; price: number; quantity: number; total: number }>
    }>
  } | null
}

type FoodInvoice = {
  id: string; invoiceNumber: string; customerName: string; roomNumber: string | null
  tableNumber: string | null; orderType: string
  itemsTotal: number; cgstRate: number; sgstRate: number; cgstAmount: number; sgstAmount: number
  grandTotal: number; paymentMethod: string | null; notes: string | null; createdAt: string
  order: {
    id: string; orderNumber: string
    items: Array<{ id: string; name: string; price: number; quantity: number; total: number }>
  }
}

type Config = {
  name: string; address: string; phone: string; email: string; gstNumber: string; sacCode: string
  cgstRate: number; sgstRate: number
  reviewLink?: string
  bankName?: string; bankAccount?: string; bankIfsc?: string; bankBranch?: string
}

export function InvoicesPanel() {
  const [tab, setTab] = useState<'hotel' | 'food' | 'custom'>('hotel')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Invoices</h2>
        <p className="text-sm text-muted-foreground">Hotel invoices, Food invoices, and Custom invoices for ad-hoc billing.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="hotel"><Receipt className="h-4 w-4 mr-1.5" /> Hotel</TabsTrigger>
          <TabsTrigger value="food"><Utensils className="h-4 w-4 mr-1.5" /> Food</TabsTrigger>
          <TabsTrigger value="custom"><FileText className="h-4 w-4 mr-1.5" /> Custom</TabsTrigger>
        </TabsList>
        <TabsContent value="hotel" className="mt-4"><HotelInvoicesTab /></TabsContent>
        <TabsContent value="food" className="mt-4"><FoodInvoicesTab /></TabsContent>
        <TabsContent value="custom" className="mt-4"><CustomInvoicesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function HotelInvoicesTab() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<HotelInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<HotelInvoice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch<{ invoices: HotelInvoice[] }>('/api/invoices/hotel')
      setInvoices(d.invoices)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const d = await apiFetch<{ invoices: HotelInvoice[] }>('/api/invoices/hotel')
        if (active) { setInvoices(d.invoices); setLoading(false) }
      } catch (e: any) {
        if (active) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [toast])

  // Refresh when an invoice is updated (e.g., number edited in dialog)
  useEffect(() => {
    function onUpdated() { load() }
    window.addEventListener('invoice-updated', onUpdated)
    return () => window.removeEventListener('invoice-updated', onUpdated)
  }, [load])

  async function view(id: string) {
    try {
      const d = await apiFetch<{ invoice: HotelInvoice }>(`/api/invoices/hotel/${id}`)
      setSelected(d.invoice)
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-16" />)}</div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No hotel invoices yet. They are auto-generated when you check out a guest.
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border divide-y">
          {invoices.map(inv => (
            <button key={inv.id} onClick={() => view(inv.id)}
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span>
                  <Badge variant="outline" className="text-xs">{inv.roomType}</Badge>
                </div>
                <p className="text-sm mt-0.5 truncate">
                  Room {inv.roomNumber} · {inv.guestName} · {inv.guestPhone}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateShort(inv.checkInAt)} → {formatDateShort(inv.checkOutAt)} · {inv.nights} night(s) · Issued {formatDateShort(inv.createdAt)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatINR(inv.grandTotal)}</p>
                {inv.balanceDue > 0 ? (
                  <Badge variant="destructive" className="text-xs">Due {formatINR(inv.balanceDue)}</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Paid</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <HotelInvoiceDialog invoice={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function FoodInvoicesTab() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<FoodInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FoodInvoice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch<{ invoices: FoodInvoice[] }>('/api/invoices/food')
      setInvoices(d.invoices)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const d = await apiFetch<{ invoices: FoodInvoice[] }>('/api/invoices/food')
        if (active) { setInvoices(d.invoices); setLoading(false) }
      } catch (e: any) {
        if (active) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [toast])

  // Refresh when an invoice is updated
  useEffect(() => {
    function onUpdated() { load() }
    window.addEventListener('invoice-updated', onUpdated)
    return () => window.removeEventListener('invoice-updated', onUpdated)
  }, [load])

  async function view(id: string) {
    try {
      const d = await apiFetch<{ invoice: FoodInvoice }>(`/api/invoices/food/${id}`)
      setSelected(d.invoice)
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-16" />)}</div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No food invoices yet. Open an order in the Orders tab and click &quot;Create Invoice&quot; (only for separate-bill orders).
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border divide-y">
          {invoices.map(inv => (
            <button key={inv.id} onClick={() => view(inv.id)}
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span>
                  <Badge variant="outline" className="text-xs">{inv.orderType.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm mt-0.5 truncate">
                  {inv.customerName}
                  {inv.roomNumber && ` · Room ${inv.roomNumber}`}
                  {inv.tableNumber && ` · Table ${inv.tableNumber}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Linked order: {inv.order.orderNumber} · {formatDateShort(inv.createdAt)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatINR(inv.grandTotal)}</p>
                {inv.paymentMethod ? (
                  <Badge variant="secondary" className="text-xs">{inv.paymentMethod}</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Unpaid</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <FoodInvoiceDialog invoice={selected} onClose={() => setSelected(null)} />
    </>
  )
}

// ============= Printable invoice dialogs =============

function HotelInvoiceDialog({ invoice, onClose }: { invoice: HotelInvoice | null; onClose: () => void }) {
  const { toast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedNumber, setEditedNumber] = useState('')
  const [saving, setSaving] = useState(false)
  // Full-edit form state
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
  }, [])

  // Reset edit state whenever a new invoice is opened
  useEffect(() => {
    if (invoice) {
      setEditMode(false)
      setEditedNumber(invoice.invoiceNumber)
      // Build editable form from invoice data
      setForm({
        invoiceNumber: invoice.invoiceNumber,
        guestName: invoice.guestName,
        guestPhone: invoice.guestPhone,
        roomNumber: invoice.roomNumber,
        roomType: invoice.roomType,
        checkInAt: invoice.checkInAt ? new Date(invoice.checkInAt).toISOString().slice(0, 16) : '',
        checkOutAt: invoice.checkOutAt ? new Date(invoice.checkOutAt).toISOString().slice(0, 16) : '',
        nights: invoice.nights,
        ratePerNight: invoice.ratePerNight,
        roomCharges: invoice.roomCharges,
        foodCharges: invoice.foodCharges,
        extraCharges: invoice.extraCharges,
        discount: invoice.discount,
        taxableAmount: invoice.taxableAmount,
        cgstRate: invoice.cgstRate,
        sgstRate: invoice.sgstRate,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        grandTotal: invoice.grandTotal,
        advancePaid: invoice.advancePaid,
        balanceDue: invoice.balanceDue,
        paymentMethod: invoice.paymentMethod || '',
        notes: invoice.notes || '',
      })
    }
  }, [invoice?.id])

  if (!invoice) return null
  // Guard: form might be null if useEffect hasn't run yet — treat as non-edit mode
  const safeForm = form || {
    invoiceNumber: invoice.invoiceNumber, guestName: invoice.guestName, guestPhone: invoice.guestPhone,
    roomNumber: invoice.roomNumber, roomType: invoice.roomType, checkInAt: '', checkOutAt: '',
    nights: invoice.nights, ratePerNight: invoice.ratePerNight, roomCharges: invoice.roomCharges,
    foodCharges: invoice.foodCharges, extraCharges: invoice.extraCharges, discount: invoice.discount,
    taxableAmount: invoice.taxableAmount, cgstRate: invoice.cgstRate, sgstRate: invoice.sgstRate,
    cgstAmount: invoice.cgstAmount, sgstAmount: invoice.sgstAmount, grandTotal: invoice.grandTotal,
    advancePaid: invoice.advancePaid, balanceDue: invoice.balanceDue, paymentMethod: invoice.paymentMethod || '',
    notes: invoice.notes || '',
  }

  const foodOrders = invoice.checkIn?.foodOrders || []

  async function saveInvoiceNumber() {
    if (!invoice) return
    const trimmed = editedNumber.trim()
    if (!trimmed) return
    if (trimmed === invoice.invoiceNumber) { setEditMode(false); return }
    setSaving(true)
    try {
      const r = await apiFetch<{ invoice: HotelInvoice }>(`/api/invoices/hotel/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ invoiceNumber: trimmed }),
      })
      Object.assign(invoice, { invoiceNumber: r.invoice.invoiceNumber })
      setEditMode(false)
      window.dispatchEvent(new CustomEvent('invoice-updated'))
    } catch (e: any) {
      toast({ title: 'Failed to update invoice number', description: e.message, variant: 'destructive' })
      setEditedNumber(invoice.invoiceNumber)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveFullEdit() {
    if (!invoice || !form) return
    setSaving(true)
    try {
      // Convert datetime-local back to ISO + numeric fields to numbers
      const payload: any = { ...form }
      if (payload.checkInAt) payload.checkInAt = new Date(payload.checkInAt).toISOString()
      if (payload.checkOutAt) payload.checkOutAt = new Date(payload.checkOutAt).toISOString()
      ;['nights', 'ratePerNight', 'roomCharges', 'foodCharges', 'extraCharges', 'discount', 'taxableAmount', 'cgstRate', 'sgstRate', 'cgstAmount', 'sgstAmount', 'grandTotal', 'advancePaid', 'balanceDue'].forEach(k => {
        payload[k] = Number(payload[k]) || 0
      })
      const r = await apiFetch<{ invoice: HotelInvoice }>(`/api/invoices/hotel/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      Object.assign(invoice, r.invoice)
      setEditMode(false)
      window.dispatchEvent(new CustomEvent('invoice-updated'))
      toast({ title: 'Invoice updated' })
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Helper to recompute derived fields when rates/charges change in edit mode
  function recompute(f: any) {
    const taxable = Math.max(0,
      (Number(f.roomCharges) || 0) +
      (Number(f.foodCharges) || 0) +
      (Number(f.extraCharges) || 0) -
      (Number(f.discount) || 0)
    )
    const cgstAmt = Math.round(taxable * (Number(f.cgstRate) || 0)) / 100
    const sgstAmt = Math.round(taxable * (Number(f.sgstRate) || 0)) / 100
    const grand = taxable + cgstAmt + sgstAmt
    const balance = Math.max(0, grand - (Number(f.advancePaid) || 0))
    return { ...f, taxableAmount: taxable, cgstAmount: cgstAmt, sgstAmount: sgstAmt, grandTotal: grand, balanceDue: balance }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Hotel Invoice
            </span>
            {/* Full Edit Mode toggle — turns all fields into inputs */}
            {!editMode ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Invoice
              </Button>
            ) : (
              <div className="flex gap-1 no-print">
                <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setEditedNumber(invoice.invoiceNumber) }} disabled={saving}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
                <Button size="sm" onClick={saveFullEdit} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print bg-white p-4" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '100%' }}>
          <InvoiceHeader
            config={config}
            invoiceNumber={editMode ? safeForm.invoiceNumber : invoice.invoiceNumber}
            title="HOTEL INVOICE"
            editableNumber={null}
            onNumberChange={() => {}}
            onEditClick={undefined}
            savingNumber={false}
          />

          {/* Customer details — editable when in edit mode, dotted leaders otherwise */}
          {editMode && form ? (
            <div className="mt-3 mb-3 grid grid-cols-2 gap-2 text-xs">
              <Field label="Invoice No."><Input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Guest Name"><Input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Guest Phone"><Input value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Room Number"><Input value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Room Type"><Input value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Check-in"><Input type="datetime-local" value={form.checkInAt} onChange={e => setForm({ ...form, checkInAt: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Check-out"><Input type="datetime-local" value={form.checkOutAt} onChange={e => setForm({ ...form, checkOutAt: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Nights"><Input type="number" value={form.nights} onChange={e => setForm({ ...form, nights: Number(e.target.value) })} className="h-7 text-xs" /></Field>
              <Field label="Rate / Night (₹)"><Input type="number" value={form.ratePerNight} onChange={e => setForm(recompute({ ...form, ratePerNight: Number(e.target.value), roomCharges: Number(e.target.value) * (Number(form.nights) || 1) }))} className="h-7 text-xs" /></Field>
              <Field label="Room Charges (₹)"><Input type="number" value={form.roomCharges} onChange={e => setForm(recompute({ ...form, roomCharges: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Food Charges (₹)"><Input type="number" value={form.foodCharges} onChange={e => setForm(recompute({ ...form, foodCharges: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Extra Charges (₹)"><Input type="number" value={form.extraCharges} onChange={e => setForm(recompute({ ...form, extraCharges: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Discount (₹)"><Input type="number" value={form.discount} onChange={e => setForm(recompute({ ...form, discount: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Advance Paid (₹)"><Input type="number" value={form.advancePaid} onChange={e => setForm(recompute({ ...form, advancePaid: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="CGST Rate (%)"><Input type="number" step="0.1" value={form.cgstRate} onChange={e => setForm(recompute({ ...form, cgstRate: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="SGST Rate (%)"><Input type="number" step="0.1" value={form.sgstRate} onChange={e => setForm(recompute({ ...form, sgstRate: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Payment Method">
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="h-7 text-xs w-full border rounded px-1">
                  <option value="">—</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </Field>
              <Field label="Notes"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-7 text-xs" /></Field>
            </div>
          ) : (
            <div className="mt-3 mb-3 space-y-1">
              <LeaderRow>
                <LeaderField label="Name" value={invoice.guestName} />
                <LeaderField label="Mob" value={invoice.guestPhone} width="w-44" />
              </LeaderRow>
              <LeaderRow>
                <LeaderField label="A/D Date" value={formatDateShort(invoice.checkInAt)} width="w-40" />
                <LeaderField label="Time" value={formatTime(invoice.checkInAt)} width="w-32" />
                <LeaderField label="D/I Date" value={formatDateShort(invoice.checkOutAt)} width="w-40" />
                <LeaderField label="Time" value={formatTime(invoice.checkOutAt)} width="w-32" />
              </LeaderRow>
              <LeaderRow>
                <LeaderField label="Address" value={`Room ${invoice.roomNumber} (${invoice.roomType})`} />
                <LeaderField label="GSTIN" value="—" width="w-48" />
              </LeaderRow>
            </div>
          )}

          {/* Itemized table */}
          <table className="w-full text-xs border-collapse border border-black" style={{ fontFamily: 'Arial, sans-serif', tableLayout: 'fixed', wordWrap: 'break-word' }}>
            <thead>
              <tr className="bg-gray-200 border-b border-black">
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '8%' }}>Sr. No</th>
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '52%' }}>Particulars</th>
                <th className="text-right py-2 px-2 border-r border-black" style={{ width: '20%' }}>Rate / Day</th>
                <th className="text-right py-2 px-2" style={{ width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <td className="py-2 px-2 border-r border-black text-center">1</td>
                <td className="py-2 px-2 border-r border-black">
                  Room Charges — Room {editMode ? safeForm.roomNumber : invoice.roomNumber} ({editMode ? safeForm.roomType : invoice.roomType})
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {editMode ? `${form.nights} night(s)` : (
                      <>Check-in: {formatDateShort(invoice.checkInAt)} · Check-out: {formatDateShort(invoice.checkOutAt)} · {invoice.nights} night(s)</>
                    )}
                  </span>
                </td>
                <td className="text-right py-2 px-2 border-r border-black font-mono">
                  {editMode ? formatINR(Number(form.ratePerNight) || 0) : formatINR(invoice.ratePerNight)}
                </td>
                <td className="text-right py-2 px-2 font-mono">
                  {editMode ? formatINR(Number(form.roomCharges) || 0) : formatINR(invoice.roomCharges)}
                </td>
              </tr>
              {foodOrders.map((fo, idx) => (
                <tr key={fo.id} className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{idx + 2}</td>
                  <td className="py-2 px-2 border-r border-black">
                    Food Order — {fo.orderNumber}
                    <span className="text-[10px] text-muted-foreground ml-1">({formatDateShort(fo.createdAt)})</span>
                    <ul className="mt-0.5 ml-2 text-[10px] text-muted-foreground" style={{ listStyleType: 'none' }}>
                      {fo.items.map(it => (
                        <li key={it.id}>· {it.quantity}× {it.name} — {formatINR(it.total)}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono text-muted-foreground">—</td>
                  <td className="text-right py-2 px-2 font-mono">{formatINR(fo.grandTotal)}</td>
                </tr>
              ))}
              {(editMode ? Number(form.extraCharges) > 0 : invoice.extraCharges > 0) && (
                <tr className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{foodOrders.length + 2}</td>
                  <td className="py-2 px-2 border-r border-black">Extra Charges</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono text-muted-foreground">—</td>
                  <td className="text-right py-2 px-2 font-mono">{formatINR(editMode ? Number(form.extraCharges) || 0 : invoice.extraCharges)}</td>
                </tr>
              )}
              {(editMode ? Number(form.discount) > 0 : invoice.discount > 0) && (
                <tr className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{foodOrders.length + ((editMode ? Number(form.extraCharges) : invoice.extraCharges) > 0 ? 3 : 2)}</td>
                  <td className="py-2 px-2 border-r border-black">Discount</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono text-muted-foreground">—</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-700">- {formatINR(editMode ? Number(form.discount) || 0 : invoice.discount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Total</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(editMode ? Number(form.taxableAmount) || 0 : invoice.taxableAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex justify-end">
            <InvoiceTotals
              rows={editMode ? [
                { label: 'Taxable Amount', value: Number(form.taxableAmount) || 0 },
                ...(Number(form.cgstAmount) > 0 ? [{ label: `CGST (${form.cgstRate}%)`, value: Number(form.cgstAmount) }] : []),
                ...(Number(form.sgstAmount) > 0 ? [{ label: `SGST (${form.sgstRate}%)`, value: Number(form.sgstAmount) }] : []),
                { label: 'G. TOTAL', value: Number(form.grandTotal) || 0, bold: true, doubleTop: true, primary: true },
                { label: 'Advance Paid', value: -(Number(form.advancePaid) || 0), muted: true, emerald: true },
                { label: 'Balance Due', value: Number(form.balanceDue) || 0, bold: true, primary: true },
              ] : [
                { label: 'Taxable Amount', value: invoice.taxableAmount },
                ...(invoice.cgstAmount > 0 ? [{ label: `CGST (${invoice.cgstRate}%)`, value: invoice.cgstAmount }] : []),
                ...(invoice.sgstAmount > 0 ? [{ label: `SGST (${invoice.sgstRate}%)`, value: invoice.sgstAmount }] : []),
                { label: 'G. TOTAL', value: invoice.grandTotal, bold: true, doubleTop: true, primary: true },
                { label: 'Advance Paid', value: -invoice.advancePaid, muted: true, emerald: true },
                { label: 'Balance Due', value: invoice.balanceDue, bold: true, primary: true },
              ]}
            />
          </div>

          {(editMode ? safeForm.paymentMethod : invoice.paymentMethod) ? (
            <p className="text-xs mt-3">Payment Method: <strong>{editMode ? safeForm.paymentMethod : invoice.paymentMethod}</strong></p>
          ) : null}
          {(editMode ? safeForm.notes : invoice.notes) && (
            <p className="text-xs mt-1 text-muted-foreground italic">Notes: {editMode ? safeForm.notes : invoice.notes}</p>
          )}

          <InvoiceFooter config={config} />
        </div>

        <DialogFooter className="no-print flex-wrap gap-2">
          {/* Settle Payment — marks balance as 0 */}
          {invoice.balanceDue > 0 && !editMode && (
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!confirm(`Settle balance of ${formatINR(invoice.balanceDue)}? This will mark the invoice as fully paid.`)) return
                try {
                  await apiFetch(`/api/invoices/hotel/${invoice.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      advancePaid: invoice.grandTotal,
                      balanceDue: 0,
                    }),
                  })
                  toast({ title: 'Payment settled', description: `Balance of ${formatINR(invoice.balanceDue)} cleared.` })
                  Object.assign(invoice, { advancePaid: invoice.grandTotal, balanceDue: 0 })
                  window.dispatchEvent(new CustomEvent('invoice-updated'))
                } catch (e: any) {
                  toast({ title: 'Settle failed', description: e.message, variant: 'destructive' })
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Settle ₹{invoice.balanceDue.toFixed(2)}
            </Button>
          )}
          {invoice.balanceDue <= 0 && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Paid
            </Badge>
          )}
          <Button variant="destructive" onClick={async () => {
            if (!confirm('Delete this hotel invoice permanently? This cannot be undone.')) return
            try {
              await apiFetch(`/api/invoices/hotel/${invoice.id}`, { method: 'DELETE' })
              toast({ title: 'Invoice deleted' })
              window.dispatchEvent(new CustomEvent('invoice-updated'))
              onClose()
            } catch (e: any) {
              toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
            }
          }}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => printInvoice()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FoodInvoiceDialog({ invoice, onClose }: { invoice: FoodInvoice | null; onClose: () => void }) {
  const { toast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedNumber, setEditedNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
  }, [])

  useEffect(() => {
    if (invoice) {
      setEditMode(false)
      setEditedNumber(invoice.invoiceNumber)
      setForm({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        roomNumber: invoice.roomNumber || '',
        tableNumber: invoice.tableNumber || '',
        orderType: invoice.orderType,
        itemsTotal: invoice.itemsTotal,
        cgstRate: invoice.cgstRate,
        sgstRate: invoice.sgstRate,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        grandTotal: invoice.grandTotal,
        paymentMethod: invoice.paymentMethod || '',
        notes: invoice.notes || '',
      })
    }
  }, [invoice?.id])

  if (!invoice) return null
  // Guard: form might be null if useEffect hasn't run yet
  const safeForm = form || {
    invoiceNumber: invoice.invoiceNumber, customerName: invoice.customerName,
    roomNumber: invoice.roomNumber || '', tableNumber: invoice.tableNumber || '',
    orderType: invoice.orderType, itemsTotal: invoice.itemsTotal,
    cgstRate: invoice.cgstRate, sgstRate: invoice.sgstRate,
    cgstAmount: invoice.cgstAmount, sgstAmount: invoice.sgstAmount,
    grandTotal: invoice.grandTotal, paymentMethod: invoice.paymentMethod || '',
    notes: invoice.notes || '',
  }

  async function saveInvoiceNumber() {
    if (!invoice) return
    const trimmed = editedNumber.trim()
    if (!trimmed) return
    if (trimmed === invoice.invoiceNumber) { setEditMode(false); return }
    setSaving(true)
    try {
      const r = await apiFetch<{ invoice: FoodInvoice }>(`/api/invoices/food/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ invoiceNumber: trimmed }),
      })
      Object.assign(invoice, { invoiceNumber: r.invoice.invoiceNumber })
      setEditMode(false)
      window.dispatchEvent(new CustomEvent('invoice-updated'))
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' })
      setEditedNumber(invoice.invoiceNumber)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveFullEdit() {
    if (!invoice || !form) return
    setSaving(true)
    try {
      const payload: any = { ...form }
      ;['itemsTotal', 'cgstRate', 'sgstRate', 'cgstAmount', 'sgstAmount', 'grandTotal'].forEach(k => {
        payload[k] = Number(payload[k]) || 0
      })
      const r = await apiFetch<{ invoice: FoodInvoice }>(`/api/invoices/food/${invoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      Object.assign(invoice, r.invoice)
      setEditMode(false)
      window.dispatchEvent(new CustomEvent('invoice-updated'))
      toast({ title: 'Food invoice updated' })
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function recompute(f: any) {
    const taxable = Number(f.itemsTotal) || 0
    const cgstAmt = Math.round(taxable * (Number(f.cgstRate) || 0)) / 100
    const sgstAmt = Math.round(taxable * (Number(f.sgstRate) || 0)) / 100
    const grand = taxable + cgstAmt + sgstAmt
    return { ...f, cgstAmount: cgstAmt, sgstAmount: sgstAmt, grandTotal: grand }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Utensils className="h-5 w-5" /> Food Invoice
            </span>
            {!editMode ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Invoice
              </Button>
            ) : (
              <div className="flex gap-1 no-print">
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} disabled={saving}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
                <Button size="sm" onClick={saveFullEdit} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print bg-white p-4" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '100%' }}>
          <InvoiceHeader
            config={config}
            invoiceNumber={editMode ? safeForm.invoiceNumber : invoice.invoiceNumber}
            title="FOOD INVOICE"
            editableNumber={null}
            onNumberChange={() => {}}
            onEditClick={undefined}
            savingNumber={false}
          />

          {editMode && form ? (
            <div className="mt-3 mb-3 grid grid-cols-2 gap-2 text-xs">
              <Field label="Invoice No."><Input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Customer Name"><Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Room Number"><Input value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Table Number"><Input value={form.tableNumber} onChange={e => setForm({ ...form, tableNumber: e.target.value })} className="h-7 text-xs" /></Field>
              <Field label="Order Type">
                <select value={form.orderType} onChange={e => setForm({ ...form, orderType: e.target.value })} className="h-7 text-xs w-full border rounded px-1">
                  <option value="dine_in">Dine In</option>
                  <option value="room_service">Room Service</option>
                  <option value="takeaway">Takeaway</option>
                </select>
              </Field>
              <Field label="Items Total (₹)"><Input type="number" value={form.itemsTotal} onChange={e => setForm(recompute({ ...form, itemsTotal: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="CGST Rate (%)"><Input type="number" step="0.1" value={form.cgstRate} onChange={e => setForm(recompute({ ...form, cgstRate: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="SGST Rate (%)"><Input type="number" step="0.1" value={form.sgstRate} onChange={e => setForm(recompute({ ...form, sgstRate: Number(e.target.value) }))} className="h-7 text-xs" /></Field>
              <Field label="Payment Method">
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="h-7 text-xs w-full border rounded px-1">
                  <option value="">—</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </Field>
              <Field label="Notes"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-7 text-xs" /></Field>
            </div>
          ) : (
            <div className="mt-3 mb-3 space-y-1">
              <LeaderRow>
                <LeaderField label="Name" value={invoice.customerName} />
                <LeaderField label="Mob" value="—" width="w-44" />
              </LeaderRow>
              <LeaderRow>
                <LeaderField
                  label="Address"
                  value={[
                    invoice.roomNumber && `Room ${invoice.roomNumber}`,
                    invoice.tableNumber && `Table ${invoice.tableNumber}`,
                    invoice.orderType && invoice.orderType.replace('_', ' '),
                  ].filter(Boolean).join(' · ')}
                />
                <LeaderField label="GSTIN" value="—" width="w-48" />
              </LeaderRow>
            </div>
          )}

          <table className="w-full text-xs border-collapse border border-black" style={{ fontFamily: 'Arial, sans-serif', tableLayout: 'fixed', wordWrap: 'break-word' }}>
            <thead>
              <tr className="bg-gray-200 border-b border-black">
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '8%' }}>Sr. No</th>
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '52%' }}>Particulars</th>
                <th className="text-right py-2 px-2 border-r border-black" style={{ width: '20%' }}>Rate</th>
                <th className="text-right py-2 px-2" style={{ width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.order.items.map((it, idx) => (
                <tr key={it.id} className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-black">{it.name}</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono">
                    {it.quantity} × {formatINR(it.price)}
                  </td>
                  <td className="text-right py-2 px-2 font-mono">{formatINR(it.total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Total</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(editMode ? Number(form.itemsTotal) || 0 : invoice.itemsTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex justify-end">
            <InvoiceTotals
              rows={editMode ? [
                { label: 'Taxable Amount', value: Number(form.itemsTotal) || 0 },
                { label: `CGST (${form.cgstRate}%)`, value: Number(form.cgstAmount) || 0 },
                { label: `SGST (${form.sgstRate}%)`, value: Number(form.sgstAmount) || 0 },
                { label: 'G. TOTAL', value: Number(form.grandTotal) || 0, bold: true, doubleTop: true, primary: true },
              ] : [
                { label: 'Taxable Amount', value: invoice.itemsTotal },
                ...(invoice.cgstAmount > 0 ? [{ label: `CGST (${invoice.cgstRate.toFixed(1)}%)`, value: invoice.cgstAmount }] : []),
                ...(invoice.sgstAmount > 0 ? [{ label: `SGST (${invoice.sgstRate.toFixed(1)}%)`, value: invoice.sgstAmount }] : []),
                { label: 'G. TOTAL', value: invoice.grandTotal, bold: true, doubleTop: true, primary: true },
              ]}
            />
          </div>

          <p className="text-[10px] mt-3 text-muted-foreground">
            Order Ref: <span className="font-mono">{invoice.order.orderNumber}</span>
          </p>
          {(editMode ? safeForm.paymentMethod : invoice.paymentMethod) ? (
            <p className="text-xs mt-1">Payment Method: <strong>{editMode ? safeForm.paymentMethod : invoice.paymentMethod}</strong></p>
          ) : null}
          {(editMode ? safeForm.notes : invoice.notes) && (
            <p className="text-xs mt-1 text-muted-foreground italic">Notes: {editMode ? safeForm.notes : invoice.notes}</p>
          )}

          <InvoiceFooter config={config} />
        </div>

        <DialogFooter className="no-print">
          <Button variant="destructive" onClick={async () => {
            if (!confirm('Delete this food invoice permanently? This cannot be undone.')) return
            try {
              await apiFetch(`/api/invoices/food/${invoice.id}`, { method: 'DELETE' })
              toast({ title: 'Food invoice deleted' })
              window.dispatchEvent(new CustomEvent('invoice-updated'))
              onClose()
            } catch (e: any) {
              toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
            }
          }}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => printInvoice()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper Field component for editable invoice form rows
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ----- shared invoice bits -----
// All styling here matches the client's actual invoice sample (Hotel Guruvayur Dham, Mathura UP)
// Layout: top GSTIN/title strip → logo + hotel name in red serif → bordered address box →
// customer grid with dotted leaders → table → tax breakdown → bank + signature footer.

function InvoiceHeader({
  config, invoiceNumber, title,
  editableNumber = null,
  onNumberChange, onSaveNumber, onCancelEdit, onEditClick, savingNumber = false,
  copyNote = 'Original',
}: {
  config: Config | null; invoiceNumber: string; title: string
  editableNumber?: string | null
  onNumberChange?: (v: string) => void
  onSaveNumber?: () => void
  onCancelEdit?: () => void
  onEditClick?: () => void
  savingNumber?: boolean
  copyNote?: string
}) {
  return (
    <div className="mb-3">
      {/* Top strip: GSTIN | TAX INVOICE | Original/Duplicate */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide pb-1 border-b border-black">
        <span>{config?.gstNumber ? `GSTIN: ${config.gstNumber}` : ''}</span>
        <span className="font-bold tracking-widest">TAX INVOICE</span>
        <span className="text-muted-foreground">{copyNote}</span>
      </div>

      {/* Logo + Hotel name */}
      <div className="flex items-center gap-3 py-3">
        <img
          src="/gvd-logo.webp"
          alt="GVD"
          className="h-20 w-28 object-contain shrink-0"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
        />
        <div className="flex-1 text-center">
          <h1
            className="text-3xl font-bold leading-none tracking-wide"
            style={{ color: '#B22222', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {config?.name?.toUpperCase() || 'HOTEL GURUVAYUR DHAM'}
          </h1>
          {/* Address bar — dark background, white text (like sample) */}
          {config?.address && (
            <div
              className="mt-2 inline-block px-4 py-1 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: '#1F2937' }}
            >
              {config.address}
            </div>
          )}
          {/* Contact strip */}
          {(config?.phone || config?.email) && (
            <p className="mt-1.5 text-[11px] font-semibold text-gray-800">
              {config?.phone && `Mob: ${config.phone}`}
              {config?.phone && config?.email && ' | '}
              {config?.email && `Email: ${config.email}`}
            </p>
          )}
        </div>
      </div>

      {/* Invoice number + title row */}
      <div className="flex items-end justify-between gap-3 border-t-2 border-black pt-2">
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Invoice No.</p>
          {editableNumber !== null ? (
            <div className="flex items-center gap-1 no-print">
              <Input
                value={editableNumber}
                onChange={e => onNumberChange?.(e.target.value)}
                className="h-7 text-sm font-mono w-40"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveNumber?.()
                  if (e.key === 'Escape') onCancelEdit?.()
                }}
              />
              <Button size="icon" variant="default" className="h-6 w-6" onClick={onSaveNumber} disabled={savingNumber}>
                <CheckCircle2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit} disabled={savingNumber}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <p className="font-mono text-base font-bold">{invoiceNumber}</p>
              {onEditClick && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 no-print"
                  onClick={onEditClick}
                  title="Edit invoice number"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
          <p className="text-sm font-medium">{formatDateShort(new Date())}</p>
        </div>
      </div>
    </div>
  )
}

// Dotted leader row for the customer grid (matches sample's "Name....Mob...." style)
function LeaderRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center text-xs py-0.5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {children}
    </div>
  )
}

function LeaderField({ label, value, width = 'flex-1' }: { label: string; value?: string; width?: string }) {
  return (
    <span className={`${width} inline-flex items-baseline`}>
      <span className="font-semibold mr-1">{label}:</span>
      <span
        className="flex-1 border-b border-dotted border-gray-500 mx-1 leading-tight"
        style={{ minHeight: '1em' }}
      >
        {value && <span className="px-1">{value}</span>}
      </span>
    </span>
  )
}

function InvoiceTotals({ rows }: {
  rows: Array<{ label: string; value: number; bold?: boolean; muted?: boolean; emerald?: boolean; primary?: boolean; doubleTop?: boolean }>
}) {
  return (
    <div className="ml-auto w-72 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center justify-between py-0.5 ${r.doubleTop ? 'border-t-2 border-black mt-1 pt-1' : ''} ${r.bold ? 'font-bold' : ''}`}
        >
          <span
            className={`${r.muted ? 'text-muted-foreground' : ''} ${r.emerald ? 'text-emerald-700' : ''} ${r.primary ? 'text-red-800' : ''}`}
            style={{ flex: 1, borderBottom: r.bold ? '' : '1px dotted #999', marginRight: '6px' }}
          >
            {r.label}
          </span>
          <span
            className={`font-mono ${r.primary ? 'text-red-800' : ''} ${r.bold ? 'font-bold' : ''}`}
            style={{ minWidth: '80px', textAlign: 'right' }}
          >
            {r.value < 0 ? '- ' : ''}{formatINR(Math.abs(r.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

function InvoiceFooter({ config }: { config: Config | null; sacCode?: string }) {
  const reviewLink = config?.reviewLink || 'https://share.google/5fv3gDrquFN8LT1xb'
  const hasBankDetails = config?.bankName || config?.bankAccount || config?.bankIfsc || config?.bankBranch
  const waText = encodeURIComponent(
    `Hello! Thank you for staying at ${config?.name || 'Hotel Guruvayur Dham'}. ` +
    `We'd love your feedback — please rate us here: ${reviewLink}`
  )
  const waUrl = `https://wa.me/?text=${waText}`

  return (
    <div className="mt-6 pt-3 border-t border-gray-300">
      {/* Bank details + QR code row (only if bank details configured OR review link exists) */}
      {(hasBankDetails || reviewLink) && (
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start mb-4 pb-3 border-b border-dashed border-gray-300">
          {/* Left: Bank details */}
          <div className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {hasBankDetails ? (
              <>
                <p className="font-bold underline mb-1">Bank Details:</p>
                {config?.bankName && <p>Name: {config.bankName}</p>}
                {config?.bankAccount && <p>Account No: <span className="font-mono">{config.bankAccount}</span></p>}
                {config?.bankIfsc && <p>IFSC: <span className="font-mono">{config.bankIfsc}</span></p>}
                {config?.bankBranch && <p>Branch: {config.bankBranch}</p>}
              </>
            ) : null}
          </div>
          {/* Right: QR code for Google review */}
          {reviewLink && (
            <div className="text-center no-print">
              <QrCode value={reviewLink} size={80} alt="Scan to leave a review" />
              <p className="text-[8px] mt-1 font-semibold text-gray-700">SCAN TO REVIEW</p>
              <p className="text-[7px] text-muted-foreground">Google Reviews</p>
            </div>
          )}
        </div>
      )}

      {/* Three-zone footer: Terms | Customer Signature arch | For Hotel Name */}
      <div className="grid grid-cols-3 gap-4 items-end">
        {/* Left: Terms */}
        <div className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <p className="font-bold">E. & O. E.</p>
          <p className="font-bold mt-1">Terms &amp; Conditions:</p>
          <p className="text-muted-foreground">1. Subjected to Mathura jurisdiction only.</p>
          <p className="text-muted-foreground">2. Goods once sold will not be taken back.</p>
          <p className="text-muted-foreground">3. Interest @ 24% p.a. will be charged if bill not paid within 15 days.</p>
        </div>

        {/* Center: Customer Signature arch */}
        <div className="flex flex-col items-center">
          <div
            className="w-32 h-12 border-2 border-black border-b-0"
            style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}
          />
          <p className="text-[10px] mt-1 font-medium">Customer Signature</p>
        </div>

        {/* Right: For Hotel Name */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Certified that the particulars given above are true and correct</p>
          <p className="text-xs mt-3">
            For: <span className="font-bold" style={{ color: '#B22222', fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {config?.name?.toUpperCase() || 'GURUVAYUR DHAM'}
            </span>
          </p>
          <p className="text-[10px] mt-6 text-muted-foreground">Authorised Signatory</p>
        </div>
      </div>

      {/* WhatsApp share bar — visible on screen only, hidden on print */}
      <div className="no-print mt-4 pt-3 border-t border-dashed flex items-center justify-between gap-2 flex-wrap">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-white"
          style={{ backgroundColor: '#25D366' }}
        >
          <WhatsAppIcon className="h-4 w-4" />
          Share Review Link via WhatsApp
        </a>
        <a
          href={reviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-underline hover:underline break-all"
        >
          {reviewLink}
        </a>
      </div>

      {/* GuardianX brand — minimal, centered, very small */}
      <div className="mt-4 pt-2 border-t border-dashed text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
        <Shield className="h-3 w-3" />
        <span>Made &amp; Maintained by</span>
        <strong className="font-semibold">GuardianX</strong>
      </div>
    </div>
  )
}

// WhatsApp glyph (lucide doesn't ship one)
function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.366.195 1.881.118.574-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// ====== Custom Invoices Tab ======
type CustomInvoice = {
  id: string; invoiceNumber: string; customerName: string; customerPhone: string | null
  customerAddress: string | null; items: any[]; itemsTotal: number
  cgstRate: number; sgstRate: number; cgstAmount: number; sgstAmount: number
  grandTotal: number; discount: number; paymentMethod: string | null; notes: string | null
  createdAt: string
}

function CustomInvoicesTab() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<CustomInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CustomInvoice | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const d = await apiFetch<{ invoices: CustomInvoice[] }>('/api/invoices/custom')
        if (active) { setInvoices(d.invoices); setLoading(false) }
      } catch (e: any) {
        if (active) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [toast])

  useEffect(() => {
    function onUpdated() { setLoading(true); apiFetch<{ invoices: CustomInvoice[] }>('/api/invoices/custom').then(d => { setInvoices(d.invoices); setLoading(false) }).catch(() => setLoading(false)) }
    window.addEventListener('invoice-updated', onUpdated)
    return () => window.removeEventListener('invoice-updated', onUpdated)
  }, [])

  async function view(id: string) {
    try {
      const d = await apiFetch<{ invoice: CustomInvoice }>(`/api/invoices/custom/${id}`)
      setSelected(d.invoice)
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  async function del(inv: CustomInvoice) {
    if (!confirm(`Delete custom invoice #${inv.invoiceNumber}? This cannot be undone.`)) return
    try {
      await apiFetch(`/api/invoices/custom/${inv.id}`, { method: 'DELETE' })
      toast({ title: 'Custom invoice deleted' })
      window.dispatchEvent(new CustomEvent('invoice-updated'))
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{invoices.length} custom invoice{invoices.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Custom Invoice
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-16" />)}</div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No custom invoices yet. Click "New Custom Invoice" to create one for any purpose — advance payments, misc charges, catering, etc.
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border divide-y">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition">
              <button onClick={() => view(inv.id)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">#{inv.invoiceNumber}</span>
                  <Badge variant="outline" className="text-xs">Custom</Badge>
                </div>
                <p className="text-sm mt-0.5 truncate">{inv.customerName} · {inv.items?.length || 0} item(s)</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(inv.createdAt)}</p>
              </button>
              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="font-semibold">{formatINR(inv.grandTotal)}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(inv)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomInvoiceCreateDialog open={showCreate} onOpenChange={setShowCreate} onDone={() => { setShowCreate(false); window.dispatchEvent(new CustomEvent('invoice-updated')) }} />
      <CustomInvoiceDialog invoice={selected} onClose={() => setSelected(null)} />
    </>
  )
}

// ====== Custom Invoice Create Dialog ======
function CustomInvoiceCreateDialog({ open, onOpenChange, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void
}) {
  const { toast } = useToast()
  const [config, setConfig] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerAddress: '', customerGstIn: '',
    customInvoiceNumber: '', checkInDate: '', checkOutDate: '',
    cgstRate: 0, sgstRate: 0, discount: 0, paymentMethod: 'Cash', notes: '',
  })
  const [items, setItems] = useState<{ name: string; quantity: number; rate: number }[]>([
    { name: '', quantity: 1, rate: 0 },
  ])

  useEffect(() => {
    if (open) {
      apiFetch<{ config: any }>('/api/config').then(d => {
        setConfig(d.config)
        setForm(f => ({ ...f, cgstRate: d.config?.cgstRate ?? 9, sgstRate: d.config?.sgstRate ?? 9 }))
      }).catch(() => {})
      setForm({ customerName: '', customerPhone: '', customerAddress: '', customerGstIn: '', customInvoiceNumber: '', checkInDate: '', checkOutDate: '', cgstRate: 0, sgstRate: 0, igstRate: 0, discount: 0, paymentMethod: 'Cash', notes: '' })
      setItems([{ name: '', quantity: 1, rate: 0 }])
    }
  }, [open])

  const itemsTotal = items.reduce((s, it) => s + (it.rate * it.quantity), 0)
  const taxable = Math.max(0, itemsTotal - (Number(form.discount) || 0))
  const useIgst = Number((form as any).igstRate) > 0
  const cgst = useIgst ? 0 : Math.round(taxable * (Number(form.cgstRate) || 0)) / 100
  const sgst = useIgst ? 0 : Math.round(taxable * (Number(form.sgstRate) || 0)) / 100
  const igst = useIgst ? Math.round(taxable * Number((form as any).igstRate || 0)) / 100 : 0
  const grandTotal = taxable + cgst + sgst + igst

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === 'name' ? value : Number(value) || 0 } : it))
  }
  function addItem() { setItems(prev => [...prev, { name: '', quantity: 1, rate: 0 }]) }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function submit() {
    if (!form.customerName.trim()) { toast({ title: 'Customer name is required', variant: 'destructive' }); return }
    const validItems = items.filter(it => it.name.trim() && it.rate > 0)
    if (validItems.length === 0) { toast({ title: 'Add at least one item with a name and price', variant: 'destructive' }); return }

    setSubmitting(true)
    try {
      const r = await apiFetch<{ invoice: CustomInvoice }>('/api/invoices/custom', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          items: validItems,
        }),
      })
      toast({ title: `Custom invoice #${r.invoice.invoiceNumber} created`, description: formatINR(r.invoice.grandTotal) })
      onDone()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> New Custom Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice number + Customer details */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice Number (leave blank for auto)">
              <Input value={(form as any).customInvoiceNumber || ''} onChange={e => setForm({ ...form, customInvoiceNumber: e.target.value } as any)} placeholder="Auto: 1, 2, 3..." />
            </Field>
            <Field label="Customer Name *">
              <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Name / Company" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone (optional)">
              <Input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="+91 ..." />
            </Field>
            <Field label="GSTIN (B2B billing)">
              <Input value={(form as any).customerGstIn || ''} onChange={e => setForm({ ...form, customerGstIn: e.target.value } as any)} placeholder="22AAAAA0000A1Z5" />
            </Field>
          </div>
          <Field label="Address (optional)">
            <Input value={form.customerAddress} onChange={e => setForm({ ...form, customerAddress: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in Date (optional)">
              <Input type="date" value={(form as any).checkInDate || ''} onChange={e => setForm({ ...form, checkInDate: e.target.value } as any)} />
            </Field>
            <Field label="Check-out Date (optional)">
              <Input type="date" value={(form as any).checkOutDate || ''} onChange={e => setForm({ ...form, checkOutDate: e.target.value } as any)} />
            </Field>
          </div>

          {/* Items builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Items</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add Row</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_32px] gap-2 items-center">
                  <Input placeholder="Item name / description" value={it.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="h-8 text-xs" />
                  <Input type="number" min={1} placeholder="Qty" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="h-8 text-xs" />
                  <Input type="number" min={0} placeholder="Rate" value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} className="h-8 text-xs" />
                  {items.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax + discount */}
          <div className="grid grid-cols-5 gap-3">
            <Field label="Discount (₹)">
              <Input type="number" min={0} value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} className="h-8 text-xs" />
            </Field>
            <Field label="IGST % (inter-state)">
              <Input type="number" step="0.1" min={0} value={(form as any).igstRate || 0} onChange={e => setForm({ ...form, igstRate: Number(e.target.value) } as any)} className="h-8 text-xs" placeholder="0" />
            </Field>
            {!useIgst && (
              <Field label="CGST %">
                <Input type="number" step="0.1" min={0} value={form.cgstRate} onChange={e => setForm({ ...form, cgstRate: Number(e.target.value) })} className="h-8 text-xs" />
              </Field>
            )}
            {!useIgst && (
              <Field label="SGST %">
                <Input type="number" step="0.1" min={0} value={form.sgstRate} onChange={e => setForm({ ...form, sgstRate: Number(e.target.value) })} className="h-8 text-xs" />
              </Field>
            )}
            <Field label="Payment">
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="h-8 text-xs w-full border rounded px-1">
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Mixed">Mixed</option>
              </select>
            </Field>
          </div>

          <Field label="Notes (optional)">
            <Textarea rows={1} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="text-xs" />
          </Field>

          {/* Live totals */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Items Total</span><span className="font-mono">{formatINR(itemsTotal)}</span></div>
            {form.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span className="font-mono">- {formatINR(form.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="font-mono">{formatINR(taxable)}</span></div>
            {useIgst ? (
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">IGST ({(form as any).igstRate}%)</span><span className="font-mono">{formatINR(igst)}</span></div>
            ) : (
              <>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">CGST ({form.cgstRate}%)</span><span className="font-mono">{formatINR(cgst)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">SGST ({form.sgstRate}%)</span><span className="font-mono">{formatINR(sgst)}</span></div>
              </>
            )}
            <div className="flex justify-between font-bold pt-1 border-t"><span>Grand Total</span><span className="font-mono text-primary">{formatINR(grandTotal)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating...' : `Create Invoice (${formatINR(grandTotal)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====== Custom Invoice View Dialog (printable) ======
function CustomInvoiceDialog({ invoice, onClose }: { invoice: CustomInvoice | null; onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
  }, [])

  if (!invoice) return null

  const items: any[] = invoice.items as any[] || []

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Custom Invoice #{invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print bg-white p-4" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '100%' }}>
          <InvoiceHeader config={config} invoiceNumber={invoice.invoiceNumber} title="CUSTOM INVOICE" copyNote="Original" />

          {/* Customer details */}
          <div className="mt-3 mb-3 space-y-1">
            <LeaderRow>
              <LeaderField label="Name" value={invoice.customerName} />
              <LeaderField label="Mob" value={invoice.customerPhone || '—'} width="w-44" />
            </LeaderRow>
            <LeaderRow>
              <LeaderField label="Address" value={invoice.customerAddress || '—'} />
              <LeaderField label="Date" value={formatDateShort(invoice.createdAt)} width="w-48" />
            </LeaderRow>
          </div>

          {/* Items table */}
          <table className="w-full text-xs border-collapse border border-black mt-3" style={{ fontFamily: 'Arial, sans-serif', tableLayout: 'fixed', wordWrap: 'break-word' }}>
            <thead>
              <tr className="bg-gray-200 border-b border-black">
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '8%' }}>Sr. No</th>
                <th className="text-left py-2 px-2 border-r border-black" style={{ width: '52%' }}>Particulars</th>
                <th className="text-right py-2 px-2 border-r border-black" style={{ width: '20%' }}>Rate</th>
                <th className="text-right py-2 px-2" style={{ width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => (
                <tr key={idx} className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-black">{it.name}</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono">{it.quantity} × {formatINR(it.rate)}</td>
                  <td className="text-right py-2 px-2 font-mono">{formatINR(it.amount)}</td>
                </tr>
              ))}
              {invoice.discount > 0 && (
                <tr className="border-b border-black">
                  <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Discount</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-700">- {formatINR(invoice.discount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Total</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(invoice.itemsTotal - invoice.discount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax breakdown */}
          <div className="mt-3 flex justify-end">
            <InvoiceTotals rows={[
              { label: 'Taxable Amount', value: invoice.itemsTotal - invoice.discount },
              ...(invoice.cgstAmount > 0 ? [{ label: `CGST (${invoice.cgstRate}%)`, value: invoice.cgstAmount }] : []),
              ...(invoice.sgstAmount > 0 ? [{ label: `SGST (${invoice.sgstRate}%)`, value: invoice.sgstAmount }] : []),
              ...(invoice.igstAmount > 0 ? [{ label: `IGST (${invoice.igstRate}%)`, value: invoice.igstAmount }] : []),
              { label: 'G. TOTAL', value: invoice.grandTotal, bold: true, doubleTop: true, primary: true },
            ]} />
          </div>

          {invoice.paymentMethod && (
            <p className="text-xs mt-3">Payment Method: <strong>{invoice.paymentMethod}</strong></p>
          )}
          {invoice.notes && <p className="text-xs mt-1 text-muted-foreground italic">Notes: {invoice.notes}</p>}

          <InvoiceFooter config={config} />
        </div>

        <DialogFooter className="no-print">
          <Button variant="destructive" onClick={async () => {
            if (!confirm('Delete this custom invoice permanently?')) return
            try {
              await apiFetch(`/api/invoices/custom/${invoice.id}`, { method: 'DELETE' })
              toast({ title: 'Custom invoice deleted' })
              window.dispatchEvent(new CustomEvent('invoice-updated'))
              onClose()
            } catch (e: any) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }) }
          }}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => printInvoice()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
