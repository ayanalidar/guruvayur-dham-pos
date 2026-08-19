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
import { formatINR, formatDateShort, formatDate, formatTime, apiFetch } from '@/lib/format'

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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Hotel Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print bg-white p-2">
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

          {/* Customer details with dotted leader lines (matches sample) */}
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

          {/* Itemized table — Sr.No | Particulars | Rate | Amount (matches sample) */}
          <table className="w-full text-xs border-collapse border border-black" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                  Room Charges — Room {invoice.roomNumber} ({invoice.roomType})
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Check-in: {formatDateShort(invoice.checkInAt)} · Check-out: {formatDateShort(invoice.checkOutAt)} · {invoice.nights} night(s)
                  </span>
                </td>
                <td className="text-right py-2 px-2 border-r border-black font-mono">{formatINR(invoice.ratePerNight)}</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(invoice.roomCharges)}</td>
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
              {invoice.extraCharges > 0 && (
                <tr className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{foodOrders.length + 2}</td>
                  <td className="py-2 px-2 border-r border-black">Extra Charges</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono text-muted-foreground">—</td>
                  <td className="text-right py-2 px-2 font-mono">{formatINR(invoice.extraCharges)}</td>
                </tr>
              )}
              {invoice.discount > 0 && (
                <tr className="border-b border-black">
                  <td className="py-2 px-2 border-r border-black text-center">{foodOrders.length + (invoice.extraCharges > 0 ? 3 : 2)}</td>
                  <td className="py-2 px-2 border-r border-black">Discount</td>
                  <td className="text-right py-2 px-2 border-r border-black font-mono text-muted-foreground">—</td>
                  <td className="text-right py-2 px-2 font-mono text-emerald-700">- {formatINR(invoice.discount)}</td>
                </tr>
              )}
              {/* Total row */}
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Total</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(invoice.taxableAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax breakdown — matches sample's dotted leader style */}
          <div className="mt-3 flex justify-end">
            <InvoiceTotals
              rows={[
                { label: 'Taxable Amount', value: invoice.taxableAmount },
                { label: `CGST (${invoice.cgstRate}%)`, value: invoice.cgstAmount },
                { label: `SGST (${invoice.sgstRate}%)`, value: invoice.sgstAmount },
                { label: 'G. TOTAL', value: invoice.grandTotal, bold: true, doubleTop: true, primary: true },
                { label: 'Advance Paid', value: -invoice.advancePaid, muted: true, emerald: true },
                { label: 'Balance Due', value: invoice.balanceDue, bold: true, primary: true },
              ]}
            />
          </div>

          {invoice.paymentMethod && (
            <p className="text-xs mt-3">Payment Method: <strong>{invoice.paymentMethod}</strong></p>
          )}
          {invoice.notes && <p className="text-xs mt-1 text-muted-foreground italic">Notes: {invoice.notes}</p>}

          <InvoiceFooter config={config} />
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" /> Food Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="invoice-print bg-white p-2">
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

          {/* Customer details with dotted leader lines */}
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

          {/* Itemized table — same style as hotel invoice */}
          <table className="w-full text-xs border-collapse border border-black" style={{ fontFamily: 'Arial, sans-serif' }}>
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
              {/* Total row */}
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={3} className="py-2 px-2 text-right border-r border-black">Total</td>
                <td className="text-right py-2 px-2 font-mono">{formatINR(invoice.itemsTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax breakdown */}
          <div className="mt-3 flex justify-end">
            <InvoiceTotals
              rows={[
                { label: 'Taxable Amount', value: invoice.itemsTotal },
                { label: `CGST (${invoice.cgstRate.toFixed(1)}%)`, value: invoice.cgstAmount },
                { label: `SGST (${invoice.sgstRate.toFixed(1)}%)`, value: invoice.sgstAmount },
                { label: 'G. TOTAL', value: invoice.grandTotal, bold: true, doubleTop: true, primary: true },
              ]}
            />
          </div>

          <p className="text-[10px] mt-3 text-muted-foreground">
            Order Ref: <span className="font-mono">{invoice.order.orderNumber}</span>
          </p>
          {invoice.paymentMethod && (
            <p className="text-xs mt-1">Payment Method: <strong>{invoice.paymentMethod}</strong></p>
          )}
          {invoice.notes && <p className="text-xs mt-1 text-muted-foreground italic">Notes: {invoice.notes}</p>}

          <InvoiceFooter config={config} />
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
  return (
    <div className="mt-6 pt-3 border-t border-gray-300">
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

      {/* GuardianX brand — minimal, centered, very small */}
      <div className="mt-4 pt-2 border-t border-dashed text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
        <Shield className="h-3 w-3" />
        <span>Made &amp; Maintained by</span>
        <strong className="font-semibold">GuardianX</strong>
      </div>
    </div>
  )
}
