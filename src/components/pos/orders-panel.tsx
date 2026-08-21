'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Clock, ChefHat, CheckCircle2, Utensils, X, RefreshCw, Receipt, Leaf, Drumstick, Download } from 'lucide-react'
import { formatINR, formatDate, apiFetch } from '@/lib/format'
import { downloadOrders } from '@/lib/download'

type FoodOrder = {
  id: string; orderNumber: string; customerName: string; roomNumber: string | null; tableNumber: string | null
  orderType: string; status: string; paymentMode: string
  itemsTotal: number; cgstAmount: number; sgstAmount: number; grandTotal: number
  notes: string | null; createdAt: string
  checkIn?: { guest: { name: string }; room: { number: string } } | null
  foodInvoice?: { id: string; invoiceNumber: string } | null
  items: Array<{ id: string; name: string; price: number; quantity: number; total: number; isVeg?: boolean }>
}

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'served'] as const
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', preparing: 'Preparing', ready: 'Ready', served: 'Served', cancelled: 'Cancelled',
}

export function OrdersPanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { toast } = useToast()
  const [orders, setOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch<{ orders: FoodOrder[] }>('/api/orders')
      setOrders(d.orders)
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
        const d = await apiFetch<{ orders: FoodOrder[] }>('/api/orders')
        if (active) { setOrders(d.orders); setLoading(false) }
      } catch (e: any) {
        if (active) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [toast])

  // No polling — refresh on visibility change only (avoids blinking cards)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  async function updateStatus(order: FoodOrder, status: string) {
    try {
      await apiFetch(`/api/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast({ title: `${order.orderNumber} → ${STATUS_LABELS[status]}` })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  async function createFoodInvoice(order: FoodOrder) {
    try {
      const r = await apiFetch<{ invoice: any }>('/api/invoices/food', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, paymentMethod: 'Cash' }),
      })
      toast({
        title: `Food invoice generated: ${r.invoice.invoiceNumber}`,
        description: 'View & print from the Invoices tab → Food Invoices',
      })
      load()
      onNavigate?.('invoices')
    } catch (e: any) {
      toast({ title: 'Failed to create invoice', description: e.message, variant: 'destructive' })
    }
  }

  // Print KOT — opens a kitchen-only ticket (no prices) in a new window for printing.
  async function printKOT(order: FoodOrder) {
    try {
      const r = await apiFetch<{ kot: any }>(`/api/orders/${order.id}/kot`)
      const kot = r.kot
      // Open a new window with the KOT HTML and trigger print
      const win = window.open('', '_blank', 'width=400,height=600')
      if (!win) {
        toast({ title: 'Popup blocked', description: 'Please allow popups to print KOT', variant: 'destructive' })
        return
      }
      const itemsHTML = kot.items.map((it: any, i: number) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px dashed #999;font-weight:bold;width:30px;text-align:center;">${it.quantity}×</td>
          <td style="padding:6px 8px;border-bottom:1px dashed #999;">${it.name}${it.notes ? `<br><small style="color:#666">Note: ${it.notes}</small>` : ''}</td>
        </tr>
      `).join('')
      win.document.write(`
        <!DOCTYPE html><html><head><title>KOT ${kot.orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 16px; max-width: 300px; margin: 0 auto; }
          h1 { text-align: center; color: #B22222; font-family: Georgia, serif; font-size: 18px; margin: 0 0 4px; }
          .sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 8px; }
          .kot-title { text-align: center; font-weight: bold; font-size: 14px; padding: 6px; border: 1px dashed #000; margin: 8px 0; }
          .meta { font-size: 12px; line-height: 1.5; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
          .total { text-align: center; font-weight: bold; padding: 8px; border-top: 2px dashed #000; margin-top: 8px; }
          .footer { text-align: center; font-size: 10px; color: #888; margin-top: 16px; }
          @media print { body { max-width: none; } }
        </style></head><body>
          <h1>HOTEL GURUVAYUR DHAM</h1>
          <p class="sub">Mathura, Uttar Pradesh</p>
          <div class="kot-title">🔴 KITCHEN ORDER TICKET 🔴</div>
          <div class="meta">
            <strong>Order:</strong> ${kot.orderNumber}<br>
            <strong>Time:</strong> ${new Date(kot.createdAt).toLocaleString('en-IN')}<br>
            <strong>Type:</strong> ${kot.orderType.replace('_', ' ').toUpperCase()}<br>
            <strong>Customer:</strong> ${kot.customerName}<br>
            ${kot.roomNumber ? `<strong>Room:</strong> ${kot.roomNumber}<br>` : ''}
            ${kot.tableNumber ? `<strong>Table:</strong> ${kot.tableNumber}<br>` : ''}
            <strong>Items:</strong> ${kot.itemCount}
          </div>
          <table>
            <thead><tr style="border-bottom:2px solid #000;"><th style="padding:4px 8px;text-align:left;">Qty</th><th style="padding:4px 8px;text-align:left;">Item</th></tr></thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          ${kot.notes ? `<div style="padding:8px;border:1px dashed #B22222;background:#FFF5F5;margin-top:8px;font-size:12px;"><strong>Special Note:</strong> ${kot.notes}</div>` : ''}
          <div class="total">${kot.itemCount} ITEMS — PREPARE NOW</div>
          <div class="footer">KOT — no prices shown · GuardianX POS</div>
        </body></html>
      `)
      win.document.close()
      setTimeout(() => { win.focus(); win.print() }, 250)
    } catch (e: any) {
      toast({ title: 'Failed to generate KOT', description: e.message, variant: 'destructive' })
    }
  }

  const filtered = orders.filter(o => {
    if (filter === 'active') return ['pending', 'preparing', 'ready'].includes(o.status)
    if (filter === 'served') return o.status === 'served'
    if (filter === 'cancelled') return o.status === 'cancelled'
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Food Orders</h2>
          <p className="text-sm text-muted-foreground">
            {orders.filter(o => ['pending', 'preparing'].includes(o.status)).length} active · {orders.filter(o => o.status === 'served').length} served today
          </p>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button><Button variant="outline" size="sm" onClick={() => downloadOrders()}><Download className="h-4 w-4 mr-2" /> CSV</Button></div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="served">Served</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No orders in this view.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              onStatus={updateStatus}
              onNavigate={onNavigate}
              onCreateFoodInvoice={createFoodInvoice}
              onPrintKOT={printKOT}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const OrderCard = memo(function OrderCard({ order, onStatus, onNavigate, onCreateFoodInvoice, onPrintKOT }: {
  order: FoodOrder
  onStatus: (o: FoodOrder, s: string) => void
  onNavigate?: (t: string) => void
  onCreateFoodInvoice?: (o: FoodOrder) => void
  onPrintKOT?: (o: FoodOrder) => void
}) {
  const statusCfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    pending:   { cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3 w-3" /> },
    preparing: { cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ChefHat className="h-3 w-3" /> },
    ready:     { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    served:    { cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Utensils className="h-3 w-3" /> },
    cancelled: { cls: 'bg-rose-100 text-rose-800 border-rose-200', icon: <X className="h-3 w-3" /> },
  }
  const cfg = statusCfg[order.status] ?? statusCfg.pending
  const currentIdx = STATUS_FLOW.indexOf(order.status as any)

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <Badge className={cfg.cls} variant="outline">
            {cfg.icon} <span className="ml-1">{STATUS_LABELS[order.status]}</span>
          </Badge>
        </div>

        <div className="mt-2 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {order.orderType === 'room_service' && order.roomNumber && `Room ${order.roomNumber} · Room Service`}
            {order.orderType === 'dine_in' && `Dine-in ${order.tableNumber ? `(Table ${order.tableNumber})` : ''}`}
            {order.orderType === 'takeaway' && 'Takeaway'}
            {' · '}
            {order.paymentMode === 'room_account' ? 'Room Account' : 'Separate Bill'}
          </p>
        </div>

        <ul className="mt-3 space-y-1 text-xs border-t pt-2">
          {order.items.map(it => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className={`inline-flex items-center justify-center w-3 h-3 rounded-sm border ${(it as any).isVeg === false ? 'border-rose-500' : 'border-emerald-500'}`}>
                  {(it as any).isVeg === false ? <Drumstick className="h-2 w-2 text-rose-500" /> : <Leaf className="h-2 w-2 text-emerald-500" />}
                </span>
                <span className="font-medium">{it.quantity}×</span> {it.name}
              </span>
              <span className="text-muted-foreground font-mono">{formatINR(it.total)}</span>
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t">Note: {order.notes}</p>
        )}

        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-sm font-semibold">{formatINR(order.grandTotal)}</span>
          <div className="flex items-center gap-1">
            {/* KOT print button — for kitchen only, no prices */}
            <Button size="sm" variant="ghost" onClick={() => onPrintKOT?.(order)} title="Print Kitchen Order Ticket (KOT)">
              <ChefHat className="h-3.5 w-3.5" />
            </Button>
            {order.paymentMode === 'separate' && (
              order.foodInvoice ? (
                <Badge variant="secondary" className="text-xs">
                  <Receipt className="h-3 w-3 mr-1" /> {order.foodInvoice.invoiceNumber}
                </Badge>
              ) : order.status === 'served' ? (
                <Button size="sm" variant="outline" onClick={() => onCreateFoodInvoice?.(order)}>
                  <Receipt className="h-3 w-3 mr-1" /> Invoice
                </Button>
              ) : null
            )}
          </div>
        </div>

        {/* Status progression buttons */}
        {order.status !== 'served' && order.status !== 'cancelled' && (
          <div className="mt-3 flex gap-1.5">
            {currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onStatus(order, STATUS_FLOW[currentIdx + 1])}
              >
                Mark as {STATUS_LABELS[STATUS_FLOW[currentIdx + 1]]}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onStatus(order, 'cancelled')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
