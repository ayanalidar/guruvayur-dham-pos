'use client'

// Print invoice using a hidden iframe.
// Injects a professional A4 print stylesheet with Google Fonts (Playfair Display, Inter, Roboto Mono).
// Waits for fonts + images to load before triggering print to avoid blank/broken output.
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
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${styles}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* ===== Professional A4 Invoice Print Stylesheet =====
       Design language: editorial / hospitality-premium
       Palette: deep burgundy #8B1A1A + warm cream #FBF7F0 + dark ink #1A1A1A + soft gold #C19A4B
       Typography: Playfair Display (headings) + Inter (body) + Roboto Mono (numbers)
       Page: A4 portrait (210mm x 297mm) with 8mm margins
    */

    :root {
      --gvd-burgundy: #8B1A1A;
      --gvd-burgundy-deep: #6B0F1A;
      --gvd-cream: #FBF7F0;
      --gvd-ink: #1A1A1A;
      --gvd-gold: #C19A4B;
      --gvd-gray: #6B7280;
      --gvd-border: #D4D4D8;
    }

    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
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

    /* A4 page container — fills printable area */
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

    /* ===================== HEADER ===================== */
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
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12)) !important;
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

    /* Invoice meta row (invoice no + date) */
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

    /* ===================== CUSTOMER DETAILS ===================== */
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

    /* ===================== TABLE ===================== */
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

    .invoice-print table.inv-table thead th:last-child {
      border-right: none !important;
    }

    .invoice-print table.inv-table tbody td {
      padding: 6px 8px !important;
      border-bottom: 1px solid #E5E5E5 !important;
      vertical-align: top !important;
    }

    .invoice-print table.inv-table tbody tr:nth-child(even) td {
      background: #FAFAF8 !important;
    }

    .invoice-print table.inv-table .inv-sr {
      text-align: center !important;
      font-family: 'Roboto Mono', monospace !important;
      font-weight: 500 !important;
      color: var(--gvd-gray) !important;
      width: 8% !important;
    }

    .invoice-print table.inv-table .inv-particulars {
      width: 52% !important;
    }

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

    .invoice-print table.inv-table .inv-discount {
      color: #166534 !important;
    }

    /* ===================== TOTALS PANEL ===================== */
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

    .invoice-print .inv-totals .inv-totals-row:last-child {
      border-bottom: none !important;
    }

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

    /* ===================== FOOTER ===================== */
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
    .invoice-print .inv-footer .inv-bank-detail strong {
      font-weight: 600 !important;
    }

    .invoice-print .inv-footer .inv-qr {
      text-align: center !important;
    }

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

    /* Hide elements marked no-print */
    .no-print { display: none !important; }

    /* ====== CRITICAL: Input/Select rendering in print ======
       When printing from edit mode, inputs and selects must render as plain text.
       We override ALL Tailwind/shadcn input styles with maximum specificity. */
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

    /* Selects: hide the dropdown arrow */
    .invoice-print select::-ms-expand { display: none !important; }

    /* Textareas: render as block text */
    .invoice-print textarea {
      display: block !important;
      resize: none !important;
      overflow: hidden !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
    }

    /* Buttons: hide all buttons in print */
    .invoice-print button {
      display: none !important;
    }

    /* Reset Tailwind utility conflicts for printed invoice */
    .invoice-print .text-2xl { font-size: 22px !important; }
    .invoice-print .text-xl { font-size: 18px !important; }
    .invoice-print .text-lg { font-size: 14px !important; }
    .invoice-print .text-base { font-size: 12px !important; }
    .invoice-print .text-sm { font-size: 10.5px !important; }
    .invoice-print .text-xs { font-size: 9.5px !important; }

    /* Grid layout for edit-mode customer details */
    .invoice-print .inv-customer.grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 6px 12px !important;
    }

    /* Edit-mode field labels */
    .invoice-print .inv-customer.grid label {
      font-size: 7.5pt !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      color: var(--gvd-gray) !important;
      font-weight: 600 !important;
      display: block !important;
      margin-bottom: 1px !important;
    }

    /* Edit-mode items table inputs — render inline */
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

    /* Remove the flex wrapper around qty×rate inputs */
    .invoice-print table.inv-table .inv-rate .flex {
      display: inline-flex !important;
      gap: 2px !important;
      align-items: center !important;
      justify-content: flex-end !important;
      width: 100% !important;
    }

    @media print {
      body { background: white; }
      .invoice-print { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`)
  doc.close()

  // Wait for fonts AND images to load before printing
  const win = iframe.contentWindow
  if (!win) {
    setTimeout(() => {
      try { window.print() } catch (e) { console.error('Print fallback failed:', e) }
      setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe) }, 1000)
    }, 800)
    return
  }

  // Promise that resolves when all images in the iframe are loaded
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
    // Safety timeout: don't wait forever
    setTimeout(resolve, 2000)
  })

  // Promise that resolves when web fonts are loaded
  const fontsLoaded = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve()

  // Promise that gives the iframe's DOM time to layout
  const layoutReady = new Promise<void>(resolve => setTimeout(resolve, 300))

  Promise.all([imagesLoaded, fontsLoaded, layoutReady]).then(() => {
    try {
      win.focus()
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
