'use client'

// ===== Invoice Print + Preview + Auto-Save PDF =====
//
// This module provides two functions:
//   1. previewInvoice() — opens a full-screen preview dialog showing exactly
//      what will be printed. User clicks "Print" inside the preview to actually
//      open the browser's print dialog.
//   2. printInvoice() — directly opens the browser's print dialog (no preview).
//
// Both functions:
//   - Clone the .invoice-print element from the page
//   - Inject professional A4 print CSS + Google Fonts into a hidden iframe
//   - Wait for fonts + images to load before printing
//   - Set the iframe document's <title> to a suggested filename so the browser's
//     "Save as PDF" dialog defaults to that name.
//
// Suggested filename format: "Invoice_<number>_<customerName>_<roomTypes>.pdf"
// e.g. "Invoice_176_ABHISHEK_SuperiorRoom.pdf"

const PRINT_STYLES = `
    :root {
      --gvd-burgundy: #8B1A1A;
      --gvd-burgundy-deep: #6B0F1A;
      --gvd-cream: #FBF7F0;
      --gvd-ink: #1A1A1A;
      --gvd-gold: #C19A4B;
      --gvd-gray: #6B7280;
      --gvd-border: #D4D4D8;
    }

    @page { size: A4 portrait; margin: 8mm; }

    * { box-sizing: border-box; }

    html, body {
      margin: 0; padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    body {
      font-family: 'Inter', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: var(--gvd-ink);
    }

    .invoice-print {
      max-width: 194mm !important;
      width: 194mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: white !important;
      color: var(--gvd-ink) !important;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
      font-size: 10.5pt !important;
      line-height: 1.45 !important;
      box-shadow: none !important;
      border: none !important;
      overflow: visible !important;
    }

    .invoice-print .inv-top-strip {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 5px 0 !important;
      border-bottom: 1px solid var(--gvd-border) !important;
      font-size: 8pt !important;
      letter-spacing: 0.12em !important;
      text-transform: uppercase !important;
      color: var(--gvd-gray) !important;
    }
    .invoice-print .inv-top-strip .inv-gstin {
      font-family: 'Roboto Mono', monospace !important;
      font-weight: 500 !important;
      color: var(--gvd-ink) !important;
    }
    .invoice-print .inv-top-strip .inv-tax-label {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 10pt !important;
      letter-spacing: 0.3em !important;
      color: var(--gvd-burgundy) !important;
    }
    .invoice-print .inv-top-strip .inv-copy {
      font-style: italic !important;
      color: var(--gvd-gray) !important;
      text-transform: capitalize !important;
      letter-spacing: 0.05em !important;
    }

    .invoice-print .inv-brand-row {
      display: flex !important;
      align-items: center !important;
      gap: 14px !important;
      padding: 14px 0 !important;
      border-bottom: 2px solid var(--gvd-burgundy) !important;
    }
    .invoice-print .inv-brand-row img {
      max-height: 70px !important;
      max-width: 180px !important;
      width: auto !important;
      height: 70px !important;
      object-fit: contain !important;
    }
    .invoice-print .inv-brand-text {
      flex: 1 !important;
      text-align: center !important;
      padding: 0 6px !important;
    }
    .invoice-print .inv-brand-text h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 22pt !important;
      color: var(--gvd-burgundy) !important;
      letter-spacing: 0.04em !important;
      line-height: 1.1 !important;
      margin: 0 0 4px 0 !important;
      text-transform: uppercase !important;
    }
    .invoice-print .inv-brand-text .inv-address-bar {
      display: inline-block !important;
      padding: 4px 14px !important;
      background: var(--gvd-ink) !important;
      color: white !important;
      font-size: 8.5pt !important;
      letter-spacing: 0.05em !important;
      border-radius: 2px !important;
      margin-top: 4px !important;
    }
    .invoice-print .inv-brand-text .inv-contact {
      margin-top: 6px !important;
      font-size: 9pt !important;
      color: var(--gvd-ink) !important;
      font-weight: 500 !important;
    }

    .invoice-print .inv-meta-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
      padding: 10px 0 !important;
      border-bottom: 1px solid var(--gvd-border) !important;
    }
    .invoice-print .inv-meta-row .inv-meta-label {
      font-size: 7.5pt !important;
      text-transform: uppercase !important;
      letter-spacing: 0.18em !important;
      color: var(--gvd-gray) !important;
      font-weight: 500 !important;
      margin-bottom: 2px !important;
    }
    .invoice-print .inv-meta-row .inv-meta-value {
      font-family: 'Roboto Mono', monospace !important;
      font-size: 11pt !important;
      font-weight: 600 !important;
      color: var(--gvd-ink) !important;
    }
    .invoice-print .inv-meta-row .inv-meta-title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-size: 13pt !important;
      font-weight: 700 !important;
      color: var(--gvd-burgundy) !important;
      letter-spacing: 0.15em !important;
      text-transform: uppercase !important;
      text-align: center !important;
    }

    .invoice-print .inv-customer {
      padding: 10px 0 !important;
      border-bottom: 1px solid var(--gvd-border) !important;
    }
    .invoice-print .inv-customer .inv-leader-row {
      display: flex !important;
      align-items: baseline !important;
      gap: 6px !important;
      padding: 2px 0 !important;
      font-size: 10pt !important;
    }
    .invoice-print .inv-customer .inv-leader-label {
      font-weight: 600 !important;
      color: var(--gvd-ink) !important;
      font-size: 9.5pt !important;
      min-width: 70px !important;
    }
    .invoice-print .inv-customer .inv-leader-line {
      flex: 1 !important;
      border-bottom: 1px dotted #999 !important;
      min-height: 1.1em !important;
      padding: 0 4px !important;
      color: var(--gvd-ink) !important;
      font-weight: 500 !important;
    }

    .invoice-print table.inv-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 12px 0 !important;
      font-size: 10pt !important;
      font-family: 'Inter', Arial, sans-serif !important;
    }
    .invoice-print table.inv-table thead tr {
      background: var(--gvd-burgundy) !important;
      color: white !important;
    }
    .invoice-print table.inv-table thead th {
      padding: 7px 8px !important;
      font-size: 8.5pt !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      border-right: 1px solid rgba(255,255,255,0.2) !important;
      text-align: left !important;
    }
    .invoice-print table.inv-table thead th:last-child { border-right: none !important; }
    .invoice-print table.inv-table tbody td {
      padding: 6px 8px !important;
      border-bottom: 1px solid #E5E5E5 !important;
      vertical-align: top !important;
    }
    .invoice-print table.inv-table tbody tr:nth-child(even) td { background: #FAFAF8 !important; }
    .invoice-print table.inv-table .inv-sr {
      text-align: center !important;
      font-family: 'Roboto Mono', monospace !important;
      font-weight: 500 !important;
      color: var(--gvd-gray) !important;
      width: 8% !important;
    }
    .invoice-print table.inv-table .inv-particulars { width: 52% !important; }
    .invoice-print table.inv-table .inv-rate,
    .invoice-print table.inv-table .inv-amount {
      text-align: right !important;
      font-family: 'Roboto Mono', monospace !important;
      font-weight: 500 !important;
      width: 20% !important;
    }
    .invoice-print table.inv-table .inv-subitem {
      display: block !important;
      font-size: 8.5pt !important;
      color: var(--gvd-gray) !important;
      margin-top: 2px !important;
      font-style: italic !important;
    }
    .invoice-print table.inv-table .inv-total-row td {
      border-top: 2px solid var(--gvd-burgundy) !important;
      border-bottom: none !important;
      font-weight: 700 !important;
      background: #F5EFE7 !important;
      padding: 8px !important;
      font-size: 11pt !important;
    }
    .invoice-print table.inv-table .inv-discount { color: #166534 !important; }

    .invoice-print .inv-totals {
      width: 280px !important;
      margin-left: auto !important;
      margin-top: 8px !important;
      font-size: 10pt !important;
    }
    .invoice-print .inv-totals .inv-totals-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 4px 0 !important;
      border-bottom: 1px dotted #BBB !important;
    }
    .invoice-print .inv-totals .inv-totals-row:last-child { border-bottom: none !important; }
    .invoice-print .inv-totals .inv-totals-label {
      color: var(--gvd-ink) !important;
      font-weight: 400 !important;
    }
    .invoice-print .inv-totals .inv-totals-value {
      font-family: 'Roboto Mono', monospace !important;
      font-weight: 500 !important;
      color: var(--gvd-ink) !important;
    }
    .invoice-print .inv-totals .inv-totals-row.grand-total {
      background: var(--gvd-burgundy) !important;
      color: white !important;
      padding: 8px 12px !important;
      border: none !important;
      margin-top: 6px !important;
      border-radius: 2px !important;
    }
    .invoice-print .inv-totals .inv-totals-row.grand-total .inv-totals-label,
    .invoice-print .inv-totals .inv-totals-row.grand-total .inv-totals-value {
      color: white !important;
      font-weight: 700 !important;
      font-size: 11.5pt !important;
    }
    .invoice-print .inv-totals .inv-totals-row.balance-due {
      background: #F5EFE7 !important;
      padding: 6px 12px !important;
      border: 1px solid var(--gvd-gold) !important;
      border-radius: 2px !important;
      margin-top: 4px !important;
    }
    .invoice-print .inv-totals .inv-totals-row.balance-due .inv-totals-label,
    .invoice-print .inv-totals .inv-totals-row.balance-due .inv-totals-value {
      color: var(--gvd-burgundy-deep) !important;
      font-weight: 700 !important;
    }

    .invoice-print .inv-footer {
      margin-top: 16px !important;
      padding-top: 10px !important;
      border-top: 1px solid var(--gvd-border) !important;
    }
    .invoice-print .inv-footer .inv-bank-row {
      display: grid !important;
      grid-template-columns: 1fr auto !important;
      gap: 16px !important;
      align-items: start !important;
      padding-bottom: 10px !important;
      margin-bottom: 10px !important;
      border-bottom: 1px dashed var(--gvd-border) !important;
    }
    .invoice-print .inv-footer .inv-bank-title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 10pt !important;
      color: var(--gvd-burgundy) !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      margin-bottom: 4px !important;
    }
    .invoice-print .inv-footer .inv-bank-detail {
      font-size: 9pt !important;
      color: var(--gvd-ink) !important;
      padding: 1px 0 !important;
    }
    .invoice-print .inv-footer .inv-bank-detail strong { font-weight: 600 !important; }
    .invoice-print .inv-footer .inv-qr { text-align: center !important; }
    .invoice-print .inv-footer .inv-qr img,
    .invoice-print .inv-footer .inv-qr svg {
      max-width: 70px !important;
      max-height: 70px !important;
      width: auto !important;
      height: auto !important;
    }
    .invoice-print .inv-footer .inv-qr .inv-qr-caption {
      font-size: 7.5pt !important;
      font-weight: 600 !important;
      color: var(--gvd-ink) !important;
      margin-top: 2px !important;
      letter-spacing: 0.1em !important;
      text-transform: uppercase !important;
    }
    .invoice-print .inv-footer .inv-qr .inv-qr-sub {
      font-size: 7pt !important;
      color: var(--gvd-gray) !important;
      margin-top: 1px !important;
    }
    .invoice-print .inv-footer .inv-sign-row {
      display: grid !important;
      grid-template-columns: 1fr 1fr 1fr !important;
      gap: 16px !important;
      align-items: end !important;
      margin-top: 10px !important;
    }
    .invoice-print .inv-footer .inv-terms {
      font-size: 8.5pt !important;
      color: var(--gvd-gray) !important;
    }
    .invoice-print .inv-footer .inv-terms .inv-terms-title {
      font-weight: 700 !important;
      color: var(--gvd-ink) !important;
      font-size: 9pt !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 3px !important;
      text-transform: uppercase !important;
    }
    .invoice-print .inv-footer .inv-terms .inv-terms-item {
      padding: 1px 0 !important;
      line-height: 1.4 !important;
    }
    .invoice-print .inv-footer .inv-sign-arch {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    .invoice-print .inv-footer .inv-sign-arch-box {
      width: 100px !important;
      height: 32px !important;
      border: 1.5px solid var(--gvd-ink) !important;
      border-bottom: none !important;
      border-radius: 60px 60px 0 0 !important;
    }
    .invoice-print .inv-footer .inv-sign-label {
      font-size: 8.5pt !important;
      font-weight: 500 !important;
      color: var(--gvd-ink) !important;
      margin-top: 4px !important;
      letter-spacing: 0.05em !important;
    }
    .invoice-print .inv-footer .inv-hotel-sign {
      text-align: center !important;
      font-size: 9pt !important;
    }
    .invoice-print .inv-footer .inv-hotel-sign .inv-cert {
      font-size: 7.5pt !important;
      color: var(--gvd-gray) !important;
      font-style: italic !important;
      margin-bottom: 24px !important;
    }
    .invoice-print .inv-footer .inv-hotel-sign .inv-for-name {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 11pt !important;
      color: var(--gvd-burgundy) !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      border-top: 1px solid var(--gvd-ink) !important;
      padding-top: 4px !important;
    }
    .invoice-print .inv-footer .inv-hotel-sign .inv-auth-sign {
      font-size: 7.5pt !important;
      color: var(--gvd-gray) !important;
      margin-top: 4px !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
    }
    .invoice-print .inv-footer .inv-brand-footer {
      margin-top: 14px !important;
      padding-top: 8px !important;
      border-top: 1px solid var(--gvd-border) !important;
      text-align: center !important;
      font-size: 8pt !important;
      color: var(--gvd-gray) !important;
      line-height: 1.5 !important;
    }
    .invoice-print .inv-footer .inv-brand-footer .inv-guardianx {
      font-weight: 700 !important;
      color: var(--gvd-burgundy) !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
    }

    .no-print { display: none !important; }

    .invoice-print input[type="text"],
    .invoice-print input[type="number"],
    .invoice-print input[type="date"],
    .invoice-print input[type="datetime-local"],
    .invoice-print input:not([type]),
    .invoice-print select,
    .invoice-print textarea {
      border: none !important;
      background: transparent !important;
      font-size: inherit !important;
      padding: 0 2px !important;
      margin: 0 !important;
      height: auto !important;
      width: 100% !important;
      min-height: 0 !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      appearance: none !important;
      outline: none !important;
      box-shadow: none !important;
      color: var(--gvd-ink) !important;
      font-family: inherit !important;
      line-height: inherit !important;
      display: inline !important;
      border-radius: 0 !important;
      font-weight: inherit !important;
    }
    .invoice-print select::-ms-expand { display: none !important; }
    .invoice-print textarea {
      display: block !important;
      resize: none !important;
      overflow: hidden !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
    }
    .invoice-print button { display: none !important; }

    .invoice-print .text-2xl { font-size: 22px !important; }
    .invoice-print .text-xl { font-size: 18px !important; }
    .invoice-print .text-lg { font-size: 14px !important; }
    .invoice-print .text-base { font-size: 12px !important; }
    .invoice-print .text-sm { font-size: 10.5px !important; }
    .invoice-print .text-xs { font-size: 9.5px !important; }

    .invoice-print .inv-customer.grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 6px 12px !important;
    }
    .invoice-print .inv-customer.grid label {
      font-size: 7.5pt !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      color: var(--gvd-gray) !important;
      font-weight: 600 !important;
      display: block !important;
      margin-bottom: 1px !important;
    }
    .invoice-print table.inv-table input[type="text"],
    .invoice-print table.inv-table input[type="number"] {
      width: 100% !important;
      min-width: 0 !important;
      text-align: inherit !important;
    }
    .invoice-print table.inv-table .inv-rate input {
      text-align: right !important;
      font-family: 'Roboto Mono', monospace !important;
    }
    .invoice-print table.inv-table .inv-rate .flex {
      display: inline-flex !important;
      gap: 2px !important;
      align-items: center !important;
      justify-content: flex-end !important;
      width: 100% !important;
    }
`

const FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">`

// Sanitize a string for use as a filename component
function sanitizeFilenamePart(s: string | null | undefined): string {
  if (!s) return ''
  return s.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '').slice(0, 30)
}

// Build a suggested PDF filename from invoice metadata
// Format: Invoice_<number>_<customerName>_<roomTypes>.pdf
export function buildPdfFilename(opts: {
  invoiceNumber?: string
  customerName?: string
  roomType?: string | null
}): string {
  const parts: string[] = []
  parts.push('Invoice')
  if (opts.invoiceNumber) parts.push(sanitizeFilenamePart(opts.invoiceNumber))
  if (opts.customerName) parts.push(sanitizeFilenamePart(opts.customerName))
  if (opts.roomType) {
    // roomType may be comma-separated — join with hyphen
    const rooms = opts.roomType.split(',').map(s => sanitizeFilenamePart(s)).filter(Boolean).join('-')
    if (rooms) parts.push(rooms)
  }
  const name = parts.filter(Boolean).join('_')
  return `${name || 'Invoice'}.pdf`
}

// Build the full HTML document for the invoice iframe
function buildInvoiceHtml(clone: HTMLElement, suggestedFilename: string, parentStyles: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${suggestedFilename}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${parentStyles}
  ${FONTS_LINK}
  <style>
    ${PRINT_STYLES}
    @media print {
      body { background: white; }
      .invoice-print { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`
}

// Wait for images + fonts to load in an iframe document
function waitForIframeReady(doc: Document): Promise<void> {
  const imagesLoaded = new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images)
    if (imgs.length === 0) { resolve(); return }
    let loaded = 0
    const check = () => { loaded++; if (loaded >= imgs.length) resolve() }
    imgs.forEach(img => {
      if (img.complete) { check() }
      else {
        img.addEventListener('load', check, { once: true })
        img.addEventListener('error', check, { once: true })
      }
    })
    setTimeout(resolve, 2000)
  })
  const fontsLoaded = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve()
  const layoutReady = new Promise<void>(resolve => setTimeout(resolve, 300))
  return Promise.all([imagesLoaded, fontsLoaded, layoutReady]).then(() => undefined)
}

// Create an off-screen iframe with the invoice HTML loaded into it.
// The iframe MUST have real dimensions (not 0×0) — many browsers refuse to
// print an iframe with zero size and fall back to printing the parent window.
// We position it off-screen (left: -9999px) so it's invisible but printable.
function createInvoiceIframe(clone: HTMLElement, suggestedFilename: string): HTMLIFrameElement {
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')

  const iframe = document.createElement('iframe')
  // Off-screen but visible to the browser's print engine
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = '210mm'
  iframe.style.height = '297mm'
  iframe.style.border = '0'
  iframe.style.background = 'white'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(buildInvoiceHtml(clone, suggestedFilename, styles))
    doc.close()
  }
  return iframe
}

// Open the browser's print dialog for the .invoice-print element.
// The suggested filename is set as the iframe document's <title> so the
// browser's "Save as PDF" dialog defaults to that name.
export function printInvoice(filenameOpts?: {
  invoiceNumber?: string
  customerName?: string
  roomType?: string | null
}) {
  const el = document.querySelector('.invoice-print') as HTMLElement
  if (!el) {
    window.print()
    return
  }

  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.no-print').forEach(e => e.remove())

  const suggestedFilename = buildPdfFilename(filenameOpts || {})
  const iframe = createInvoiceIframe(clone, suggestedFilename)
  const doc = iframe.contentWindow?.document
  const win = iframe.contentWindow

  if (!doc || !win) {
    setTimeout(() => {
      try { window.print() } catch (e) { console.error('Print fallback failed:', e) }
      setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe) }, 1000)
    }, 800)
    return
  }

  waitForIframeReady(doc).then(() => {
    try {
      win.focus()
      // Set the document title right before printing — browsers use this as the
      // default "Save as PDF" filename in the print dialog.
      doc.title = suggestedFilename.replace(/\.pdf$/i, '')
      win.print()
    } catch (e) {
      console.error('Print failed:', e)
      window.print()
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 2000)
  })
}

// ===== PRINT PREVIEW =====
//
// Opens a full-screen modal showing exactly what will be printed.
// The user reviews the preview, then clicks "Print" to open the browser's
// print dialog (with the suggested filename pre-filled).

let previewContainer: HTMLDivElement | null = null

export function previewInvoice(filenameOpts?: {
  invoiceNumber?: string
  customerName?: string
  roomType?: string | null
}): void {
  const el = document.querySelector('.invoice-print') as HTMLElement
  if (!el) {
    printInvoice(filenameOpts)
    return
  }

  // Remove any existing preview
  closePreview()

  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.no-print').forEach(e => e.remove())

  const suggestedFilename = buildPdfFilename(filenameOpts || {})

  // Build the preview container
  previewContainer = document.createElement('div')
  previewContainer.id = 'invoice-preview-overlay'
  previewContainer.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 16px;
    overflow-y: auto;
  `

  // Toolbar
  const toolbar = document.createElement('div')
  toolbar.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    padding: 12px 20px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    max-width: 800px;
    width: 100%;
  `

  const title = document.createElement('span')
  title.textContent = 'Print Preview'
  title.style.cssText = 'font-family: Inter, Arial, sans-serif; font-weight: 700; font-size: 16px; color: #1A1A1A; flex: 1;'

  const filenameLabel = document.createElement('span')
  filenameLabel.textContent = `PDF: ${suggestedFilename}`
  filenameLabel.style.cssText = 'font-family: Roboto Mono, monospace; font-size: 11px; color: #6B7280; background: #F3F4F6; padding: 4px 8px; border-radius: 4px;'

  const printBtn = document.createElement('button')
  printBtn.textContent = '🖨️ Print / Save PDF'
  printBtn.style.cssText = `
    background: #8B1A1A;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: Inter, Arial, sans-serif;
  `
  printBtn.onmouseover = () => { printBtn.style.background = '#6B0F1A' }
  printBtn.onmouseout = () => { printBtn.style.background = '#8B1A1A' }
  // printBtn.onclick is set later, after the preview iframe is created,
  // so it can print directly from the preview iframe.

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕ Close'
  closeBtn.style.cssText = `
    background: transparent;
    color: #6B7280;
    border: 1px solid #D4D4D8;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: Inter, Arial, sans-serif;
  `
  closeBtn.onmouseover = () => { closeBtn.style.background = '#F3F4F6' }
  closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent' }
  closeBtn.onclick = closePreview

  toolbar.appendChild(title)
  toolbar.appendChild(filenameLabel)
  toolbar.appendChild(printBtn)
  toolbar.appendChild(closeBtn)
  previewContainer.appendChild(toolbar)

  // Preview iframe — renders the invoice exactly as it will print
  const previewWrapper = document.createElement('div')
  previewWrapper.style.cssText = `
    background: #E5E5E5;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 820px;
    width: 100%;
  `

  const previewIframe = document.createElement('iframe')
  previewIframe.style.cssText = `
    width: 100%;
    height: 80vh;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
  `
  previewWrapper.appendChild(previewIframe)
  previewContainer.appendChild(previewWrapper)

  document.body.appendChild(previewContainer)

  // Load the invoice HTML into the preview iframe
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')
  const pdoc = previewIframe.contentWindow?.document
  const pwin = previewIframe.contentWindow
  if (pdoc) {
    pdoc.open()
    pdoc.write(buildInvoiceHtml(clone, suggestedFilename, styles))
    pdoc.close()
  }

  // Update the print button to print DIRECTLY from the preview iframe.
  // This is the key fix: we print from the preview iframe (which is visible
  // and has real dimensions) instead of closing the preview and creating
  // a second hidden 0×0 iframe that browsers refuse to print.
  printBtn.onclick = () => {
    if (!pdoc || !pwin) {
      // Fallback: close preview and use the off-screen iframe approach
      closePreview()
      setTimeout(() => printInvoice(filenameOpts), 100)
      return
    }
    // Wait for fonts + images to load in the preview iframe, then print
    waitForIframeReady(pdoc).then(() => {
      try {
        // Set the document title — browsers use this as the default
        // "Save as PDF" filename in the print dialog.
        pdoc.title = suggestedFilename.replace(/\.pdf$/i, '')
        pwin.focus()
        pwin.print()
      } catch (e) {
        console.error('Print from preview failed:', e)
        // Fallback: close preview and use the off-screen iframe approach
        closePreview()
        setTimeout(() => printInvoice(filenameOpts), 100)
      }
    })
  }

  // Close preview on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePreview()
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)
}

function closePreview() {
  if (previewContainer && previewContainer.parentNode) {
    previewContainer.parentNode.removeChild(previewContainer)
  }
  previewContainer = null
}
