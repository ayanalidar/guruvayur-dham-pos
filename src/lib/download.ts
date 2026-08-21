'use client'

import { formatINR, formatDateShort } from './format'

// Download an array of objects as a CSV file
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => {
      const s = String(cell ?? '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download all hotel invoices as CSV
export async function downloadHotelInvoices() {
  const res = await fetch('/api/invoices/hotel')
  const data = await res.json()
  downloadCSV('hotel-invoices.csv', [
    'Invoice No', 'Date', 'Guest Name', 'Phone', 'Room', 'Room Type',
    'Nights', 'Rate/Night', 'Room Charges', 'Food Charges', 'Extra Charges',
    'Discount', 'Taxable', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount',
    'Grand Total', 'Advance Paid', 'Balance Due', 'Payment Method', 'Status'
  ], data.invoices.map((inv: any) => [
    inv.invoiceNumber, formatDateShort(inv.createdAt), inv.guestName, inv.guestPhone,
    inv.roomNumber, inv.roomType, inv.nights, inv.ratePerNight,
    inv.roomCharges, inv.foodCharges, inv.extraCharges, inv.discount, inv.taxableAmount,
    inv.cgstRate, inv.cgstAmount, inv.sgstRate, inv.sgstAmount,
    inv.grandTotal, inv.advancePaid, inv.balanceDue, inv.paymentMethod || '',
    inv.balanceDue > 0 ? 'Due' : 'Paid'
  ]))
}

// Download all food invoices as CSV
export async function downloadFoodInvoices() {
  const res = await fetch('/api/invoices/food')
  const data = await res.json()
  downloadCSV('food-invoices.csv', [
    'Invoice No', 'Date', 'Customer Name', 'Room/Table', 'Order Type',
    'Items Total', 'CGST Amount', 'SGST Amount', 'Grand Total', 'Payment Method'
  ], data.invoices.map((inv: any) => [
    inv.invoiceNumber, formatDateShort(inv.createdAt), inv.customerName,
    inv.roomNumber || inv.tableNumber || '', inv.orderType,
    inv.itemsTotal, inv.cgstAmount, inv.sgstAmount, inv.grandTotal, inv.paymentMethod || ''
  ]))
}

// Download all custom invoices as CSV
export async function downloadCustomInvoices() {
  const res = await fetch('/api/invoices/custom')
  const data = await res.json()
  downloadCSV('custom-invoices.csv', [
    'Invoice No', 'Date', 'Customer Name', 'GSTIN', 'Phone',
    'Items Total', 'Discount', 'CGST Amount', 'SGST Amount', 'IGST Amount',
    'Grand Total', 'Payment Method', 'Notes'
  ], data.invoices.map((inv: any) => [
    inv.invoiceNumber, formatDateShort(inv.createdAt), inv.customerName,
    inv.customerGstIn || '', inv.customerPhone || '',
    inv.itemsTotal, inv.discount, inv.cgstAmount, inv.sgstAmount, inv.igstAmount,
    inv.grandTotal, inv.paymentMethod || '', inv.notes || ''
  ]))
}

// Download all kitchen orders as CSV
export async function downloadOrders() {
  const res = await fetch('/api/orders')
  const data = await res.json()
  downloadCSV('kitchen-orders.csv', [
    'Order No', 'Date', 'Customer Name', 'Room/Table', 'Order Type',
    'Payment Mode', 'Status', 'Items Total', 'CGST', 'SGST', 'Grand Total',
    'Has Invoice', 'Notes'
  ], data.orders.map((o: any) => [
    o.orderNumber, formatDateShort(o.createdAt), o.customerName,
    o.roomNumber || o.tableNumber || '', o.orderType,
    o.paymentMode, o.status, o.itemsTotal, o.cgstAmount, o.sgstAmount, o.grandTotal,
    o.foodInvoice ? 'Yes' : 'No', o.notes || ''
  ]))
}
