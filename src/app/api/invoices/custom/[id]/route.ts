import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/custom/[id] — single custom invoice for printing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.customInvoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

// PATCH /api/invoices/custom/[id] — update editable fields
// Server-side recomputes itemsTotal, taxable, tax amounts, and grandTotal
// so the data is always consistent regardless of what the client sends.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  // String fields
  const strFields = ['invoiceNumber', 'customerName', 'customerPhone', 'customerAddress', 'customerGstIn', 'roomType', 'paymentMethod', 'notes']
  for (const k of strFields) {
    if (body[k] != null) {
      if (k === 'invoiceNumber') {
        const num = String(body[k]).trim()
        if (!num) return NextResponse.json({ error: 'invoiceNumber cannot be empty' }, { status: 400 })
        const exists = await db.customInvoice.findFirst({ where: { invoiceNumber: num, NOT: { id } } })
        if (exists) return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 })
        data.invoiceNumber = num
      } else if (k === 'roomType') {
        // Allow setting roomType to empty string (clearing it)
        data.roomType = String(body[k]).trim() || null
      } else {
        data[k] = String(body[k])
      }
    }
  }

  // Date fields
  if (body.checkInDate != null) data.checkInDate = body.checkInDate ? new Date(body.checkInDate) : null
  if (body.checkOutDate != null) data.checkOutDate = body.checkOutDate ? new Date(body.checkOutDate) : null

  // Items (JSON field) — sanitize each item
  let itemsChanged = false
  let workingItems: any[] | null = null
  if (body.items != null) {
    itemsChanged = true
    workingItems = (Array.isArray(body.items) ? body.items : []).map((it: any) => {
      const qty = Math.max(0, Number(it.quantity) || 0)
      const rate = Math.max(0, Number(it.rate) || 0)
      return {
        name: String(it.name || '').trim(),
        quantity: qty,
        rate,
        amount: Math.round(rate * qty * 100) / 100,
      }
    })
    data.items = workingItems
  }

  // Determine final discount (use provided value, or fetch existing if not provided)
  let discount: number | undefined
  if (body.discount != null) {
    discount = Math.max(0, Number(body.discount) || 0)
    data.discount = discount
  }

  // Determine final tax rates (use provided values, or we'll skip recompute if none provided)
  const hasTaxRateChange = body.cgstRate != null || body.sgstRate != null || body.igstRate != null

  // If items or discount changed, or tax rates changed — recompute all derived numeric fields server-side
  if (itemsChanged || body.discount != null || hasTaxRateChange) {
    // Fetch existing invoice to get current values for fields not being updated
    const existing = await db.customInvoice.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const finalItems = workingItems ?? (existing.items as any[])
    const finalDiscount = discount ?? existing.discount
    const itemsTotal = finalItems.reduce((s: number, it: any) => s + (Number(it.rate) * Number(it.quantity)), 0)
    const taxable = Math.max(0, itemsTotal - finalDiscount)

    // Tax rates: if IGST > 0, CGST and SGST are 0 (inter-state). Else use CGST + SGST (intra-state).
    const iRate = body.igstRate != null ? Math.max(0, Number(body.igstRate) || 0) : Number(existing.igstRate) || 0
    const cRate = iRate > 0 ? 0 : (body.cgstRate != null ? Math.max(0, Number(body.cgstRate) || 0) : Number(existing.cgstRate) || 0)
    const sRate = iRate > 0 ? 0 : (body.sgstRate != null ? Math.max(0, Number(body.sgstRate) || 0) : Number(existing.sgstRate) || 0)

    const cgstAmount = Math.round(taxable * cRate) / 100
    const sgstAmount = Math.round(taxable * sRate) / 100
    const igstAmount = Math.round(taxable * iRate) / 100
    const grandTotal = taxable + cgstAmount + sgstAmount + igstAmount

    data.itemsTotal = itemsTotal
    data.discount = finalDiscount
    data.cgstRate = cRate
    data.sgstRate = sRate
    data.igstRate = iRate
    data.cgstAmount = cgstAmount
    data.sgstAmount = sgstAmount
    data.igstAmount = igstAmount
    data.grandTotal = grandTotal
  } else if (body.itemsTotal != null) {
    // Allow direct override if client sends pre-computed values without items/discount/rate changes
    data.itemsTotal = Number(body.itemsTotal)
  }
  ;['cgstAmount', 'sgstAmount', 'igstAmount', 'grandTotal'].forEach(k => {
    if (body[k] != null && data[k] == null) data[k] = Number(body[k])
  })

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const invoice = await db.customInvoice.update({ where: { id }, data: data as any })
  return NextResponse.json({ invoice })
}

// DELETE /api/invoices/custom/[id] — delete a custom invoice
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.customInvoice.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
