'use client'

// Print invoice using a hidden iframe.
// Copies the invoice HTML + all stylesheets from the parent page.
// Only adds minimal print-specific CSS to ensure it fits A4.
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
    /* Page setup */
    @page { size: A4; margin: 6mm; }

    body {
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Don't transform or scale — use natural sizes with slight reduction */
    .invoice-print {
      max-width: 198mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
    }

    /* Reduce all font sizes proportionally to fit A4 */
    .invoice-print { font-size: 9px !important; line-height: 1.3 !important; }
    .invoice-print h1 { font-size: 13px !important; margin: 0 0 1px !important; }
    .invoice-print h2 { font-size: 10px !important; }
    .invoice-print h3 { font-size: 10px !important; }
    .invoice-print p { font-size: 8px !important; margin: 1px 0 !important; }

    /* Table */
    .invoice-print table { font-size: 8px !important; }
    .invoice-print th { padding: 2px 3px !important; font-size: 8px !important; }
    .invoice-print td { padding: 2px 3px !important; font-size: 8px !important; }

    /* Text sizes */
    .invoice-print .text-2xl { font-size: 14px !important; }
    .invoice-print .text-xl { font-size: 12px !important; }
    .invoice-print .text-lg { font-size: 11px !important; }
    .invoice-print .text-base { font-size: 10px !important; }
    .invoice-print .text-sm { font-size: 9px !important; }
    .invoice-print .text-xs { font-size: 8px !important; }
    .invoice-print .text-\\[10px\\] { font-size: 7px !important; }
    .invoice-print .text-\\[11px\\] { font-size: 8px !important; }

    /* Reduce margins */
    .invoice-print .mt-6 { margin-top: 3px !important; }
    .invoice-print .mt-4 { margin-top: 2px !important; }
    .invoice-print .mt-3 { margin-top: 2px !important; }
    .invoice-print .mt-2 { margin-top: 1px !important; }
    .invoice-print .mt-1 { margin-top: 1px !important; }
    .invoice-print .mb-6 { margin-bottom: 3px !important; }
    .invoice-print .mb-4 { margin-bottom: 2px !important; }
    .invoice-print .mb-3 { margin-bottom: 2px !important; }
    .invoice-print .mb-2 { margin-bottom: 1px !important; }
    .invoice-print .pt-3 { padding-top: 2px !important; }
    .invoice-print .pt-2 { padding-top: 1px !important; }
    .invoice-print .pb-3 { padding-bottom: 2px !important; }
    .invoice-print .p-4 { padding: 3px !important; }
    .invoice-print .p-3 { padding: 2px !important; }
    .invoice-print .p-2 { padding: 2px !important; }
    .invoice-print .py-2 { padding-top: 1px !important; padding-bottom: 1px !important; }
    .invoice-print .py-1 { padding-top: 1px !important; padding-bottom: 1px !important; }
    .invoice-print .gap-4 { gap: 3px !important; }
    .invoice-print .gap-3 { gap: 2px !important; }
    .invoice-print .gap-2 { gap: 2px !important; }
    .invoice-print .space-y-2 > * + * { margin-top: 2px !important; }
    .invoice-print .space-y-1\\.5 > * + * { margin-top: 1px !important; }
    .invoice-print .space-y-1 > * + * { margin-top: 1px !important; }

    /* Images */
    .invoice-print img { max-height: 30px !important; max-width: 45px !important; }

    /* QR / SVG */
    .invoice-print svg { max-width: 35px !important; max-height: 35px !important; }

    /* Totals column */
    .invoice-print .ml-auto { width: 160px !important; }

    /* Signature arch */
    .invoice-print .w-32 { width: 60px !important; height: 22px !important; }

    /* Input fields — hide borders in print */
    .invoice-print input,
    .invoice-print select {
      border: 1px solid #ccc !important;
      background: white !important;
      font-size: 8px !important;
      padding: 1px 2px !important;
      height: auto !important;
    }

    /* Hide no-print */
    .no-print { display: none !important; }
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
