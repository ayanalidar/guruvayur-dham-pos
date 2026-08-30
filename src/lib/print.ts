'use client'

// Print invoice using a hidden iframe.
// Copies the invoice HTML + all stylesheets from the parent page.
// Sizes to fill the entire A4 page properly.
export function printInvoice() {
  const el = document.querySelector('.invoice-print') as HTMLElement
  if (!el) {
    window.print()
    return
  }

  // Clone the invoice, remove .no-print elements
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.no-print').forEach(e => e.remove())

  // Copy all stylesheets from the parent document
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')

  // Create hidden iframe
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    window.print()
    return
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice</title>
  ${styles}
  <style>
    /* Use professional font */
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: 'Roboto', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* A4 page — fill the entire page */
    @page { size: A4; margin: 8mm; }

    /* Invoice container — use full A4 width */
    .invoice-print {
      max-width: 194mm !important;
      width: 194mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      font-size: 11px !important;
      line-height: 1.35 !important;
    }

    /* Headings — professional sizes */
    .invoice-print h1 { font-size: 18px !important; margin: 0 0 2px !important; }
    .invoice-print h2 { font-size: 13px !important; }
    .invoice-print h3 { font-size: 12px !important; }

    /* Paragraphs */
    .invoice-print p { font-size: 10px !important; margin: 1px 0 !important; }

    /* Table — fills the width */
    .invoice-print table { width: 100% !important; font-size: 11px !important; }
    .invoice-print th { padding: 4px 6px !important; font-size: 10px !important; }
    .invoice-print td { padding: 4px 6px !important; font-size: 11px !important; }

    /* Text sizes — professional, readable */
    .invoice-print .text-2xl { font-size: 18px !important; }
    .invoice-print .text-xl { font-size: 15px !important; }
    .invoice-print .text-lg { font-size: 13px !important; }
    .invoice-print .text-base { font-size: 12px !important; }
    .invoice-print .text-sm { font-size: 11px !important; }
    .invoice-print .text-xs { font-size: 10px !important; }
    .invoice-print .text-\\[10px\\] { font-size: 9px !important; }
    .invoice-print .text-\\[11px\\] { font-size: 10px !important; }
    .invoice-print .text-\\[8px\\] { font-size: 8px !important; }
    .invoice-print .text-\\[7px\\] { font-size: 8px !important; }

    /* Reduce spacing slightly to fit A4 */
    .invoice-print .mt-6 { margin-top: 5px !important; }
    .invoice-print .mt-4 { margin-top: 4px !important; }
    .invoice-print .mt-3 { margin-top: 3px !important; }
    .invoice-print .mt-2 { margin-top: 2px !important; }
    .invoice-print .mt-1 { margin-top: 1px !important; }
    .invoice-print .mb-6 { margin-bottom: 5px !important; }
    .invoice-print .mb-4 { margin-bottom: 4px !important; }
    .invoice-print .mb-3 { margin-bottom: 3px !important; }
    .invoice-print .pt-3 { padding-top: 3px !important; }
    .invoice-print .pt-2 { padding-top: 2px !important; }
    .invoice-print .p-4 { padding: 4px !important; }
    .invoice-print .p-3 { padding: 3px !important; }
    .invoice-print .p-2 { padding: 2px !important; }
    .invoice-print .py-2 { padding-top: 2px !important; padding-bottom: 2px !important; }
    .invoice-print .py-1 { padding-top: 1px !important; padding-bottom: 1px !important; }
    .invoice-print .gap-4 { gap: 4px !important; }
    .invoice-print .gap-3 { gap: 3px !important; }
    .invoice-print .gap-2 { gap: 2px !important; }
    .invoice-print .space-y-2 > * + * { margin-top: 2px !important; }
    .invoice-print .space-y-1\\.5 > * + * { margin-top: 2px !important; }
    .invoice-print .space-y-1 > * + * { margin-top: 1px !important; }

    /* Logo */
    .invoice-print img { max-height: 40px !important; max-width: 55px !important; }

    /* QR / SVG */
    .invoice-print svg { max-width: 45px !important; max-height: 45px !important; }

    /* Totals column */
    .invoice-print .ml-auto { width: 200px !important; }

    /* Signature arch */
    .invoice-print .w-32 { width: 80px !important; height: 30px !important; }

    /* Input fields — in edit mode, render as plain text */
    .invoice-print input,
    .invoice-print select {
      border: none !important;
      background: transparent !important;
      font-size: 11px !important;
      padding: 0 !important;
      height: auto !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }

    /* Hide no-print */
    .no-print { display: none !important; }

    @media print {
      body { background: white; }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`)
  doc.close()

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error('Print failed:', e)
      window.print()
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 2000)
  }, 800)
}
