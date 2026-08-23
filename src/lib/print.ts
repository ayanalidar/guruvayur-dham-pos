'use client'

// Print invoice using a hidden iframe.
// Captures the invoice's computed styles so the print looks EXACTLY like the screen.
// Only adjustments: hide non-print elements and constrain to A4 width.
export function printInvoice() {
  const el = document.querySelector('.invoice-print') as HTMLElement
  if (!el) {
    window.print()
    return
  }

  // Clone the invoice element with all its computed styles
  const clone = el.cloneNode(true) as HTMLElement

  // Remove all .no-print elements from the clone
  clone.querySelectorAll('.no-print').forEach(e => e.remove())

  // Get the computed style of the original element
  const computedStyle = window.getComputedStyle(el)

  // Create a hidden iframe
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

  // Copy ALL stylesheets from the parent document
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice</title>
  ${styles}
  <style>
    /* Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: Arial, Helvetica, sans-serif;
    }

    /* A4: 210mm x 297mm. With 5mm margins = 200mm x 287mm usable */
    @page {
      size: A4;
      margin: 5mm;
    }

    /* Invoice container — fit within A4 printable area */
    .invoice-print {
      max-width: 200mm !important;
      margin: 0 auto !important;
      padding: 4mm !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
    }

    /* Scale down headings */
    .invoice-print h1 { font-size: 14px !important; }
    .invoice-print h2 { font-size: 11px !important; }
    .invoice-print h3 { font-size: 10px !important; }

    /* Compact table */
    .invoice-print table { font-size: 9px !important; }
    .invoice-print th { padding: 2px 3px !important; font-size: 8px !important; }
    .invoice-print td { padding: 2px 3px !important; }

    /* Reduce spacing */
    .invoice-print .mt-6 { margin-top: 4px !important; }
    .invoice-print .mt-4 { margin-top: 3px !important; }
    .invoice-print .mt-3 { margin-top: 2px !important; }
    .invoice-print .mt-2 { margin-top: 2px !important; }
    .invoice-print .pt-3 { padding-top: 3px !important; }
    .invoice-print .pt-2 { padding-top: 2px !important; }
    .invoice-print .p-4 { padding: 4px !important; }
    .invoice-print .p-3 { padding: 3px !important; }
    .invoice-print .p-2 { padding: 2px !important; }
    .invoice-print .mb-4 { margin-bottom: 3px !important; }
    .invoice-print .mb-3 { margin-bottom: 2px !important; }
    .invoice-print .py-2 { padding-top: 2px !important; padding-bottom: 2px !important; }

    /* Compact text sizes */
    .invoice-print .text-\\[10px\\] { font-size: 8px !important; }
    .invoice-print .text-xs { font-size: 9px !important; }
    .invoice-print .text-sm { font-size: 10px !important; }
    .invoice-print .text-base { font-size: 11px !important; }

    /* Compact totals */
    .invoice-print .ml-auto { width: 180px !important; font-size: 9px !important; }

    /* Logo */
    .invoice-print img { max-height: 35px !important; max-width: 50px !important; }

    /* QR code */
    .invoice-print svg { max-width: 40px !important; max-height: 40px !important; }

    /* Signature arch */
    .invoice-print .w-32 { width: 70px !important; height: 25px !important; }

    /* Hide non-print elements */
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

  // Wait for styles to load, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error('Print failed:', e)
      // Fallback to window.print
      window.print()
    }

    // Remove iframe after print dialog
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    }, 2000)
  }, 800)
}
