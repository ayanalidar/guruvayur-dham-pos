'use client'

// Print invoice using a hidden iframe — avoids "about:blank" in the print footer
// and allows full control over the print layout.
export function printInvoice() {
  const el = document.querySelector('.invoice-print')
  if (!el) {
    window.print()
    return
  }

  const invoiceHTML = el.innerHTML

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

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>&nbsp;</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4;
      margin: 8mm;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Invoice container — fit A4 single page */
    .invoice-print {
      max-width: 100%;
      padding: 0 !important;
      overflow: hidden;
    }

    /* Header */
    .invoice-print > div:first-child {
      padding-bottom: 4px !important;
      margin-bottom: 4px !important;
    }
    .invoice-print h1 {
      font-size: 16px !important;
      margin: 0 0 2px !important;
    }
    .invoice-print p {
      font-size: 9px !important;
      margin: 1px 0 !important;
    }

    /* Customer grid */
    .invoice-print .flex.items-center.text-xs {
      font-size: 10px !important;
      padding: 1px 0 !important;
    }

    /* Table */
    .invoice-print table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 10px !important;
      margin: 4px 0 !important;
    }
    .invoice-print th {
      padding: 3px 4px !important;
      font-size: 9px !important;
    }
    .invoice-print td {
      padding: 3px 4px !important;
      font-size: 10px !important;
    }

    /* Totals */
    .invoice-print .ml-auto {
      width: 200px !important;
      font-size: 10px !important;
    }
    .invoice-print .ml-auto .flex {
      padding: 1px 0 !important;
      font-size: 10px !important;
    }

    /* Footer */
    .invoice-print .mt-6 {
      margin-top: 6px !important;
      padding-top: 4px !important;
    }
    .invoice-print .grid.grid-cols-3 {
      gap: 8px !important;
    }
    .invoice-print .text-\\[10px\\] {
      font-size: 8px !important;
      line-height: 1.2 !important;
    }
    .invoice-print .text-\\[10px\\].italic {
      font-size: 7px !important;
    }

    /* Signature arch */
    .invoice-print .w-32 {
      width: 80px !important;
      height: 30px !important;
    }

    /* QR code */
    .invoice-print svg {
      width: 50px !important;
      height: 50px !important;
    }

    /* Hide WhatsApp button and other no-print elements */
    .no-print { display: none !important; }

    /* Hide the last div (GuardianX + WhatsApp bar) to save space */
    .invoice-print > div:last-child > .no-print { display: none !important; }

    /* Reduce spacing everywhere */
    .invoice-print .mt-3 { margin-top: 4px !important; }
    .invoice-print .mt-4 { margin-top: 4px !important; }
    .invoice-print .mt-2 { margin-top: 2px !important; }
    .invoice-print .pt-3 { padding-top: 4px !important; }
    .invoice-print .pt-2 { padding-top: 2px !important; }
    .invoice-print .mb-3 { margin-bottom: 4px !important; }
    .invoice-print .mb-4 { margin-bottom: 4px !important; }
    .invoice-print .p-4 { padding: 4px !important; }
    .invoice-print .p-3 { padding: 4px !important; }
    .invoice-print .p-2 { padding: 3px !important; }
    .invoice-print .py-2 { padding-top: 2px !important; padding-bottom: 2px !important; }
    .invoice-print .py-1 { padding-top: 1px !important; padding-bottom: 1px !important; }
    .invoice-print .gap-4 { gap: 6px !important; }
    .invoice-print .space-y-1 { margin-top: 2px !important; }
    .invoice-print .space-y-1\\.5 { margin-top: 2px !important; }
    .invoice-print .space-y-2 > * { margin-top: 2px !important; }

    /* Images */
    .invoice-print img {
      max-height: 40px !important;
      max-width: 60px !important;
    }

    /* Input fields in edit mode — hide them in print */
    .invoice-print input,
    .invoice-print select,
    .invoice-print button:not(.no-print) {
      border: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
  </style>
</head>
<body>
  <div class="invoice-print">${invoiceHTML}</div>
</body>
</html>`)
  doc.close()

  // Wait for content to render, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error('Print failed:', e)
    }

    // Remove iframe after print dialog closes
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    }, 1000)
  }, 500)
}
