
---
Task ID: invoice-redesign-2026-09-01
Agent: main
Task: Update new logo + redesign invoice/custom invoice print layouts (A4, professional fonts)

Work Log:
- Copied /home/z/my-project/upload/guruvayur New.png to /home/z/my-project/public/guruvayur-logo.png
- Regenerated all PWA icons (favicon-16/32, apple-touch-icon 180, icon-192/512, maskable-192/512, favicon.ico, og-image.jpg) using PIL with aspect-ratio preservation (maskable icons use deep-burgundy bg + 65% safe-zone)
- Updated logo references in src/app/page.tsx, src/components/pos/login-screen.tsx, src/app/menu/[roomId]/page.tsx
- Rewrote src/lib/print.ts:
  * Injects Google Fonts (Playfair Display 600/700/800, Inter 300-700, Roboto Mono 400-600) via <link>
  * A4 portrait @page with 8mm margins, .invoice-print width 194mm
  * CSS variables for design tokens: --gvd-burgundy #8B1A1A, --gvd-cream #FBF7F0, --gvd-ink #1A1A1A, --gvd-gold #C19A4B, --gvd-gray #6B7280, --gvd-border #D4D4D8
  * Component-class driven stylesheet (.inv-top-strip, .inv-brand-row, .inv-meta-row, .inv-customer, .inv-table, .inv-totals, .inv-footer, .inv-bank-row, .inv-sign-row, .inv-brand-footer)
  * Burgundy table header with zebra striping
  * Highlighted grand-total row (burgundy bg) + bordered balance-due row (gold border)
  * Three-column signature row: Terms + signature arch + For-hotel-name
  * Cleaner 'Powered By: GuardianX' brand footer (uppercase, letter-spaced)
- Redesigned shared components in invoices-panel.tsx:
  * InvoiceHeader: top strip with GSTIN/TAX INVOICE/Original + brand row (logo + hotel name in Playfair Display + dark address bar) + meta row (invoice no / title / date)
  * LeaderRow/LeaderField: cleaner dotted-leader style with monospace meta-value
  * InvoiceTotals: right-aligned card with grand-total and balance-due callouts
  * InvoiceFooter: bank details (Playfair Display title) + QR + 3-column sign row + WhatsApp share (screen-only) + GuardianX brand footer
- Refactored hotel/food/custom invoice sections to use new class names (inv-table, inv-customer, inv-total-row, inv-discount)
- Increased on-screen container padding p-4 -> p-6 so preview matches print
- Build: compiled successfully via `npx next build` (no errors blocking)
- Committed: 92ec631 - pushed to GitHub main
- Vercel auto-deploy: state=READY, URL https://guruvayur-dham-pos.vercel.app/guruvayur-logo.png returns 200

Stage Summary:
- All three invoice types (Hotel/Food/Custom) now share a unified editorial/hospitality-premium A4 layout
- New logo propagated everywhere (sidebar, login, public menu, PWA icons, og-image)
- Print CSS uses Google Fonts loaded at print time so screen preview stays unaffected but print output uses Playfair Display + Inter + Roboto Mono
- Verified live: https://guruvayur-dham-pos.vercel.app/guruvayur-logo.png (HTTP 200)
