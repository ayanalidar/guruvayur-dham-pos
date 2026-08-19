'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Printer, Download, FileText, Calendar, IndianRupee, Receipt, Utensils, Bed } from 'lucide-react'
import { formatINR, formatDateShort, formatDate, apiFetch } from '@/lib/format'

type DayClose = {
  date: string
  summary: {
    hotelRevenue: number
    foodRevenue: number
    totalRevenue: number
    hotelInvoices: number
    foodInvoices: number
    foodOrders: number
    checkIns: number
    checkOuts: number
    gstCollected: { cgst: number; sgst: number; total: number }
  }
  occupancy: { totalRooms: number; available: number; occupied: number; cleaning: number; maintenance: number }
  paymentBreakdown: { hotel: Record<string, { count: number; total: number }>; food: Record<string, { count: number; total: number }> }
  topItems: Array<{ name: string; quantity: number; revenue: number }>
  transactions: {
    hotelInvoices: Array<{ invoiceNumber: string; guestName: string; roomNumber: string; grandTotal: number; paymentMethod: string | null; createdAt: string }>
    foodInvoices: Array<{ invoiceNumber: string; customerName: string; grandTotal: number; paymentMethod: string | null; createdAt: string }>
    checkIns: Array<{ id: string; guestName: string; roomNumber: string; checkInAt: string; advanceAmount: number }>
  }
}

export function ReportsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">Day-close Z-Report and GST return export for accounting.</p>
      </div>
      <Tabs defaultValue="day-close">
        <TabsList>
          <TabsTrigger value="day-close"><Calendar className="h-4 w-4 mr-1.5" /> Day-Close / Z-Report</TabsTrigger>
          <TabsTrigger value="gst"><Download className="h-4 w-4 mr-1.5" /> GST Export (CSV)</TabsTrigger>
        </TabsList>
        <TabsContent value="day-close" className="mt-4"><DayCloseTab /></TabsContent>
        <TabsContent value="gst" className="mt-4"><GstExportTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function DayCloseTab() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<DayClose | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const d = await apiFetch<DayClose>(`/api/reports/day-close?date=${date}`)
      setReport(d)
    } catch (e: any) {
      toast({ title: 'Failed to load report', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function printReport() {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>
          <Calendar className="h-4 w-4 mr-2" /> {loading ? 'Loading...' : 'Generate Report'}
        </Button>
        {report && (
          <Button variant="outline" onClick={printReport}>
            <Printer className="h-4 w-4 mr-2" /> Print Z-Report
          </Button>
        )}
      </div>

      {report && (
        <div className="invoice-print bg-white p-6 rounded-lg border space-y-4">
          {/* Header */}
          <div className="text-center border-b-2 border-red-800 pb-3">
            <h1 className="text-2xl font-bold" style={{ color: '#B22222', fontFamily: 'Georgia, serif' }}>
              HOTEL GURUVAYUR DHAM
            </h1>
            <p className="text-xs text-muted-foreground">Mathura, Uttar Pradesh</p>
            <p className="text-sm font-bold mt-2 uppercase tracking-wider">Day-Close Z-Report</p>
            <p className="text-sm">Date: {formatDateShort(report.date)}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Total Revenue" value={formatINR(report.summary.totalRevenue)} icon={<IndianRupee className="h-4 w-4" />} highlight />
            <StatBox label="Hotel Revenue" value={formatINR(report.summary.hotelRevenue)} icon={<Bed className="h-4 w-4" />} />
            <StatBox label="Food Revenue" value={formatINR(report.summary.foodRevenue)} icon={<Utensils className="h-4 w-4" />} />
            <StatBox label="GST Collected" value={formatINR(report.summary.gstCollected.total)} icon={<Receipt className="h-4 w-4" />} />
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Check-ins</p><p className="font-bold text-lg">{report.summary.checkIns}</p></div>
            <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Hotel Invoices</p><p className="font-bold text-lg">{report.summary.hotelInvoices}</p></div>
            <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Food Invoices</p><p className="font-bold text-lg">{report.summary.foodInvoices}</p></div>
            <div className="rounded border p-2"><p className="text-xs text-muted-foreground">Food Orders</p><p className="font-bold text-lg">{report.summary.foodOrders}</p></div>
          </div>

          {/* Occupancy */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Room Occupancy (end of day)</h3>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="rounded border p-2 text-center"><p className="text-muted-foreground">Available</p><p className="font-bold text-lg text-emerald-600">{report.occupancy.available}</p></div>
              <div className="rounded border p-2 text-center"><p className="text-muted-foreground">Occupied</p><p className="font-bold text-lg text-rose-600">{report.occupancy.occupied}</p></div>
              <div className="rounded border p-2 text-center"><p className="text-muted-foreground">Cleaning</p><p className="font-bold text-lg text-amber-600">{report.occupancy.cleaning}</p></div>
              <div className="rounded border p-2 text-center"><p className="text-muted-foreground">Maintenance</p><p className="font-bold text-lg text-slate-600">{report.occupancy.maintenance}</p></div>
              <div className="rounded border p-2 text-center"><p className="text-muted-foreground">Total</p><p className="font-bold text-lg">{report.occupancy.totalRooms}</p></div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Hotel Payments</h3>
              {Object.keys(report.paymentBreakdown.hotel).length === 0 ? (
                <p className="text-xs text-muted-foreground">No hotel invoices today.</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b"><th className="text-left py-1">Method</th><th className="text-right py-1">Count</th><th className="text-right py-1">Total</th></tr></thead>
                  <tbody>
                    {Object.entries(report.paymentBreakdown.hotel).map(([m, v]) => (
                      <tr key={m} className="border-b"><td className="py-1">{m}</td><td className="text-right">{v.count}</td><td className="text-right font-mono">{formatINR(v.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Food Payments</h3>
              {Object.keys(report.paymentBreakdown.food).length === 0 ? (
                <p className="text-xs text-muted-foreground">No food invoices today.</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b"><th className="text-left py-1">Method</th><th className="text-right py-1">Count</th><th className="text-right py-1">Total</th></tr></thead>
                  <tbody>
                    {Object.entries(report.paymentBreakdown.food).map(([m, v]) => (
                      <tr key={m} className="border-b"><td className="py-1">{m}</td><td className="text-right">{v.count}</td><td className="text-right font-mono">{formatINR(v.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top items */}
          {report.topItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Top-Selling Items Today</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b bg-muted/40"><th className="text-left py-1 px-2">#</th><th className="text-left py-1 px-2">Item</th><th className="text-right py-1 px-2">Qty Sold</th><th className="text-right py-1 px-2">Revenue</th></tr></thead>
                <tbody>
                  {report.topItems.map((it, i) => (
                    <tr key={it.name} className="border-b"><td className="py-1 px-2">{i + 1}</td><td className="py-1 px-2">{it.name}</td><td className="text-right py-1 px-2">{it.quantity}</td><td className="text-right py-1 px-2 font-mono">{formatINR(it.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Hotel Invoices ({report.transactions.hotelInvoices.length})</h3>
              <div className="max-h-48 overflow-y-auto rounded border">
                {report.transactions.hotelInvoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">None today.</p>
                ) : (
                  <ul className="divide-y text-xs">
                    {report.transactions.hotelInvoices.map(inv => (
                      <li key={inv.invoiceNumber} className="p-2 flex justify-between">
                        <span>{inv.invoiceNumber} · {inv.guestName} (Rm {inv.roomNumber})</span>
                        <span className="font-mono">{formatINR(inv.grandTotal)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Food Invoices ({report.transactions.foodInvoices.length})</h3>
              <div className="max-h-48 overflow-y-auto rounded border">
                {report.transactions.foodInvoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">None today.</p>
                ) : (
                  <ul className="divide-y text-xs">
                    {report.transactions.foodInvoices.map(inv => (
                      <li key={inv.invoiceNumber} className="p-2 flex justify-between">
                        <span>{inv.invoiceNumber} · {inv.customerName}</span>
                        <span className="font-mono">{formatINR(inv.grandTotal)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-muted-foreground pt-3 border-t">
            <p>Generated on {formatDate(new Date())}</p>
            <p className="mt-1">Made &amp; Maintained by <strong>GuardianX</strong></p>
          </div>
        </div>
      )}
    </div>
  )
}

function GstExportTab() {
  const { toast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  function download() {
    // Direct download via URL
    const url = `/api/reports/gst-export?from=${from}&to=${to}`
    const a = document.createElement('a')
    a.href = url
    a.download = `gst-export-${from}-to-${to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast({ title: 'CSV download started', description: `${from} to ${to}` })
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Monthly GST Return Export</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Download all invoices (hotel + food) in a date range as a CSV file.
          Includes invoice number, date, customer, taxable amount, CGST/SGST breakup, and grand total.
          Ready to upload to the GST portal.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={download} disabled={!from || !to}>
            <Download className="h-4 w-4 mr-2" /> Download CSV
          </Button>
          <Button variant="outline" onClick={() => {
            const d = new Date()
            const first = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10)
            const last = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10)
            setFrom(first); setTo(last)
          }}>
            Last Month
          </Button>
          <Button variant="outline" onClick={() => {
            const d = new Date()
            const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
            setFrom(first); setTo(today)
          }}>
            This Month
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-lg font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}
