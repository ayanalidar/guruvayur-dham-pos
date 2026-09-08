
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

---
Task ID: room-type-custom-invoice-2026-09-08
Agent: main
Task: Add Room Type dropdown to Custom Invoices with auto-line item behaviour (Option 3)

Work Log:
- Added 'roomType' TEXT nullable column to CustomInvoice in prisma/schema.prisma
- Pushed schema to Neon DB via `prisma db push` (DATABASE_URL + DIRECT_URL = Neon connection string)
- Updated POST /api/invoices/custom to accept and persist roomType
- Updated PATCH /api/invoices/custom/[id] to accept and persist roomType (also strips __roomLine flag from items before saving)
- Added ROOM_TYPES constant: Single Bed / Double Bed / Twin Bed / Deluxe Room / Family Room / Suite
- Added DEFAULT_ROOM_RATES per room type (Single ₹999, Double ₹1499, Twin ₹1799, Deluxe ₹2499, Family ₹2999, Suite ₹4999)
- Added isRoomLine() helper to detect auto-generated room line items
- Redesigned CustomInvoiceCreateDialog:
  * Added Room Type dropdown + Nights (read-only) row above Check-in/Check-out dates
  * useEffect auto-adds/updates/removes a room line item tagged with __roomLine=true
  * Room line quantity = nights (auto-calculated from dates)
  * Room line rate defaults to per-room-type default but is fully editable
  * Emerald highlight on the auto-line row in the items builder
  * Strips __roomLine before POSTing to API
- Redesigned CustomInvoiceDialog (view/edit):
  * Added Room Type dropdown to edit-mode form grid
  * Same auto-line useEffect behavior in edit mode
  * Non-edit view shows 'Room: <type>' in customer details section
  * saveEdit() strips __roomLine flag before PATCHing
- Custom invoice list shows roomType as a secondary badge
- CSV export includes new 'Room Type' column
- Local build: passed cleanly via `npx next build`
- Committed as eb6bf8e, pushed to GitHub main
- Vercel git integration broken (stale gitCredentialId from previous PAT); worked around by deploying directly via Vercel CLI with new user-scoped token
- Production deployment succeeded: https://guruvayur-dham-pos.vercel.app (alias assigned)
- End-to-end API test: created test invoice #177 with roomType=Double Bed, 3 nights, rate 1499 → grandTotal 4721.86 ✓
- Cleaned up test invoice via DELETE

Stage Summary:
- Custom Invoices now support Room Type with auto-line item behavior (Option 3)
- All three invoice types (Hotel/Food/Custom) share the redesigned A4 print layout
- Production is live with the new logo, redesigned invoices, AND the Room Type feature
- DB schema in sync with Neon (roomType column added)
- Verified working end-to-end via API
