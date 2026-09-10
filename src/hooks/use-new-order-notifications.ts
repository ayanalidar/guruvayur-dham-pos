'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/format'

// ===== Order notification sound (generated inline, no external file needed) =====
// Plays a short beep sequence using the Web Audio API
function playNotificationSound() {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Play a pleasant two-tone beep (C5 → G5)
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.15 }, // C5
      { freq: 783.99, start: 0.18, dur: 0.25 }, // G5
    ]
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur)
    })

    // Close the audio context after the sound finishes
    setTimeout(() => { try { ctx.close() } catch {} }, 1000)
  } catch (e) {
    // Audio not supported — silent fail
  }
}

// ===== Desktop notification =====
function showDesktopNotification(title: string, body: string) {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png', tag: 'new-order' })
    }
  } catch {
    // Notifications not supported
  }
}

// ===== Types =====
export type OrderNotification = {
  id: string
  orderNumber: string
  customerName: string
  roomNumber: string | null
  orderType: string
  itemsTotal: number
  grandTotal: number
  items: Array<{ name: string; quantity: number; price: number }>
  createdAt: string
}

// ===== Hook: useNewOrderNotifications =====
// Polls /api/orders?status=pending every 10 seconds (when tab is visible).
// When a new order is detected (ID not seen before), triggers:
//   1. Audio beep (Web Audio API)
//   2. Desktop notification (Browser Notification API)
//   3. Calls onNewOrder callback with the order details
//
// Returns:
//   - newOrders: array of recently-arrived order IDs (for UI highlight)
//   - clearNewOrder: function to clear the highlight for a specific order
//   - permission: current Notification permission state
//   - requestPermission: function to request notification permission
export function useNewOrderNotifications(opts?: {
  onNewOrder?: (order: OrderNotification) => void
  intervalMs?: number
  enabled?: boolean
}) {
  const intervalMs = opts?.intervalMs ?? 10000
  const enabled = opts?.enabled ?? true
  const [newOrders, setNewOrders] = useState<string[]>([])
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const seenOrderIds = useRef<Set<string>>(new Set())
  const isInitialLoad = useRef(true)
  const onNewOrderRef = useRef(opts?.onNewOrder)

  // Keep the callback ref current without re-triggering the polling effect
  useEffect(() => { onNewOrderRef.current = opts?.onNewOrder }, [opts?.onNewOrder])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission
    try {
      const p = await Notification.requestPermission()
      setPermission(p)
      return p
    } catch {
      return 'denied'
    }
  }, [])

  const clearNewOrder = useCallback((orderId: string) => {
    setNewOrders(prev => prev.filter(id => id !== orderId))
  }, [])

  const checkForNewOrders = useCallback(async () => {
    // Only poll when the tab is visible AND enabled
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
    if (!enabled) return

    try {
      const d = await apiFetch<{ orders: OrderNotification[] }>('/api/orders?status=pending')
      const pendingOrders = d.orders || []

      if (isInitialLoad.current) {
        // First load: just record existing order IDs, don't notify
        pendingOrders.forEach(o => seenOrderIds.current.add(o.id))
        isInitialLoad.current = false
        return
      }

      // Find orders we haven't seen before
      const fresh = pendingOrders.filter(o => !seenOrderIds.current.has(o.id))
      if (fresh.length === 0) return

      // Record all current pending orders as seen
      pendingOrders.forEach(o => seenOrderIds.current.add(o.id))

      // Trigger notifications for each new order
      fresh.forEach(order => {
        // 1. Audio beep
        playNotificationSound()

        // 2. Desktop notification
        const roomLabel = order.roomNumber ? `Room ${order.roomNumber}` : 'Walk-in'
        const itemCount = order.items?.reduce((s, it) => s + it.quantity, 0) ?? 0
        showDesktopNotification(
          `🍽️ New Order ${order.orderNumber}`,
          `${roomLabel} · ${order.customerName} · ${itemCount} item(s) · ₹${order.grandTotal.toFixed(0)}`
        )

        // 3. Add to new orders list (for UI highlight)
        setNewOrders(prev => [...prev, order.id])

        // 4. Call the callback
        onNewOrderRef.current?.(order)
      })
    } catch {
      // Network error — silent fail, will retry next interval
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    // Poll on interval
    const interval = setInterval(checkForNewOrders, intervalMs)

    // Also check on visibility change (when staff switches back to the tab)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForNewOrders()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkForNewOrders, intervalMs, enabled])

  return {
    newOrders,
    clearNewOrder,
    permission,
    requestPermission,
  }
}

// ===== Helper: build a WhatsApp wa.me link with order details =====
// Format: https://wa.me/<number>?text=<message>
// If no number is provided, opens WhatsApp with just the text (user picks recipient).
export function buildWhatsAppLink(opts: {
  whatsappNumber?: string | null  // e.g. "919876543210" (country code + number, no +)
  order: {
    orderNumber: string
    customerName: string
    roomNumber?: string | null
    orderType?: string
    items: Array<{ name: string; quantity: number; price: number }>
    itemsTotal: number
    grandTotal: number
    notes?: string | null
  }
  hotelName?: string
}): string {
  const { order, hotelName } = opts
  const lines: string[] = []
  lines.push(`*New Order ${order.orderNumber}*`)
  if (hotelName) lines.push(`_${hotelName}_`)
  lines.push('')
  lines.push(`*Customer:* ${order.customerName}`)
  if (order.roomNumber) lines.push(`*Room:* ${order.roomNumber}`)
  lines.push(`*Type:* ${order.orderType?.replace('_', ' ') || 'Order'}`)
  lines.push('')
  lines.push('*Items:*')
  order.items.forEach(it => {
    lines.push(`  ${it.quantity}× ${it.name} — ₹${it.price}`)
  })
  lines.push('')
  lines.push(`*Total: ₹${order.grandTotal.toFixed(2)}*`)
  if (order.notes) {
    lines.push('')
    lines.push(`_Notes: ${order.notes}_`)
  }

  const text = encodeURIComponent(lines.join('\n'))
  const num = opts.whatsappNumber?.replace(/[^\d]/g, '') // strip +, spaces, dashes
  if (num) return `https://wa.me/${num}?text=${text}`
  return `https://wa.me/?text=${text}`
}
