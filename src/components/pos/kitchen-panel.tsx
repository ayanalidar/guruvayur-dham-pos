'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Minus, Trash2, ShoppingCart, Utensils, Search, Leaf, Drumstick, CheckCircle2, X, Pencil } from 'lucide-react'
import { formatINR, apiFetch } from '@/lib/format'

type MenuItem = {
  id: string; name: string; category: string; price: number; isVeg: boolean
  available: boolean; prepTime: number; description?: string | null
}
type CheckIn = {
  id: string; guest: { name: string; phone: string }; room: { number: string; type: string }
  checkInAt: string
}
type CartItem = { menuItemId: string; name: string; price: number; quantity: number; isVeg: boolean }

export function KitchenPanel({ preselectCheckIn, onConsumed }: {
  preselectCheckIn?: { checkInId: string; roomNumber: string; guestName: string } | null
  onConsumed?: () => void
}) {
  const [tab, setTab] = useState<'order' | 'menu'>('order')
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="order"><ShoppingCart className="h-4 w-4 mr-1.5" /> New Order</TabsTrigger>
          <TabsTrigger value="menu"><Utensils className="h-4 w-4 mr-1.5" /> Menu Management</TabsTrigger>
        </TabsList>
        <TabsContent value="order" className="mt-4"><OrderTab preselectCheckIn={preselectCheckIn} onConsumed={onConsumed} /></TabsContent>
        <TabsContent value="menu" className="mt-4"><MenuTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function OrderTab({ preselectCheckIn, onConsumed }: {
  preselectCheckIn?: { checkInId: string; roomNumber: string; guestName: string } | null
  onConsumed?: () => void
}) {
  const { toast } = useToast()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service' | 'takeaway'>('dine_in')
  const [paymentMode, setPaymentMode] = useState<'room_account' | 'separate'>('separate')
  const [selectedCheckIn, setSelectedCheckIn] = useState<string>('') // checkInId
  const [customerName, setCustomerName] = useState('Walk-in Guest')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [menuRes, ciRes] = await Promise.all([
        apiFetch<{ items: MenuItem[] }>('/api/menu'),
        apiFetch<{ checkIns: CheckIn[] }>('/api/checkins?status=active'),
      ])
      setMenu(menuRes.items)
      setCheckIns(ciRes.checkIns)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [menuRes, ciRes] = await Promise.all([
          apiFetch<{ items: MenuItem[] }>('/api/menu'),
          apiFetch<{ checkIns: CheckIn[] }>('/api/checkins?status=active'),
        ])
        if (active) { setMenu(menuRes.items); setCheckIns(ciRes.checkIns) }
      } catch (e: any) {
        if (active) toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
      }
    })()
    return () => { active = false }
  }, [toast])

  // when paymentMode changes to room_account, auto-pick first check-in if none selected
  useEffect(() => {
    if (paymentMode === 'room_account' && !selectedCheckIn && checkIns[0]) {
      setSelectedCheckIn(checkIns[0].id)
    }
  }, [paymentMode, checkIns, selectedCheckIn])

  // Consume preselectCheckIn from parent (Rooms → Order Food for Room)
  useEffect(() => {
    if (preselectCheckIn && checkIns.length > 0) {
      // Verify the check-in still exists (not checked out)
      const ci = checkIns.find(c => c.id === preselectCheckIn.checkInId)
      if (ci) {
        setSelectedCheckIn(ci.id)
        setPaymentMode('room_account')
        setOrderType('room_service')
        setCustomerName(ci.guest.name)
        if (onConsumed) onConsumed()
      } else {
        toast({
          title: 'Check-in no longer active',
          description: `Guest ${preselectCheckIn.guestName} may have already checked out.`,
          variant: 'destructive',
        })
        if (onConsumed) onConsumed()
      }
    }
  }, [preselectCheckIn, checkIns, onConsumed, toast])

  // when selecting a check-in, also auto-fill customer name & room number for printing
  useEffect(() => {
    const ci = checkIns.find(c => c.id === selectedCheckIn)
    if (ci) {
      setCustomerName(ci.guest.name)
      setOrderType('room_service')
    }
  }, [selectedCheckIn, checkIns])

  const categories = useMemo(() => {
    const s = new Set<string>()
    menu.forEach(m => s.add(m.category))
    return ['all', ...Array.from(s).sort()]
  }, [menu])

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    return menu.filter(m => {
      if (category !== 'all' && m.category !== category) return false
      if (q && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [menu, search, category])

  function addToCart(m: MenuItem) {
    setCart(prev => {
      const ex = prev.find(c => c.menuItemId === m.id)
      if (ex) return prev.map(c => c.menuItemId === m.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: m.id, name: m.name, price: m.price, quantity: 1, isVeg: m.isVeg }]
    })
  }
  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.menuItemId === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0))
  }
  function setQty(id: string, qty: number) {
    setCart(prev => prev.map(c => c.menuItemId === id ? { ...c, quantity: Math.max(0, qty) } : c).filter(c => c.quantity > 0))
  }

  const itemsTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const cgst = Math.round(itemsTotal * 9) / 100
  const sgst = Math.round(itemsTotal * 9) / 100
  const grandTotal = itemsTotal + cgst + sgst

  const selectedCi = checkIns.find(c => c.id === selectedCheckIn)

  async function submitOrder() {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' }); return
    }
    if (paymentMode === 'room_account' && !selectedCheckIn) {
      toast({ title: 'Select a check-in for room account billing', variant: 'destructive' }); return
    }
    setSubmitting(true)
    try {
      const r = await apiFetch<{ order: any }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          checkInId: paymentMode === 'room_account' ? selectedCheckIn : null,
          customerName: customerName || 'Walk-in Guest',
          roomNumber: selectedCi?.room.number || (orderType === 'room_service' ? '' : null),
          tableNumber: orderType === 'dine_in' ? tableNumber : null,
          orderType,
          paymentMode,
          notes: notes || undefined,
          items: cart.map(c => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity })),
        }),
      })
      toast({
        title: `Order placed: ${r.order.orderNumber}`,
        description: paymentMode === 'room_account'
          ? `Added to ${selectedCi?.guest.name}'s room account`
          : `Generate a food invoice from the Invoices tab`,
      })
      // reset
      setCart([]); setNotes(''); setTableNumber(''); setCustomerName('Walk-in Guest')
      setSelectedCheckIn(''); setPaymentMode('separate'); setOrderType('dine_in')
    } catch (e: any) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-4">
      {/* Left: menu */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search dishes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)] pr-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pr-2">
            {filteredMenu.map(m => {
              const inCart = cart.find(c => c.menuItemId === m.id)
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border bg-card p-3 transition ${!m.available ? 'opacity-40' : 'hover:border-primary hover:shadow-sm'} ${inCart ? 'border-primary ring-1 ring-primary/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-tight">{m.name}</p>
                    <span className={`shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm border ${m.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                      {m.isVeg ? <Leaf className="h-2.5 w-2.5 text-emerald-500" /> : <Drumstick className="h-2.5 w-2.5 text-rose-500" />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{m.category}</span>
                    <span className="text-sm font-semibold">{formatINR(m.price)}</span>
                  </div>
                  {/* +/- controls — directly on the menu item */}
                  {m.available && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {inCart ? (
                        <>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(m.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold text-sm w-6 text-center">{inCart.quantity}</span>
                          <Button size="icon" className="h-7 w-7" onClick={() => updateQty(m.id, +1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full h-7" onClick={() => addToCart(m)}>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Current Order — always visible, side by side with menu */}
      <Card className="h-[calc(100vh-150px)] flex flex-col">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Current Order
            {cartItemCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {cartItemCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
          {/* Order meta */}
          <div className="space-y-2 mb-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Order Type">
                <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine In</SelectItem>
                    <SelectItem value="room_service">Room Service</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Payment">
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="separate">Separate Bill</SelectItem>
                    <SelectItem value="room_account">Room Account</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {paymentMode === 'room_account' && (
              <Field label="Charge to Room">
                <Select value={selectedCheckIn} onValueChange={setSelectedCheckIn}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select check-in" /></SelectTrigger>
                  <SelectContent>
                    {checkIns.length === 0 && <SelectItem value="" disabled>No active check-ins</SelectItem>}
                    {checkIns.map(ci => (
                      <SelectItem key={ci.id} value={ci.id}>Rm {ci.room.number} · {ci.guest.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {paymentMode === 'separate' && (
              <Field label="Customer Name">
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-xs" />
              </Field>
            )}
            {orderType === 'dine_in' && (
              <Field label="Table Number">
                <Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="T1, T2..." className="h-8 text-xs" />
              </Field>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1 border-t pt-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Tap + on menu items to add
              </div>
            ) : (
              <ul className="space-y-1.5">
                {cart.map(c => (
                  <li key={c.menuItemId} className="flex items-center gap-2 rounded-md border p-2 text-sm bg-background">
                    <span className={`shrink-0 inline-flex items-center justify-center w-3 h-3 rounded-sm border ${c.isVeg ? 'border-emerald-500' : 'border-rose-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{formatINR(c.price)} × {c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(c.menuItemId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-bold text-xs w-5 text-center">{c.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(c.menuItemId, +1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setQty(c.menuItemId, 0)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals + submit — fixed at bottom of card */}
          <div className="shrink-0 mt-2 pt-2 border-t space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Items Total</span>
              <span className="font-mono">{formatINR(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CGST 9%</span>
              <span className="font-mono">{formatINR(cgst)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">SGST 9%</span>
              <span className="font-mono">{formatINR(sgst)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>Grand Total</span>
              <span className="font-mono text-primary">{formatINR(grandTotal)}</span>
            </div>
            <Textarea rows={1} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order notes..." className="text-xs mt-1" />
            <Button className="w-full mt-1" disabled={cart.length === 0 || submitting} onClick={submitOrder}>
              {submitting ? 'Placing order...' : `Place Order (${formatINR(grandTotal)})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MenuTab() {
  const { toast } = useToast()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: 'Main Course', price: 100, isVeg: true, prepTime: 15 })
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: 'Main Course', price: 100, isVeg: true, prepTime: 15, description: '' })
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ items: MenuItem[] }>('/api/menu')
      setMenu(d.items)
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const d = await apiFetch<{ items: MenuItem[] }>('/api/menu')
        if (active) setMenu(d.items)
      } catch (e: any) {
        if (active) toast({ title: 'Load failed', description: e.message, variant: 'destructive' })
      }
    })()
    return () => { active = false }
  }, [toast])

  async function toggleAvailable(m: MenuItem) {
    try {
      await apiFetch('/api/menu', { method: 'PATCH', body: JSON.stringify({ id: m.id, available: !m.available }) })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  async function updatePrice(m: MenuItem, price: number) {
    try {
      await apiFetch('/api/menu', { method: 'PATCH', body: JSON.stringify({ id: m.id, price }) })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  async function addItem() {
    if (!newItem.name.trim() || newItem.price <= 0) {
      toast({ title: 'Name and valid price required', variant: 'destructive' }); return
    }
    try {
      await apiFetch('/api/menu', {
        method: 'POST',
        body: JSON.stringify({
          name: newItem.name.trim(),
          category: newItem.category,
          price: Number(newItem.price),
          isVeg: newItem.isVeg,
          prepTime: Number(newItem.prepTime),
        }),
      })
      toast({ title: `Added ${newItem.name}` })
      setNewItem({ name: '', category: 'Main Course', price: 100, isVeg: true, prepTime: 15 })
      setShowAdd(false)
      load()
    } catch (e: any) {
      toast({ title: 'Add failed', description: e.message, variant: 'destructive' })
    }
  }

  function openEdit(m: MenuItem) {
    setEditing(m)
    setEditForm({
      name: m.name, category: m.category, price: m.price, isVeg: m.isVeg,
      prepTime: m.prepTime, description: m.description || '',
    })
  }

  async function saveEdit() {
    if (!editing) return
    if (!editForm.name.trim() || editForm.price <= 0) {
      toast({ title: 'Name and valid price required', variant: 'destructive' }); return
    }
    try {
      await apiFetch('/api/menu', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editing.id,
          name: editForm.name.trim(),
          category: editForm.category,
          price: Number(editForm.price),
          isVeg: editForm.isVeg,
          prepTime: Number(editForm.prepTime),
          description: editForm.description || null,
        }),
      })
      toast({ title: `Updated ${editForm.name}` })
      setEditing(null)
      load()
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      const r = await apiFetch<{ deleted?: boolean; softDeleted?: boolean; message?: string }>(`/api/menu/${deleting.id}`, { method: 'DELETE' })
      if (r.softDeleted) {
        setDeleteResult(r.message || 'Item was referenced in past orders — marked as unavailable instead.')
        toast({ title: 'Marked as unavailable', description: r.message })
      } else {
        toast({ title: `Deleted ${deleting.name}` })
        setDeleting(null); setDeleteResult(null)
      }
      load()
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
    }
  }

  const filtered = menu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  // group by category
  const grouped = filtered.reduce((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m); return acc
  }, {} as Record<string, MenuItem[]>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Menu Items ({menu.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}><Plus className="h-4 w-4 mr-1" /> {showAdd ? 'Cancel' : 'Add Item'}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        {showAdd && (
          <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <Field label="Name"><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></Field>
            <Field label="Category">
              <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Breakfast','South Indian','Main Course','Breads','Rice','Chinese','Starters','Beverages','Desserts'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price (₹)"><Input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })} /></Field>
            <Field label="Veg?">
              <div className="flex items-center gap-2 h-9">
                <Switch checked={newItem.isVeg} onCheckedChange={(v) => setNewItem({ ...newItem, isVeg: v })} />
                <span className="text-xs">{newItem.isVeg ? 'Veg' : 'Non-Veg'}</span>
              </div>
            </Field>
            <Button onClick={addItem}>Add Item</Button>
          </div>
        )}

        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold mb-2">{cat} <span className="text-xs text-muted-foreground">({items.length})</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map(m => (
                <div key={m.id} className="rounded-md border p-2.5 text-sm flex items-center gap-2 group">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border ${m.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                    {m.isVeg ? <Leaf className="h-2.5 w-2.5 text-emerald-500" /> : <Drumstick className="h-2.5 w-2.5 text-rose-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.prepTime} min prep</p>
                  </div>
                  <Input
                    type="number"
                    defaultValue={m.price}
                    onBlur={e => { const v = Number(e.target.value); if (v !== m.price && v > 0) updatePrice(m, v) }}
                    className="w-20 h-7 text-xs"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => openEdit(m)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant={m.available ? 'default' : 'outline'} className="h-7 w-7" onClick={() => toggleAvailable(m)} title={m.available ? 'Available' : 'Unavailable'}>
                    {m.available ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-60 hover:opacity-100" onClick={() => { setDeleting(m); setDeleteResult(null) }} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Update name, category, price, veg/non-veg, prep time, or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name"><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Breakfast','South Indian','Main Course','Breads','Rice','Chinese','Starters','Beverages','Desserts'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Price (₹)"><Input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Veg?">
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={editForm.isVeg} onCheckedChange={(v) => setEditForm({ ...editForm, isVeg: v })} />
                  <span className="text-xs">{editForm.isVeg ? 'Veg' : 'Non-Veg'}</span>
                </div>
              </Field>
              <Field label="Prep Time (min)"><Input type="number" value={editForm.prepTime} onChange={e => setEditForm({ ...editForm, prepTime: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Description">
              <Textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(v) => { if (!v) { setDeleting(null); setDeleteResult(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete Menu Item
            </DialogTitle>
            <DialogDescription>
              {deleteResult
                ? deleteResult
                : <>Are you sure you want to delete <strong>{deleting?.name}</strong>? This action cannot be undone if the item has never been ordered.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {deleteResult
              ? <Button onClick={() => { setDeleting(null); setDeleteResult(null) }}>Close</Button>
              : <>
                  <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
