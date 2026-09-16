
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

---
Task ID: fix-print-and-editability-2026-09-08
Agent: main
Task: Fix print errors + make all custom invoice fields editable + verify everything

Work Log:
- Audited print.ts for root causes of print errors:
  * Iframe didn't wait for images/fonts to load before printing
  * Logo <img> had no explicit dimensions (layout shift before image loads)
  * Input/select/textarea styles weren't overridden with enough specificity
  * Tailwind global styles were overriding print styles
- Rewrote print.ts:
  * Promise.all waits for: doc.fonts.ready + all images loaded + 300ms layout
  * Added explicit width={180} height={70} to logo <img>
  * Added maximum-specificity overrides for input/select/textarea in print
  * Hide all <button> elements in print output
  * Hide select dropdown arrows via ::-ms-expand
  * Added .invoice-print overflow:visible + box-shadow:none + border:none
  * Added grid layout support for edit-mode customer details
- Fixed InvoiceHeader to accept optional 'date' prop:
  * All three invoice dialogs (Hotel/Food/Custom) now pass date={invoice.createdAt}
  * Header shows the invoice's actual date, not today's date
- Improved Custom Invoice edit-mode items table:
  * Added per-row delete button (X icon, no-print column)
  * Inputs: increased height h-6 -> h-7, added shadow-none, focus-visible:ring-0
  * Rate/qty inputs use font-mono + text-right alignment
  * Room-line rows highlighted with emerald background in edit mode
  * Discount + Total rows: colSpan adjusts dynamically for edit mode's 5th column
  * Table header: conditionally adds empty 5th column header in edit mode
- Server-side recompute on PATCH /api/invoices/custom/[id]:
  * If items/discount/tax rates change, server recomputes itemsTotal, taxable,
    CGST/SGST/IGST amounts, and grandTotal
  * Fetches existing invoice to get current values for fields not in the patch
  * Applies IGST > 0 ? 0 : CGST+SGST rule automatically
  * Sanitizes items (name trim, qty/rate clamped, amount computed)
  * Ensures data consistency regardless of what the client sends
- Re-linked Vercel CLI to correct project (guruvayur-dham-pos, not my-project)
- Deployed via: npx vercel deploy --prod --token <user-scoped-token>

Verification (all passed):
- Production URL https://guruvayur-dham-pos.vercel.app returns HTTP 200
- New logo reachable at /guruvayur-logo.png (HTTP 200)
- 64 existing custom invoices intact
- Create with all fields: itemsTotal, discount, tax amounts, grandTotal all correct
- PATCH all fields: every field updated correctly + server-side recompute verified
  * Changed items from 5×4999+1×500 to 2×999 — itemsTotal recomputed 25495 -> 1998
  * Switched from CGST+SGST 2.5% to IGST 5% — amounts recomputed correctly
  * grandTotal 26559.76 -> 2097.9 (server-side, no client-computed amounts sent)
- Cleanup: test invoices deleted

Stage Summary:
- Print errors fixed: iframe now waits for fonts+images, inputs render as plain text
- All custom invoice fields are editable: invoice number, customer name/phone/address/GSTIN,
  room type, check-in/out dates, all items (name/qty/rate), discount, CGST/SGST/IGST rates,
  payment method, notes
- Server-side recompute ensures data consistency on every PATCH
- Invoice header now shows the invoice's actual date, not today's date
- Production is live and verified end-to-end

---
Task ID: custom-invoice-editable-date-2026-09-15
Agent: main
Task: Make the invoice issue date (createdAt) editable in Custom Invoices (no other changes)

Work Log:
- Audit confirmed `createdAt` was the only non-editable field on custom invoices
  (check-in/check-out dates were already editable; only the invoice issue date was locked)
- Frontend src/components/pos/invoices-panel.tsx (CustomInvoiceDialog):
  * Added `createdAt` to the form state init (sliced to YYYY-MM-DD for input[type=date])
  * Added `createdAt` to the `safeForm` fallback so it's always defined
  * Updated InvoiceHeader `date` prop to use `safeForm.createdAt` when in edit mode
    (falls back to `invoice.createdAt` in view mode, which Object.assign updates after save)
  * Added a new "Invoice Date" <Input type="date"> field in the edit-mode customer grid,
    placed right next to "Invoice No." for visibility
- Backend src/app/api/invoices/custom/[id]/route.ts (PATCH):
  * Added `createdAt` handling alongside the existing checkInDate/checkOutDate block:
    `if (body.createdAt != null) data.createdAt = body.createdAt ? new Date(body.createdAt) : new Date()`
  * Empty string clears to current timestamp (defensive default — never null)
- No other code touched. Hotel invoices, food invoices, KOT, rooms, kitchen, reports, etc.
  remain exactly as before.

Stage Summary:
- Custom invoice issue date is now editable via a date picker in the edit dialog
- The change is reflected in the InvoiceHeader immediately (live preview while editing)
- After save, the PATCH response flows back via Object.assign so the view-mode display
  and the printed invoice both show the new date
- Pattern mirrors the existing checkInDate/checkOutDate handling for consistency

---
Task ID: custom-invoice-create-date-2026-09-16
Agent: main
Task: Add "Invoice Date" field to the New Custom Invoice dialog (so staff can set the date while filling in customer details, instead of creating first then editing)

Work Log:
- Frontend src/components/pos/invoices-panel.tsx (CustomInvoiceCreateDialog):
  * Added `invoiceDate: ''` to initial form state and the reset-on-open call
  * Reorganized the customer details grid:
    - Row 1: Invoice Number | Invoice Date  (new field)
    - Row 2: Customer Name | Phone
    - Row 3: GSTIN | Address  (Address moved up from its own full-width row)
  * Added a new <Input type="date"> labeled "Invoice Date (leave blank for today)"
    next to "Invoice Number (leave blank for auto)"
  * Included `createdAt: form.invoiceDate || undefined` in the POST body sent to
    /api/invoices/custom — undefined makes Prisma fall back to schema @default(now())
- Backend src/app/api/invoices/custom/route.ts (POST):
  * Destructured `createdAt` from the request body alongside the other fields
  * In db.customInvoice.create(), conditionally spread createdAt:
    `...(createdAt ? { createdAt: new Date(createdAt) } : {})`
  * When omitted, Prisma's @default(now()) handles it — fully backward-compatible
- No other code touched. Edit dialog, hotel/food invoices, KOT, rooms, kitchen,
  reports, etc. remain exactly as before.

Stage Summary:
- Staff can now set the invoice issue date at creation time — no need to save
  first then re-open and edit
- Field placement matches the edit dialog (Invoice No. + Invoice Date side-by-side)
- Blank field = today's date (same behavior as before, no breaking change)
- New layout is slightly more compact: 3 rows of 2 fields instead of 3 rows + 1 full-width
