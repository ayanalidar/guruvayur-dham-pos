'use client'

// Opens a new window with just the invoice HTML and triggers print.
// This avoids CSS visibility hacks that break with Radix Dialog portals.
export function printInvoice() {
  const el = document.querySelector('.invoice-print')
  if (!el) {
    // Fallback to window.print if no invoice-print div found
    window.print()
    return
  }

  const invoiceHTML = el.innerHTML
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) {
    alert('Please allow popups to print the invoice')
    return
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice Print</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${styles}
  <style>
    body { margin: 0; padding: 20px; background: white; font-family: Arial, sans-serif; }
    .invoice-print { max-width: none !important; padding: 0 !important; }
    @media print {
      @page { margin: 10mm; size: A4; }
      body { padding: 0; }
    }
    /* Ensure all invoice elements are visible */
    .invoice-print * { visibility: visible !important; }
    /* Hide non-print elements */
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div class="invoice-print">${invoiceHTML}</div>
</body>
</html>`)
  win.document.close()

  // Wait for content to render, then print
  setTimeout(() => {
    win.focus()
    win.print()
  }, 500)
}
