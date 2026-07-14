# DukaanPro v2 — Build Checkpoint

Read this first if you're picking this project back up in a new chat. Paste this whole
file to Claude to resume exactly where things left off.

## ✅ What's fully built and working (real, wired, no demo data)

**Database** (`database/schema.sql`)
Complete relational schema: shops, users, refresh_tokens, categories, brands, suppliers,
customers, products, stock_movements, orders, order_items, khata_entries, expenses.
Multi-tenant via `shop_id` on every business table.

**Backend** (`api/`) — Node/Express, ES modules, plain `pg` (no ORM)
- JWT auth with access + refresh tokens (refresh tokens hashed & stored, rotated on use)
- `POST /api/auth/signup` — creates a shop + owner user in one transaction
- `POST /api/auth/login`, `/refresh`, `/logout`, `GET /auth/me`
- Inventory: full CRUD, barcode lookup, stock adjustment (with stock_movements audit trail),
  categories — `api/src/controllers/inventory.controller.js`
- Orders: `POST /api/orders` creates a bill atomically (locks stock rows, decrements stock,
  writes order_items, logs to khata if payment_method is "credit") — `order.controller.js`
- Dashboard summary endpoint (today/month sales, low stock count, recent orders)
- Basic customers endpoint
- Middleware: JWT auth guard, role guard, centralized error handler, rate limiting, helmet, cors
- Verified: all files pass `node --check`, `app.js` imports cleanly with no live DB

**Frontend** (`frontend/`) — React + Vite, matches the existing design system
- `services/api.js` — axios instance with auto token refresh on 401
- `services/{auth,inventory,order,dashboard,customer}.service.js`
- Contexts: AuthContext (real login/signup/me/logout), ThemeContext, ShopContext (dashboard
  summary), NotificationContext
- Routing: `Router.jsx`, `ProtectedRoute.jsx` (redirects to /login if not authed),
  `PublicRoute.jsx` (redirects logged-in users away from /login, /signup)
- Hooks: `useAuth`, `useInventory`, `useOrders`, `useScanner` (stub, see below)
- Pages, all fully connected to the real API, zero hardcoded data:
  - **Login.jsx**, **Signup.jsx** — real auth flow
  - **Dashboard.jsx** — live stats + recent orders from `/dashboard/summary`
  - **Inventory.jsx** — list, search, paginate, add product modal
  - **Orders.jsx** — product search → cart → place order (decrements real stock)
  - **NotFound.jsx**
- CSS: filled in the missing stylesheets (`dashboard.css`, `inventory.css`, `orders.css`,
  `auth.css`, `mobile.css`, `animations.css`) and added the base component classes
  (`.btn`, `.card`, `.input`, `.badge`, `.table`, `.modal`, `.pagination`, `.searchbox`)
  that the existing UI components (Button.jsx, Card.jsx, etc.) needed but didn't have yet.
- **Verified: `npm install && npm run build` succeeds with no errors.**
- `frontend/Dockerfile` added (was missing, referenced by docker-compose.yml)

## ✅ Scanner (just built — real, wired, no demo data)

- `hooks/useScanner.js` — real `@zxing/browser` integration: enumerates cameras (prefers
  back camera), starts/stops `BrowserMultiFormatReader.decodeFromVideoDevice`, decodes
  EAN-13/EAN-8/UPC-A/UPC-E/CODE-128/CODE-39/QR, debounces repeat reads of the same code,
  detects and toggles torch/flashlight via `MediaStreamTrack.applyConstraints`, exposes
  camera switching.
- `components/scanner/CameraView.jsx` — the `<video>` element the reader attaches to.
- `components/scanner/ScanOverlay.jsx` — animated targeting reticle + scan-line.
- `components/scanner/FlashButton.jsx`, `CameraSelector.jsx` — torch toggle and
  front/back camera switch, both self-hide when unsupported by the device.
- `components/scanner/BarcodeScanner.jsx` — composes the above, plays a beep on decode,
  keeps a 10-item scan history, surfaces permission/camera errors with a retry button,
  falls back to a friendly message on unsupported browsers.
- `pages/Scanner.jsx` — full page: live camera feed, manual barcode entry fallback,
  calls the real `inventoryService.lookupByBarcode`, builds a local scan cart (qty
  stepper, remove line), shows an inline "not in inventory — add product" prompt on
  miss, and a "Continue to billing" button that hands the scanned cart to `/orders`
  via router navigation state.
- `pages/Orders.jsx` — updated to read `location.state.scannedCart` on mount and load
  it straight into the billing cart, then clears the handoff state.
- `routes/Router.jsx` — `/scanner` route wired in (Sidebar already linked to it).
- `styles/scanner.css` — camera viewport, reticle/scan-line animation, torch/switch
  buttons, not-found banner, scan history, cart lines (reuses `.orders-cart-line-qty` /
  `.orders-totals` / `.orders-cart-remove` from `orders.css`, which Scanner.jsx now
  also imports).
- Verified: all new/changed files pass `esbuild --jsx=automatic` syntax checks; every
  relative import resolves to a real file; `@zxing/browser`/`@zxing/library` API calls
  checked against the locked versions (0.1.5 / 0.21.3) in `package-lock.json`.
- **Not yet done**: full `npm run build` could not be run in this session (no network
  access to npm registry in the sandbox) — only static/syntax verification was possible.
  Run `npm install && npm run build` locally to do a full compile check before deploying.
- Barcode-to-inventory "online lookup" (fetching product info from an external barcode
  database when not found locally) is still not built — currently on miss it just
  prompts the user to add the product manually.

## ✅ Online barcode lookup fallback (just built — real, wired, no demo data)

Implements the exact flow: scan → backend lookup → Postgres search → if found, autofill
inventory → if not found, search online → save permanently → add inventory.

- **Database**: new global (non-shop-scoped) `barcode_catalog` table
  (`database/schema.sql`, migration at `database/migrations/001_barcode_catalog.sql`) —
  caches barcode → name/brand/category/mrp/unit/image, shared across every shop so the
  external API is only ever called once per barcode, system-wide.
- **Backend**: `api/src/services/barcodeLookup.service.js` calls Open Food Facts
  (`world.openfoodfacts.org`, free, no API key) and normalizes the response. Toggle with
  `BARCODE_LOOKUP_ENABLED` / `BARCODE_LOOKUP_TIMEOUT_MS` in `.env`. A miss or network
  failure degrades to `null`, never throws — a barcode scan should never hard-fail.
  `inventory.controller.js` → `lookupByBarcode` now does the full 3-tier lookup:
  1. shop's own `products` table (returns `product`, real inventory match) →
  2. shared `barcode_catalog` cache (returns `catalogMatch`) →
  3. online API, then persists the result into `barcode_catalog` (returns `catalogMatch`).
  `createProduct` now also accepts `categoryName`/`brandName` (in addition to the existing
  `categoryId`/`brandId`) and upserts them — needed because the barcode match only has
  plain-text brand/category, not an existing row id.
- **Frontend**: `services/inventory.service.js#lookupByBarcode` now returns the full
  `{ source, product, catalogMatch }` payload instead of just a product.
  `pages/Scanner.jsx` — inventory hit still auto-adds to the scan cart as before; a
  `catalogMatch` (cache or fresh online hit) now shows an inline banner with the found
  image/brand/category/MRP and an "Add to inventory" button that hands the data to
  `Inventory.jsx` via the same `prefillProduct` router-state pattern the AI Tools page
  uses. `pages/Inventory.jsx`'s Add Product form gained Brand/Category text inputs and an
  image preview (shown when a barcode match supplied one) to receive that autofill.
  Also fixed a latent bug where the old "not found" banner's manual "Add product" button
  passed `prefillBarcode` — a key `Inventory.jsx` never actually read — so it silently
  did nothing; it now passes `prefillProduct: { barcode }` like everywhere else does.
- **Verified**: `node --check` passes on all changed/new backend files;
  `app.js` imports cleanly with no live DB. Frontend changes were reviewed line-by-line
  for correctness (JSX matched braces, hooks deps, prop names against the real
  `Input`/`Card`/`Button` component APIs already in the codebase) — **could not run
  `npm run build`**, same sandbox limitation as noted in the Scanner section above (no
  network access to the npm registry). Run `npm install && npm run build` locally before
  deploying.
- **Not yet done**: Open Food Facts only covers packaged/FMCG goods well — non-food
  barcodes (electronics, hardware, etc.) will mostly miss. If you need broader coverage,
  add a paid provider (UPCitemdb, barcodelookup.com) as a second call inside
  `barcodeLookup.service.js` when the free lookup returns `null`. There's also no UI yet
  for a shop owner to review/correct a bad `barcode_catalog` entry (e.g. wrong category
  tag from OFF) other than editing the product after adding it — a global cache means a
  bad entry is currently shared by every shop until someone re-triggers an online lookup
  by deleting that cache row directly in the DB.

## ✅ AI Tools (just built — real, wired, no demo data)

- **Backend**: `api/src/services/gemini.service.js` calls Gemini's REST `generateContent`
  endpoint directly (no SDK dependency) — set `GEMINI_API_KEY` (and optionally
  `GEMINI_MODEL`, defaults to `gemini-2.0-flash`) in `.env`. Three capabilities:
  - `recognizeProductFromImage` — vision call, returns structured JSON (name, category,
    brand, unit, visible barcode, description, confidence).
  - `extractLineItemsFromImage` — vision call for OCR of supplier invoices / handwritten
    stock lists, returns structured line items (name, qty, unit, price).
  - `summarizeInventoryPrediction` — text-only, turns already-computed stats into a short
    plain-language summary. **Never generates the numbers themselves** — those come from
    real SQL math in the controller — so the AI can't hallucinate stock figures.
  - `api/src/controllers/ai.controller.js` — `GET /api/ai/inventory-prediction` computes
    average daily sale rate per product from `stock_movements` (reason='sale') over a
    configurable lookback window, projects days-of-stock-remaining, flags
    critical/warning/watch/ok risk levels, and suggests a reorder quantity — all
    deterministic. `POST /api/ai/recognize-product` and `POST /api/ai/extract-invoice`
    take `{ imageBase64, mimeType }` JSON bodies (client resizes images to max 1024px
    before sending, so no multer/file-upload dependency was needed).
- **Frontend**: `pages/AIRecognition.jsx` (route `/ai-recognition`, already linked from
  the sidebar as "AI Tools") — three tabs:
  1. **Product Recognition** — camera/upload capture (`utils/image.js` resizes to base64
     client-side), shows AI's structured guess, "Add to inventory" hands off to
     `Inventory.jsx` via router state (same pattern as the Scanner→Orders handoff) and
     pre-fills + opens the Add Product modal.
  2. **OCR Bulk Import** — photograph an invoice/stock list, get an editable table of
     extracted line items, bulk-create them into inventory with one click.
  3. **Inventory Prediction** — at-risk product table (stock, avg daily sales, days
     remaining, suggested reorder qty, risk badge) plus the optional AI narrative summary;
     "show full forecast" toggle reveals every active product, not just at-risk ones.
  - `services/ai.service.js`, `styles/ai.css` added; `Router.jsx` wired.
- **Verified**: `npm run build` (frontend) succeeds with no errors; `node --check` passes
  on all new/changed backend files; `app.js` imports cleanly with no live DB.
- **Not yet done**: no in-app UI for setting `GEMINI_API_KEY` — it's a server env var
  only. If it's unset, the AI routes return a clean 503 with a message telling the shop
  owner to configure it, rather than crashing.

## ✅ Khata (credit ledger) page — just built — real, wired, no demo data

- **Backend**: `api/src/controllers/khata.controller.js` + `api/src/routes/khata.routes.js`,
  mounted at `/api/khata` behind `requireAuth` in `routes/index.js`.
  - `GET /api/khata/summary` — total to collect, total given on credit / collected all-time,
    count of customers currently in debt. All computed live from `khata_entries`.
  - `GET /api/khata/customers?search=&onlyWithDue=true` — every shop customer with a computed
    balance (`SUM(debit) - SUM(credit)`) and last ledger activity, sorted by balance desc.
  - `GET /api/khata/customers/:customerId` — one customer's full entry history + running balance.
  - `POST /api/khata/customers/:customerId/entries` — add a manual `debit` (gave goods on
    credit) or `credit` (payment received) entry. Tenant-scoped, row-locked on the customer
    row to avoid races.
  - `DELETE /api/khata/entries/:entryId` — remove a mis-entered line.
  - Existing credit-order flow (`order.controller.js` writing a `debit` khata entry when
    `payment_method = 'credit'`) is untouched and feeds the same ledger these endpoints read.
- **Frontend**: `pages/Khata.jsx` (route `/khata`, already linked from the sidebar).
  - Summary cards (total to collect / customers with due / given on credit / collected).
  - Searchable customer table with an "only show due" toggle; balance shown as a
    due/settled/advance badge.
  - Clicking a customer opens a ledger modal: running balance, full entry history, a
    form to record a payment received or a new credit given, and delete on any entry.
  - "Send WhatsApp reminder" — a `wa.me` deep link built client-side from the customer's
    phone + a prefilled message (no `WHATSAPP_API_KEY`/backend integration needed or
    implied; the shop owner still taps send themselves in WhatsApp). Hidden if the
    customer has no phone number or no due balance.
  - "Add customer" quick-create modal (reuses the existing `customerService.create`) since
    there's still no full Customers page — this keeps Khata usable standalone.
  - `services/khata.service.js`, `styles/khata.css`, and a `buildWhatsAppLink` helper in
    `utils/helpers.js` were added; `Router.jsx` wired.
- **Verified**: `node --check` passes on all new/changed backend files. Frontend changes
  were reviewed line-by-line against the real `Card`/`Table`/`Button`/`Modal`/`Input`
  component APIs already in the codebase, and brace/paren balance was checked — **could
  not run `npm install && npm run build`**, same sandbox limitation noted in every prior
  session (no network access to the npm registry here). **Run `npm install && npm run
  build` locally before deploying — this has not been done for this feature yet.**
- **Scope note**: this only covers the customer side of khata (the standard "khata book"
  use case). The `khata_entries` table also supports `party_type = 'supplier'`, but there's
  no supplier backend at all yet (see below), so supplier khata was intentionally left out.

## ✅ Settings page — just built — real, wired, no demo data

- **Backend**: `api/src/controllers/settings.controller.js` + `routes/settings.routes.js`,
  mounted at `/api/settings` behind `requireAuth` in `routes/index.js`. Validated with
  `validators/settings.validator.js` (zod), following the exact same pattern as
  `auth.validator.js`.
  - `GET /api/settings/shop` — the shop's own profile (name, owner phone, address, gstin,
    plan). Any logged-in user can view.
  - `PUT /api/settings/shop` — update shop profile. `requireRole("owner", "manager")`.
  - `PUT /api/settings/profile` — update your own name/phone (email is intentionally not
    editable here since it's the login identifier).
  - `PUT /api/settings/password` — change your own password. Verifies `currentPassword`
    with bcrypt before allowing the change, then revokes every refresh token for that user
    (`refresh_tokens.revoked_at`) so other logged-in devices are signed out.
  - `GET /api/settings/team` — list every user on the shop (`requireRole("owner","manager")`).
  - `POST /api/settings/team` — owner-only: create a manager/cashier/staff login for the
    shop (reuses the same bcrypt signup flow as `auth.controller.js#signup`, minus the new
    shop — it attaches to `req.user.shopId`). Rejects duplicate emails (global unique
    constraint on `users.email`).
  - `PATCH /api/settings/team/:userId` — owner-only: change a teammate's `role` and/or
    `is_active`. Blocked from touching the owner row or the caller's own row (self-changes
    go through `/profile` and `/password` instead). Deactivate instead of delete is used
    for removing a teammate, since `orders.created_by` / `stock_movements.created_by`
    reference `users(id)` with no `ON DELETE CASCADE` — a hard delete would fail once that
    person has any orders/stock history, so there's no delete endpoint at all.
- **Frontend**: `pages/Settings.jsx` (route `/settings`, already linked from the sidebar) —
  four tabs, same tab-bar pattern as `AIRecognition.jsx`:
  1. **Shop Profile** — editable by owner/manager, read-only for cashier/staff (backend
     also enforces this via `requireRole`, this is UI-level, not the only guard).
  2. **My Profile** — name/phone, email shown read-only; on save, patches the cached user
     in `AuthContext` via a new `updateUser()` method (no full refetch needed).
  3. **Password** — current + new + confirm, client-side match/length check before hitting
     the API; shows the "you'll be signed out elsewhere" hint up front.
  4. **Team** (owner-only tab, hidden entirely for non-owners) — table of every user on the
     shop with an inline role `<select>` and an Activate/Deactivate button per row, plus an
     "Add team member" modal. Uses `utils/permissions.js#canManageSettings` implicitly via
     the `user.role === "owner"` check (that helper already existed from a prior session,
     unused until now).
  - `services/settings.service.js`, `styles/settings.css` added; `Router.jsx` wired;
    `context/AuthContext.jsx` gained `updateUser(patch)` — merges fields into the cached
    user object, exposed alongside `login`/`signup`/`logout`.
- **Sidebar cleanup**: `components/layout/Sidebar.jsx` — removed the links to pages that
  don't exist yet (Billing, Analytics, Customers, Suppliers, Expenses, Reports) so the
  sidebar only shows Dashboard, Inventory, Scanner, Orders, Khata, AI Tools, Settings —
  everything currently clickable now goes to a real, working page. `Router.jsx`'s
  not-yet-built comment was trimmed to match (Settings removed from it, Subscription
  still listed since it was never in the sidebar to begin with).
- **Verified**: `node --check` passes on all new/changed backend files. Frontend changes
  verified with `esbuild --jsx=automatic` syntax checks (same sandbox limitation as every
  prior session — **no network access to the npm registry here, so `npm install && npm
  run build` could not be run**; every relative import was checked by hand to resolve to a
  real file, and prop names were checked against the real `Card`/`Table`/`Button`/`Modal`/
  `Input`/`Badge` component APIs). **Run `npm install && npm run build` locally before
  deploying — this has not been done for this feature yet.**
- **Not yet done**: no "forgot password" / email-based reset flow (out of scope — this is
  only the logged-in "change my password" flow). No UI to resend/reset a teammate's
  temporary password if they forget it — the owner would currently have to deactivate and
  re-invite with a new email, or you'd add a "reset password" admin action later. No shop
  logo/branding upload (schema has no column for it yet — would need an `image_url` on
  `shops` plus real object storage, out of scope for this pass).

## What's NOT built yet (out of scope for this pass, by explicit request)

The rest of the original roadmap was deliberately left untouched this session:

1. **Billing / Invoices** — PDF invoice generation (jspdf is installed), thermal printing
   (58mm/80mm), GST invoice format, invoice numbering beyond the simple ORD-xxx scheme.
4. **Customers / Suppliers pages** — backend endpoints exist for customers (list/create);
   suppliers has no backend yet at all. Pages not built.
5. **Analytics / Reports pages** — no backend aggregation endpoints beyond the dashboard
   summary yet (top products, profit analysis, Excel/PDF/CSV export).
6. **Expenses page** — table exists in schema, no controller/route/page yet.
7. **Subscription page, Admin panel** — not started.
8. **PWA + Offline support** — `vite-plugin-pwa` is installed but only doing default
   asset precaching; no offline queue for orders/stock changes made while disconnected.
9. **Push notifications** — `NotificationContext` exists but isn't wired to real
   browser/push notifications yet, just in-app toasts.
10. **Payments (Razorpay)**, **audit logs**, **role-based UI restrictions elsewhere in the
    app** (Settings now uses `requireRole`/`utils/permissions.js`, but Inventory/Orders/etc.
    still don't gate any UI by role) — not started.
11. **Database migrations/seeds folder** — currently just one `schema.sql` run via Docker's
    init script. No migration tooling (e.g. node-pg-migrate) set up yet if you need
    incremental schema changes on a live DB.

Sidebar now only links to pages that exist (Dashboard, Inventory, Scanner, Orders, Khata,
AI Tools, Settings) — when you build one of the items above, add it back to
`components/layout/Sidebar.jsx`'s `NAV_ITEMS` and its route to `routes/Router.jsx`.

## How to run it locally

```bash
cp .env.example .env        # fill in real secrets
docker compose up --build   # starts postgres, api (port 4000), frontend (port 5173/80)
```
Or run frontend/api separately with `npm run dev` in each folder against a local Postgres.

## Suggested next session prompt

"Continue DukaanPro from HANDOFF.md — build Billing/Invoices next" (or whichever item
from the list above you want tackled first — Customers/Suppliers pages or Expenses are
the next-smallest since their DB tables already exist).
