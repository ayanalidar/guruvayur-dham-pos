import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports/gst-export?from=2026-08-01&to=2026-08-31
// Returns all invoices in the date range as CSV for GST return filing.
// Columns: Type, Invoice No, Date, Customer, Room/Table, Taxable, CGST, SGST, Grand Total, Payment Method
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params required (YYYY-MM-DD)' }, { status: 400 })
  }

  const fromDate = new Date(from)
  fromDate.setHours(0, 0, 0, 0)
  const toDate = new Date(to)
  toDate.setHours(23, 59, 59, 999)

  const [hotelInvoices, foodInvoices] = await Promise.all([
    db.hotelInvoice.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      orderBy: { createdAt: 'asc' },
    }),
    db.foodInvoice.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Build CSV
  const rows: string[] = []
  rows.push('Type,Invoice Number,Date,Customer Name,Room/Table,Taxable Amount,CGST Rate,CGST Amount,SGST Rate,SGST Amount,Grand Total,Payment Method')

  let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalGrand = 0

  for (const inv of hotelInvoices) {
    rows.push([
      'Hotel',
      csvEscape(inv.invoiceNumber),
      csvDate(inv.createdAt),
      csvEscape(inv.guestName),
      `Room ${inv.roomNumber}`,
      inv.taxableAmount.toFixed(2),
      `${inv.cgstRate}%`,
      inv.cgstAmount.toFixed(2),
      `${inv.sgstRate}%`,
      inv.sgstAmount.toFixed(2),
      inv.grandTotal.toFixed(2),
      csvEscape(inv.paymentMethod || ''),
    ].join(','))
    totalTaxable += inv.taxableAmount
    totalCgst += inv.cgstAmount
    totalSgst += inv.sgstAmount
    totalGrand += inv.grandTotal
  }

  for (const inv of foodInvoices) {
    const roomOrTable = inv.roomNumber ? `Room ${inv.roomNumber}` : inv.tableNumber ? `Table ${inv.tableNumber}` : '—'
    rows.push([
      'Food',
      csvEscape(inv.invoiceNumber),
      csvDate(inv.createdAt),
      csvEscape(inv.customerName),
      csvEscape(roomOrTable),
      inv.itemsTotal.toFixed(2),
      `${inv.cgstRate.toFixed(1)}%`,
      inv.cgstAmount.toFixed(2),
      `${inv.sgstRate.toFixed(1)}%`,
      inv.sgstAmount.toFixed(2),
      inv.grandTotal.toFixed(2),
      csvEscape(inv.paymentMethod || ''),
    ].join(','))
    totalTaxable += inv.itemsTotal
    totalCgst += inv.cgstAmount
    totalSgst += inv.sgstAmount
    totalGrand += inv.grandTotal
  }

  // Totals row
  rows.push('')
  rows.push(`TOTALS,,,,,${totalTaxable.toFixed(2)},,${totalCgst.toFixed(2)},,${totalSgst.toFixed(2)},${totalGrand.toFixed(2)},`)

  const csv = rows.join('\n')
  const filename = `gst-export-${from}-to-${to}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function csvEscape(s: string): string {
  if (!s) return ''
  // Wrap in quotes if contains comma, quote, or newline
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}
