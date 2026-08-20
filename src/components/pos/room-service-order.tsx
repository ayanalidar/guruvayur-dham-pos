'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Leaf, Drumstick, ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { formatINR, apiFetch } from '@/lib/format'

type MenuItem = {
  id: string; name: string; category: string; price: number; isVeg: boolean
  available: boolean; prepTime: number; description?: string | null
}

type CartItem = { menuItemId: string; name: string; price: number; quantity: number; isVeg: boolean }

type Room = {
  id: string; number: string; type: string
}

type Config = {
  name: string; phone: string; cgstRate: number; sgstRate: number
}

export function RoomServiceOrder({ roomId, room, menu, config }: {
  roomId: string
  room: Room
  menu: MenuItem[]
  config: Config
}) {
  const { toast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Group by category
  const categories = Array.from(new Set(menu.map(m => m.category))).sort()

  const filteredMenu = menu.filter(m => {
    if (category !== 'all' && m.category !== category) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filteredMenu.reduce((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m); return acc
  }, {} as Record<string, MenuItem[]>)

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

  const itemsTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const cgst = Math.round(itemsTotal * (config.cgstRate || 9)) / 100
  const sgst = Math.round(itemsTotal * (config.sgstRate || 9)) / 100
  const grandTotal = itemsTotal + cgst + sgst

  async function submitOrder() {
    if (cart.length === 0) {
      toast({ title: 'Your cart is empty', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      // POST to /api/orders with paymentMode=room_account, orderType=room_service
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          checkInId: null, // walk-in order from QR — staff will link to check-in
          customerName: customerName || `Room ${room.number} Guest`,
          roomNumber: room.number,
          orderType: 'room_service',
          paymentMode: 'room_account',
          notes: notes || undefined,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
          })),
        }),
      })
      setSuccess(true)
      setCart([])
      setNotes('')
      setCustomerName('')
    } catch (e: any) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-emerald-800">Order Placed!</h2>
          <p className="text-sm text-emerald-700 mt-2">
            Your order has been sent to the kitchen. It will be delivered to Room {room.number} shortly.
          </p>
          <Button
            className="mt-4"
            onClick={() => setSuccess(false)}
          >
            Place Another Order
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Search + category filter */}
      <div className="sticky top-[68px] z-10 bg-amber-50/95 backdrop-blur-sm py-2 mb-3 space-y-2">
        <Input
          placeholder="Search dishes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${category === 'all' ? 'bg-red-800 text-white' : 'bg-white border'}`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${category === c ? 'bg-red-800 text-white' : 'bg-white border'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="space-y-4 pb-32">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-sm font-bold mb-2 text-red-800" style={{ fontFamily: 'Georgia, serif' }}>
              {cat}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {items.map(m => {
                const inCart = cart.find(c => c.menuItemId === m.id)
                return (
                  <div key={m.id} className="rounded-lg border border-amber-100 bg-white p-3 flex items-start justify-between gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border ${m.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                          {m.isVeg ? <Leaf className="h-2.5 w-2.5 text-emerald-500" /> : <Drumstick className="h-2.5 w-2.5 text-rose-500" />}
                        </span>
                        <p className="font-medium text-sm">{m.name}</p>
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{m.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">{m.prepTime} min · ₹{m.price.toFixed(2)}</p>
                    </div>
                    {/* Add button or qty controls */}
                    {inCart ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQty(m.id, -1)}
                          className="h-7 w-7 rounded-full border border-red-300 bg-white flex items-center justify-center text-red-800 font-bold"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => updateQty(m.id, +1)}
                          className="h-7 w-7 rounded-full bg-red-800 text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(m)}
                        className="h-7 w-7 rounded-full bg-red-800 text-white flex items-center justify-center shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Cart bar — sticky at bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-red-800 shadow-lg">
          <div className="max-w-2xl mx-auto p-3 space-y-2">
            {/* Cart items */}
            <div className="max-h-32 overflow-y-auto space-y-1">
              {cart.map(c => (
                <div key={c.menuItemId} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className={`inline-flex items-center justify-center w-3 h-3 rounded-sm border ${c.isVeg ? 'border-emerald-500' : 'border-rose-500'}`} />
                    {c.quantity}× {c.name}
                  </span>
                  <span className="font-mono">{formatINR(c.price * c.quantity)}</span>
                </div>
              ))}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
              <span>Total (incl. GST)</span>
              <span className="text-red-800">{formatINR(grandTotal)}</span>
            </div>
            {/* Customer name + notes */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Your name (optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Special requests..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {/* Place order */}
            <Button
              className="w-full"
              onClick={submitOrder}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {submitting ? 'Sending...' : `Place Order — ${formatINR(grandTotal)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
