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
    /* Reset — use the invoice's own styles, don't override */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* The invoice container — same as on screen but constrained to A4 */
    .invoice-print {
      max-width: 190mm !important;
      margin: 0 auto !important;
      padding: 8mm !important;
    }

    /* Scale everything down slightly to fit A4 */
    .invoice-print {
      transform: scale(0.85);
      transform-origin: top center;
    }

    /* A4 page setup */
    @page {
      size: A4;
      margin: 5mm;
    }

    @media print {
      body { background: white; }
      .no-print { display: none !important; }
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
