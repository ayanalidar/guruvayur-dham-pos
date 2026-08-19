'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Receipt, Utensils, Printer, RefreshCw, FileText, Plus, Pencil, Shield, CheckCircle2, X } from 'lucide-react'
import { formatINR, formatDateShort, formatDate, apiFetch } from '@/lib/format'
import { GuardianXBrand } from './guardianx-brand'

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

type Config = { name: string; address: string; phone: string; email: string; gstNumber: string; sacCode: string; cgstRate: number; sgstRate: number }

export function InvoicesPanel() {
  const [tab, setTab] = useState<'hotel' | 'food'>('hotel')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Invoices</h2>
        <p className="text-sm text-muted-foreground">Hotel invoices (room billing) and separate Food invoices for kitchen orders.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="hotel"><Receipt className="h-4 w-4 mr-1.5" /> Hotel Invoices</TabsTrigger>
          <TabsTrigger value="food"><Utensils className="h-4 w-4 mr-1.5" /> Food Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="hotel" className="mt-4"><HotelInvoicesTab /></TabsContent>
        <TabsContent value="food" className="mt-4"><FoodInvoicesTab /></TabsContent>
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
  const [config, setConfig] = useState<Config | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedNumber, setEditedNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
  }, [])

  // Reset edit state whenever a new invoice is opened
  useEffect(() => {
    if (invoice) {
      setEditMode(false)
      setEditedNumber(invoice.invoiceNumber)
    }
  }, [invoice?.id])

  if (!invoice) return null

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
      // mutate local state (so UI updates without refetch)
      Object.assign(invoice, { invoiceNumber: r.invoice.invoiceNumber })
      setEditMode(false)
      // refresh the parent list by triggering reload via onClose + reopen
      // simpler: just trigger a window event
      window.dispatchEvent(new CustomEvent('invoice-updated'))
    } catch (e: any) {
      // toast via parent — for now just alert
      setEditedNumber(invoice.invoiceNumber)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Hotel Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print">
          <InvoiceHeader
            config={config}
            invoiceNumber={invoice.invoiceNumber}
            title="HOTEL INVOICE"
            editableNumber={editMode ? editedNumber : null}
            onNumberChange={setEditedNumber}
            onSaveNumber={saveInvoiceNumber}
            onCancelEdit={() => { setEditMode(false); setEditedNumber(invoice.invoiceNumber) }}
            onEditClick={() => setEditMode(true)}
            savingNumber={saving}
          />

          <div className="grid grid-cols-2 gap-3 text-sm mt-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Bill To</p>
              <p className="font-semibold">{invoice.guestName}</p>
              <p className="text-xs">{invoice.guestPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          {/* Stay info */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <KV k="Room" v={invoice.roomNumber} />
            <KV k="Type" v={invoice.roomType} />
            <KV k="Nights" v={String(invoice.nights)} />
            <KV k="Check-in" v={formatDateShort(invoice.checkInAt)} />
            <KV k="Check-out" v={formatDateShort(invoice.checkOutAt)} />
            <KV k="Rate / Night" v={formatINR(invoice.ratePerNight)} />
          </div>

          {/* Itemized table */}
          <table className="w-full text-xs border-collapse mb-3">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-1.5 px-2">Description</th>
                <th className="text-right py-1.5 px-2">Qty</th>
                <th className="text-right py-1.5 px-2">Rate</th>
                <th className="text-right py-1.5 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 px-2">Room charges (Room {invoice.roomNumber})</td>
                <td className="text-right py-1.5 px-2">{invoice.nights}</td>
                <td className="text-right py-1.5 px-2">{formatINR(invoice.ratePerNight)}</td>
                <td className="text-right py-1.5 px-2">{formatINR(invoice.roomCharges)}</td>
              </tr>
              {foodOrders.map(fo => (
                <tr key={fo.id} className="border-b bg-muted/10">
                  <td className="py-1.5 px-2">
                    Food Order {fo.orderNumber}
                    <span className="text-muted-foreground ml-1">({formatDateShort(fo.createdAt)})</span>
                    <ul className="mt-0.5 ml-3 text-[10px] text-muted-foreground list-disc">
                      {fo.items.map(it => <li key={it.id}>{it.quantity}× {it.name} — {formatINR(it.total)}</li>)}
                    </ul>
                  </td>
                  <td className="text-right py-1.5 px-2">—</td>
                  <td className="text-right py-1.5 px-2">—</td>
                  <td className="text-right py-1.5 px-2">{formatINR(fo.grandTotal)}</td>
                </tr>
              ))}
              {invoice.extraCharges > 0 && (
                <tr className="border-b">
                  <td className="py-1.5 px-2">Extra charges</td>
                  <td colSpan={2} className="text-right py-1.5 px-2">—</td>
                  <td className="text-right py-1.5 px-2">{formatINR(invoice.extraCharges)}</td>
                </tr>
              )}
              {invoice.discount > 0 && (
                <tr className="border-b">
                  <td className="py-1.5 px-2">Discount</td>
                  <td colSpan={2} className="text-right py-1.5 px-2">—</td>
                  <td className="text-right py-1.5 px-2 text-emerald-700">- {formatINR(invoice.discount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <InvoiceTotals
            rows={[
              { label: 'Taxable Amount', value: invoice.taxableAmount },
              { label: `CGST (${invoice.cgstRate}%)`, value: invoice.cgstAmount },
              { label: `SGST (${invoice.sgstRate}%)`, value: invoice.sgstAmount },
              { label: 'Grand Total', value: invoice.grandTotal, bold: true },
              { label: 'Advance Paid', value: -invoice.advancePaid, muted: true, emerald: true },
              { label: 'Balance Due', value: invoice.balanceDue, bold: true, primary: true },
            ]}
          />

          {invoice.paymentMethod && (
            <p className="text-xs mt-3">Payment Method: <strong>{invoice.paymentMethod}</strong></p>
          )}
          {invoice.notes && <p className="text-xs mt-1 text-muted-foreground">Notes: {invoice.notes}</p>}

          <InvoiceFooter config={config} sacCode={invoice.cgstRate ? `${config?.sacCode || ''}` : ''} />
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FoodInvoiceDialog({ invoice, onClose }: { invoice: FoodInvoice | null; onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedNumber, setEditedNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ config: Config }>('/api/config').then(d => setConfig(d.config)).catch(() => {})
  }, [])

  useEffect(() => {
    if (invoice) {
      setEditMode(false)
      setEditedNumber(invoice.invoiceNumber)
    }
  }, [invoice?.id])

  if (!invoice) return null

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
      setEditedNumber(invoice.invoiceNumber)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" /> Food Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print">
          <InvoiceHeader
            config={config}
            invoiceNumber={invoice.invoiceNumber}
            title="FOOD INVOICE"
            editableNumber={editMode ? editedNumber : null}
            onNumberChange={setEditedNumber}
            onSaveNumber={saveInvoiceNumber}
            onCancelEdit={() => { setEditMode(false); setEditedNumber(invoice.invoiceNumber) }}
            onEditClick={() => setEditMode(true)}
            savingNumber={saving}
          />

          <div className="grid grid-cols-2 gap-3 text-sm mt-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Bill To</p>
              <p className="font-semibold">{invoice.customerName}</p>
              {invoice.roomNumber && <p className="text-xs">Room {invoice.roomNumber}</p>}
              {invoice.tableNumber && <p className="text-xs">Table {invoice.tableNumber}</p>}
              <p className="text-xs capitalize mt-0.5">{invoice.orderType.replace('_', ' ')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Invoice Date</p>
              <p className="text-sm">{formatDate(invoice.createdAt)}</p>
              <p className="text-xs text-muted-foreground mt-1">Order Ref</p>
              <p className="text-sm font-mono">{invoice.order.orderNumber}</p>
            </div>
          </div>

          {/* Itemized table */}
          <table className="w-full text-xs border-collapse mb-3">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-1.5 px-2">Item</th>
                <th className="text-right py-1.5 px-2">Qty</th>
                <th className="text-right py-1.5 px-2">Rate</th>
                <th className="text-right py-1.5 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.order.items.map(it => (
                <tr key={it.id} className="border-b">
                  <td className="py-1.5 px-2">{it.name}</td>
                  <td className="text-right py-1.5 px-2">{it.quantity}</td>
                  <td className="text-right py-1.5 px-2">{formatINR(it.price)}</td>
                  <td className="text-right py-1.5 px-2">{formatINR(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <InvoiceTotals
            rows={[
              { label: 'Items Total', value: invoice.itemsTotal },
              { label: `CGST (${invoice.cgstRate.toFixed(1)}%)`, value: invoice.cgstAmount },
              { label: `SGST (${invoice.sgstRate.toFixed(1)}%)`, value: invoice.sgstAmount },
              { label: 'Grand Total', value: invoice.grandTotal, bold: true },
            ]}
          />

          {invoice.paymentMethod && (
            <p className="text-xs mt-3">Payment Method: <strong>{invoice.paymentMethod}</strong></p>
          )}
          {invoice.notes && <p className="text-xs mt-1 text-muted-foreground">Notes: {invoice.notes}</p>}

          <InvoiceFooter config={config} sacCode="" />
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- shared invoice bits -----

function InvoiceHeader({
  config, invoiceNumber, title,
  editableNumber = null,
  onNumberChange, onSaveNumber, onCancelEdit, onEditClick, savingNumber = false,
}: {
  config: Config | null; invoiceNumber: string; title: string
  editableNumber?: string | null
  onNumberChange?: (v: string) => void
  onSaveNumber?: () => void
  onCancelEdit?: () => void
  onEditClick?: () => void
  savingNumber?: boolean
}) {
  return (
    <div className="border-b-2 border-primary pb-3 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary leading-tight">{config?.name || 'Hotel GuruVayurDham'}</h1>
          {config?.address && <p className="text-xs text-muted-foreground mt-0.5">{config.address}</p>}
          <p className="text-xs text-muted-foreground">
            {config?.phone && `Tel: ${config.phone}`}
            {config?.email && ` · ${config.email}`}
          </p>
          {config?.gstNumber && <p className="text-xs text-muted-foreground">GSTIN: {config.gstNumber}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold uppercase tracking-wider">{title}</p>
          {editableNumber !== null ? (
            <div className="mt-1 flex items-center gap-1 no-print">
              <Input
                value={editableNumber}
                onChange={e => onNumberChange?.(e.target.value)}
                className="h-7 text-xs font-mono w-36"
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
            <div className="mt-1 flex items-center justify-end gap-1 group">
              <p className="font-mono text-sm font-semibold">{invoiceNumber}</p>
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
      </div>
    </div>
  )
}

function InvoiceTotals({ rows }: {
  rows: Array<{ label: string; value: number; bold?: boolean; muted?: boolean; emerald?: boolean; primary?: boolean }>
}) {
  return (
    <div className="ml-auto max-w-xs space-y-1">
      {rows.map((r, i) => (
        <div key={i} className={`flex justify-between text-sm ${r.muted ? 'text-muted-foreground' : ''} ${r.emerald ? 'text-emerald-700' : ''} ${r.primary ? 'text-primary' : ''} ${r.bold ? 'font-bold' : ''}`}>
          <span>{r.label}</span>
          <span className="font-mono">{r.value < 0 ? '- ' : ''}{formatINR(Math.abs(r.value))}</span>
        </div>
      ))}
    </div>
  )
}

function InvoiceFooter({ config, sacCode }: { config: Config | null; sacCode: string }) {
  return (
    <div className="mt-6 pt-3 border-t border-dashed text-center text-xs text-muted-foreground">
      <p className="font-medium">Thank you for staying with us! Visit again.</p>
      {config?.email && <p>{config.email}</p>}
      {sacCode && <p className="mt-1">SAC Code: {sacCode}</p>}
      <p className="mt-2 text-[10px] italic">This is a computer-generated invoice and is valid without signature.</p>
      <div className="mt-3 pt-2 border-t border-dashed flex items-center justify-center gap-1 text-[10px]">
        <Shield className="h-3 w-3" />
        <span>Made &amp; Maintained by</span>
        <strong className="font-semibold">GuardianX</strong>
      </div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</p>
      <p className="text-sm font-medium">{v}</p>
    </div>
  )
}
