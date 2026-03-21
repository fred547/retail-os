# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one backend, one Supabase database.

## Repository Map

| Directory | What it is |
|-----------|-----------|
| `pos-android/` | Production Android POS app (Kotlin, Gradle, Hilt, Room) — offline-first |
| `pos-android/server-side/posterita-cloud/web/` | **Production web console** (Next.js on Vercel) — admin CRUD |
| `pos-android/server-side/posterita-cloud/` | Vercel serverless API routes (sync, AI import, Blink payments) |
| `pos-android/server-side/posterita-cloud/supabase/` | Supabase migrations |
| `posterita-prototype/` | Interactive UI prototype (React JSX, 1,242 lines) — design reference |
| `specs/` | AI-optimized specification files (split from master plan v3.9) |
| `manus-retail-os/` | Manus prototype — **inspiration only, NOT production code** |
| `manus-retail-os-prototype/` | Earlier Manus variant — **inspiration only** |
| `posterita-loyalty/` | Legacy loyalty Flask API (being retired) |
| `downloads-archive/` | Historical files, master plan PDF/MD |

## Stack

- **Android:** Kotlin, Gradle, Room, Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink payments
- **Web Console:** Next.js 14+ (App Router) on Vercel — at `pos-android/server-side/posterita-cloud/web/`
- **Backend API:** Vercel serverless functions at `posterita-cloud.vercel.app/api/`
- **Database:** Supabase Postgres (sole source of truth)
- **Auth:** Supabase Auth (web console login), OTT tokens (Android WebView), PIN (Android device unlock)
- **Media:** Cloudinary | **WhatsApp:** Meta Cloud API | **Payments:** Blink SDK

## API Endpoints

- **Production:** `https://posterita-cloud.vercel.app/api/` — sync, data, AI import, Blink
- **Web Console:** `https://web.posterita.com` (alias for posterita-cloud.vercel.app)
- **Legacy (DO NOT USE):** `https://my.posterita.com/posteritabo` — old Java backend, all `app/*` endpoints are dead
- **Loyalty (legacy):** `https://loyalty.posterita.com/api/` — being migrated

## Deployment

- **Vercel project:** `posterita-cloud` (team: `tamakgroup`)
- **Deploy command:** `cd pos-android/server-side/posterita-cloud/web && npx vercel --prod --yes`
- **IMPORTANT:** Always deploy from the `web/` directory. If `.vercel/project.json` points to the wrong project, re-link: `npx vercel link --project posterita-cloud --yes`
- **Domains:** `posterita-cloud.vercel.app` and `web.posterita.com`
- **Supabase migrations:** Run via Management API (see memory file `reference_supabase.md`). After DDL changes, reload schema cache: `NOTIFY pgrst, 'reload schema'`
- All API routes use `force-dynamic` or lazy-init Supabase clients — never create `createClient()` at module scope

## Key Architectural Rules

1. **Android never talks to Supabase directly** — all data flows through the API
2. **Web console reads Supabase directly** (via Supabase client) — mutations go through API routes
3. **Context = account_id + store_id + terminal_id** — every query is scoped to this context
4. **Inventory count is scan-only** — no manual data entry
5. **Offline-first** — every store-floor operation works without connectivity
6. **Capability-driven UI** — role-based, not hardcoded screen lists
7. **Three-layer feature rule** — see Feature Development Workflow below
8. **No CRUD scaffolds** — see UI Pattern Rules below
9. **All errors go through AppErrorLogger** — see Error Logging below
10. **Legacy workers are disabled** — `OrderSyncWorker`, `CloseTillSyncWorker`, `DocumentNoSyncWorker` skip for cloud/standalone accounts. Only `CloudSyncWorker` handles sync.

## Feature Development Workflow

**CRITICAL: When implementing any feature, it must be built across all three layers:**

### Layer 1: Database (Supabase)
- Add migrations in `pos-android/server-side/posterita-cloud/supabase/migrations/`
- Run via Supabase Management API (see deployment section)
- `account_id` is TEXT (not UUID) — values like `"standalone_1774110618083"` or server-assigned IDs
- This is the source of truth

### Layer 2: Backend API (Vercel serverless)
- Add API routes in `pos-android/server-side/posterita-cloud/web/src/app/api/`
- CRUD endpoints that Android and Web Console both call
- Validation, business logic

### Layer 3a: Web Console (Next.js)
- Admin CRUD pages in `pos-android/server-side/posterita-cloud/web/src/app/(dashboard)/`
- Used for: creating/editing products, stores, terminals, users, taxes, categories, brands
- Embedded inside Android app via WebView for admin tasks

### Layer 3b: Android App (Kotlin)
- POS operations: sales, cart, payments, receipts, scanning, till management
- Offline Room DB with sync engine
- WebView embeds web console for all data management (products, stores, terminals, users, categories, taxes)
- Only printers are configured natively (local device concern)

### When to build where:

| Task | Android | Web Console | API |
|------|---------|-------------|-----|
| **POS checkout flow** | Native | — | Sync orders |
| **View/edit products** | WebView (`/products`) | Native | CRUD |
| **View/edit stores** | WebView (`/stores`) | Native | CRUD |
| **View/edit terminals** | WebView (`/terminals`) | Native | CRUD |
| **View/edit users** | WebView (`/users`) | Native | CRUD |
| **View/edit categories** | WebView (`/categories`) | Native | CRUD |
| **View/edit taxes** | WebView (`/settings`) | Native | CRUD |
| **Manage brands** | Native (owner only) | Native | CRUD |
| **Product intake** | WebView (`/intake`) | Native | AI extraction + matching |
| **View orders** | Native | Native | Query |
| **Till management** | Native | View only | Sync |
| **Printer config** | Native (local) | — | — |
| **Barcode scanning** | Native | — | — |
| **Reports/analytics** | WebView (`/reports`) | Native | Query |
| **Error logs** | Auto-synced | Native (`/errors`) | Sync |

### WebView Integration Pattern

**The web console is the primary CRUD interface. Android embeds it via `WebConsoleActivity`.**

- Settings items open web console pages in a WebView
- `WebConsoleActivity` takes `EXTRA_PATH` (e.g., `/products`) and `EXTRA_TITLE`
- **Auth flow:**
  1. Android calls `POST /api/auth/ott` with `account_id`, `user_id`, `store_id`, `terminal_id`
  2. Server creates a 60-second one-time token in `ott_tokens` table
  3. Android loads `https://web.posterita.com/products?ott=<token>`
  4. **Middleware** validates the OTT, sets httpOnly cookie `posterita_ott_session`, redirects to `/customer/products` (without `?ott`)
  5. **Customer layout** checks OTT cookie → skips Supabase Auth → renders page
  6. **`getSessionAccountId()`** reads `account_id` from OTT cookie as fallback
- Sidebar is hidden: customer layout detects OTT session and omits `<Sidebar />`
- CSS injection also hides sidebar classes as backup
- WebView blocks navigation to `/login`, `/customer/login`, `/platform`, `/manager` to prevent breaking Android nav
- After editing, Android syncs via CloudSyncWorker to get updated data

## Web Console Routes

Real web app at `pos-android/server-side/posterita-cloud/web/`:

### Context Selection (before dashboard)
| Route | Page | Status |
|-------|------|--------|
| `/platform` | Owner's brand list → pick brand | ✅ |
| `/platform/[brand]/stores` | Stores in brand → pick store | ❌ Needs building (web console only) |
| `/platform/[brand]/[store]/terminals` | Terminals in store → pick terminal | ❌ Needs building (web console only) |

Login flow: **Owner → Brand → Store → Terminal → Dashboard** (context set for session).
Note: Android handles context selection natively via the Home screen context switcher (Store › Terminal picker).

### Dashboard & Operations (scoped to selected terminal/store/brand)
| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard (today's stats for selected context) | ✅ |
| `/orders` | Orders | ✅ |
| `/customers` | Customers | ✅ |
| `/reports` | Reports | ✅ |
| `/errors` | Error logs (remote debugging) | ✅ |

### Product Intake (scoped to selected brand)
| Route | Page | Status |
|-------|------|--------|
| `/intake` | Intake dashboard — batch list, pending review counts | ✅ |
| `/intake/new` | Start new intake — pick source, upload/enter input | ✅ |
| `/intake/[batchId]` | Review batch — item-by-item approval with AI matching | ✅ |

### Data Management (scoped to selected brand)
| Route | Page | Status |
|-------|------|--------|
| `/products` | Products (CRUD, status tabs: Live / Pending Review / Drafts) | ✅ |
| `/categories` | Categories | ✅ |
| `/stores` | Stores | ✅ |
| `/terminals` | Terminals | ✅ |
| `/users` | Users | ✅ |
| `/settings` | Settings/Taxes | ✅ |
| `/ai-import` | AI product import (legacy — being replaced by intake pipeline) | ✅ |
| `/price-review` | Price review queue (staff-set prices) | ✅ |
| `/brands` | Brand management | ❌ Needs building |

## Auth Flow

### Web Console Login
1. Owner logs in with email/password (Supabase Auth)
2. Sees their brands on `/platform`
3. Picks a brand → sees stores → picks a store → sees terminals → picks a terminal
4. Session context is now: `account_id` + `store_id` + `terminal_id`
5. All pages (dashboard, orders, reports) are scoped to this context
6. Owner can switch context via the platform nav at any time

### Android First Launch (New User)
1. No account → SetupWizard:
   - Welcome
   - Create Account (email + password + phone) → triggers email OTP (non-blocking verification)
   - Your Name
   - Brand Name
   - Country
   - Category
   - Set PIN (4 digits, mandatory)
   - AI Building (setting up store)
2. Creates owner + 2 brands (live + demo) via `POST /api/auth/signup`
3. Goes straight to Home — user is already authenticated (just completed signup)
4. Non-blocking banner: "Check your email to verify your account" (needed for password reset later)

### Android Login (Returning User / New Device)
1. Welcome screen → tap "Log In"
2. Enter email + password
3. **Online-first:** calls `POST /api/auth/lookup` to find account by email
4. If found → gets `live_account_id` and `demo_account_id`
5. Sets up local account, triggers immediate CloudSync to pull all data (products, users, stores, etc.)
6. Waits for sync to bring down user record, validates password against `user.pin` or `user.password`
7. If sync hasn't completed → creates temporary local user from email, proceeds to Home
8. On next sync cycle, full data arrives and overwrites the temp user
9. **Offline fallback:** if no internet, tries local Room databases (previously synced accounts)

### Password vs PIN
- **Password:** account-level credential for Supabase Auth (web console login, password reset). Set during signup. Any length.
- **PIN:** 4-digit device unlock code for quick re-entry on Android. Set during setup wizard (mandatory). Stored locally (Room) AND synced to Supabase (so it works on any device after sync).
- These are **separate fields** on the user record. Never conflate them.

### Subsequent Launches (Cold Start)
- **Always show lock screen with 4-digit PIN numpad** — regardless of how many users exist
- Correct PIN → Home
- No PIN set (edge case) → auto-unlock to Home

### Session Timeout (30 min idle)
- Every touch resets the idle timer
- After 30 minutes of no interaction → Lock Screen
- Lock Screen: logo + "Welcome back" + 4-digit PIN numpad
- Correct PIN → returns to where you were (no data loss)
- Wrong PIN → shake animation + error + retry
- Back button → moves app to background (can't bypass)

### Device Types
- **Owner's phone (unenrolled):** PIN on every cold start + after idle timeout
- **Store tablet (enrolled):** Staff picker + PIN on every shift change, 5-min idle timeout
- **Enrollment:** QR code scan links device to store + terminal (Phase 1)

### Security Layers
1. **Email OTP** — verifies email during signup (non-blocking, needed for password reset)
2. **Password** — account auth for web console (Supabase Auth)
3. **PIN** — 4-digit quick device unlock (mandatory, synced)
4. **OTT** — one-time token for WebView auth (60-second expiry, single use)
5. **Biometric** — optional shortcut for PIN (fingerprint/face)
6. **Role-based** — cashier can't void/refund without supervisor PIN

## UI Pattern Rules

**These rules apply to ALL screens — Android native, web console, and any future platform. No exceptions.**

### No CRUD Scaffolds
Never build screens that look like a database admin tool. Every screen should feel designed.

### View = Detail Brochure
When viewing any entity (product, store, terminal, user, tax, category):
- **Hero header** with colored icon + title + key stat + flag chips
- **Section cards** grouping related fields
- **Chips for booleans** — never show "Yes"/"No" as plain text
- See `.claude/skills/posterita-ui/SKILL.md`

### Edit = Section Editors (Progressive Disclosure)
When editing any entity, NEVER show a single large form with all fields:
- Each **section card** in the brochure is **tappable**
- Tapping opens a **bottom sheet** or **inline editor** with only that section's 2-4 fields
- User edits, taps Save, sheet closes, brochure refreshes
- Each section saves independently (partial saves OK)

### Create = Wizard (Composable Steps)
When creating a new entity:
- Chain the same section editor components as sequential wizard steps
- Step 1: required fields → Step 2: optional fields → ... → Done
- Progress dots at top, can skip optional steps
- Same UI components used in both edit (standalone) and create (chained) modes

### List = Styled Item Cards
When listing entities:
- Colored icon + title + subtitle + badge + chevron
- Never use unstyled lists or raw table rows
- Color-code icons by entity type, role, or status

## Error Logging

**All errors MUST go through `AppErrorLogger`, never raw `Log.e()` or silent `catch (_: Exception) {}`.**

### How it works
```
Error occurs → AppErrorLogger.log(context, tag, message, exception)
    ↓ Logcat (always)
    ↓ Friendly toast to user ("Something went wrong")
    ↓ Saved to Room error_log table (offline)
    ↓ CloudSyncWorker pushes to Supabase via POST /api/sync
    ↓ Web console /errors page (for developers)
```

### API
```kotlin
// ERROR — shows toast, saves to DB, logs to logcat
AppErrorLogger.log(context, "CartActivity", "Payment failed", exception)

// WARN — no toast, saves to DB, logs to logcat
AppErrorLogger.warn(context, "CloudSync", "Retry attempt 2", exception)

// FATAL — for uncaught crashes (auto-installed via crash handler)
AppErrorLogger.fatal(context, "UncaughtException", "Crash", throwable)

// INFO — diagnostic, no toast
AppErrorLogger.info(context, "Sync", "Sync completed in 3.2s")
```

### Rules
1. **NEVER use `catch (_: Exception) {}`** — always log with `AppErrorLogger.warn()` at minimum
2. **NEVER use raw `Log.e()`** for errors — use `AppErrorLogger.log()` so it gets synced
3. **User sees:** "Something went wrong. Please try again." (friendly toast)
4. **Developer sees:** full stack trace + device info + user context in Supabase
5. **Cleanup:** synced logs older than 7 days are auto-deleted

### Stack
- **Android:** `ErrorLog` entity → `ErrorLogDao` → `AppErrorLogger` utility → synced by `CloudSyncService`
- **API:** `POST /api/sync` handles `error_logs` array in sync request
- **Database:** `error_logs` Supabase table (migration `00013_error_logs.sql`)
- **Crash handler:** `AppErrorLogger.installCrashHandler()` in `PosteritaApp.onCreate()`

## Android Navigation Architecture

- **Home screen:** Hub with bottom nav (Home | POS | Orders | More)
- **Context switcher:** Tappable "Store › Terminal ▾" under greeting — opens picker dialog to switch store/terminal
- **POS drawer:** Home, Orders, Terminal Info, Printers, Till History
- **POS MORE menu:** Open Cash Drawer, Clear Cart, Hold Order, Close Till
- **Settings:** Opens web console pages via WebView (all data management)
- **Connectivity dot:** Green/red in every top bar, tap opens sync screen
- **Sync:** Automatic (5-min CloudSyncWorker). Manual via connectivity dot.

## Data Hierarchy

```
Owner (person)
├── Brand 1 (Account) — "Café Mocha Ltd"
│   ├── Currency, WhatsApp, head office address, website
│   ├── Denominations (notes + coins for the currency — used in till counting)
│   ├── Store A — "Main Street"
│   │   ├── Terminal 1 (POS) ← login context
│   │   │   ├── POS config (columns, categories, security)
│   │   │   ├── Float amount (stored on terminal, persists across till sessions)
│   │   │   └── Printers (receipt, kitchen, bar, label)
│   │   └── Terminal 2 (Kitchen)
│   ├── Store B — "Mall Branch"
│   │   └── Terminal 3 (POS)
│   └── Users (roles: owner, admin, supervisor, cashier, staff)
│
├── Brand 2 (Account) — "Pizza Express Ltd"
│   ├── Store C — "Downtown"
│   │   └── Terminal 4 (POS) ← login context
│   └── Users (separate staff roster)
│
└── Demo Brand (auto-created on signup)
    ├── Demo Store + Demo Terminal
    └── Sample data (products, categories, taxes)
```

### Context Model
- **Web console login = terminal level.** The session carries `account_id` + `store_id` + `terminal_id`.
- **Owner sees all brands** they own. Can switch between them on `/platform`.
- **Admin sees one brand** — the stores and terminals within it.
- **Staff sees one terminal** — scoped to their assigned store.
- **Web console navigation:** Owner → pick brand → pick store → pick terminal → dashboard scoped to that context.
- **Android app:** context switcher on Home screen lets owner pick Store › Terminal. Brand switching via Brands tile.

## Till Management

### Denominations
- Defined at **brand level** (currency-specific, e.g. MUR notes: Rs 2000, 1000, 500, 200, 100, 50, 25 + coins: Rs 10, 5, 1)
- Same denomination set used for both opening and closing counts
- Stored as brand configuration, synced to Android

### Open Till
1. **Denomination counter** — single scrollable screen, largest to smallest
   - Notes section, then Coins section
   - Each row: denomination label + stepper (`-` `[n]` `+`) + subtotal
   - Running total updates live as user enters counts
   - Zero-prefilled — skip denominations you don't have
2. User physically counts cash in the drawer and enters count per denomination
3. System totals the counted amount → that's the **opening float**
4. System does NOT reveal the expected float (forces honest count)
5. Float amount stored on terminal record for next session

### Close Till — Full Reconciliation
All tender types are reconciled, not just cash.

**Step 1: Count cash** (same denomination counter as open till)
**Step 2: Enter card batch total** (manual entry from card machine's batch report)
**Step 3: Enter Blink total** (manual entry for now)

**Step 4: Reconciliation summary**
```
Opening float       Rs 500.00
+ Cash sales        Rs 3,200.00
- Cash refunds      Rs 150.00
─────────────────────────────
Expected cash       Rs 3,550.00
Counted cash        Rs 3,520.00

Expected card       Rs 1,500.00
Entered card        Rs 1,500.00

Expected Blink      Rs 800.00
Entered Blink       Rs 800.00

═════════════════════════════
TOTAL EXPECTED      Rs 5,850.00
TOTAL COUNTED       Rs 5,820.00
─────────────────────────────
SHORTAGE            Rs -30.00
```

### UX Rules for Till Screens
- **No progressive disclosure** for the denomination counter — one scrollable screen
- **Stepper input** (`-` `[n]` `+`) per denomination, not a numpad
- Denominations ordered **largest to smallest**, grouped Notes / Coins

## Brand Colors

- Primary: `#1976D2` | Light: `#DCEBFF` | Dark: `#0D5DB3`
- Success: `#2E7D32` | Error: `#E53935` | Warning: `#F57F17`
- Purple: `#5E35B1` | Background: `#F5F2EA` | Paper: `#FFFFFF`
- Ink: `#141414` | Muted: `#6C6F76` | Line: `#E6E2DA`

## Product Intake Pipeline

Products enter the system from many sources but NEVER go straight to the POS. Every product passes through a staging area where the owner reviews, enhances, and approves before it becomes sellable.

### Core Concept: Intake Batch → Intake Items → Products

```
Source → intake_batch → intake_items (AI extraction + matching)
    → Owner reviews in web console (/intake/[batchId])
    → Approve → creates/updates products as live → syncs to POS
    → Reject → skipped, kept for audit
```

### Database Schema

#### `intake_batch` — one import action

| Column | Type | Purpose |
|--------|------|---------|
| `batch_id` | SERIAL PK | |
| `account_id` | INT | Scoped to brand (TEXT in Supabase, INT in Room) |
| `source` | TEXT | `website`, `catalogue`, `purchase_order`, `invoice`, `ai_search`, `supplier_feed` |
| `source_ref` | TEXT | URL, filename, PO number, invoice number |
| `source_file_url` | TEXT | Cloudinary URL of uploaded document |
| `status` | TEXT | `processing` → `ready` → `in_review` → `committed` / `failed` |
| `item_count` | INT | Total items extracted |
| `approved_count` | INT | Items approved (created or merged) |
| `rejected_count` | INT | Items skipped |
| `supplier_name` | TEXT | Extracted or entered supplier name |
| `created_at` | TIMESTAMPTZ | |

#### `intake_item` — one candidate product within a batch

| Column | Type | Purpose |
|--------|------|---------|
| `item_id` | SERIAL PK | |
| `batch_id` | INT FK | Parent batch |
| `account_id` | INT | |
| `name` | TEXT | Product name as extracted |
| `selling_price` | NUMERIC(12,2) | Selling price if available |
| `cost_price` | NUMERIC(12,2) | Cost/wholesale price if available |
| `image_url` | TEXT | Original source URL |
| `image_cdn_url` | TEXT | After Cloudinary upload |
| `barcode` | TEXT | UPC/EAN if found |
| `category_name` | TEXT | Raw category text |
| `match_product_id` | INT FK nullable | Matched existing product |
| `match_confidence` | NUMERIC(3,2) | 0.00–1.00 |
| `match_type` | TEXT | `exact`, `fuzzy`, `new`, `manual` |
| `status` | TEXT | `pending`, `approved`, `rejected`, `merged` |
| `committed_product_id` | INT FK nullable | Product created/updated on commit |

### Product Lifecycle Columns (on `product` table)

| Column | Values | Purpose |
|--------|--------|---------|
| `product_status` | `live`, `draft` | `live` = sellable on POS. `draft` = owner WIP. Default `live`. |
| `source` | `manual`, `website`, `catalogue`, `purchase_order`, `invoice`, `ai_search` | How product was created |
| `needs_price_review` | `"Y"` / `null` | Staff changed the price — owner needs to approve |

Note: `product_status = 'review'` exists in the CHECK constraint but is being phased out. New products from intake land as `live` after approval.

### Three Review Queues (independent)

| Queue | Where | When |
|-------|-------|------|
| **Intake review** | `intake_item.status` | Before a product exists — external data → product |
| **Product draft** | `product.product_status = 'draft'` | During manual creation — owner hasn't finished |
| **Price review** | `product.needs_price_review = 'Y'` | After live — staff changed the price |

### API Routes for Intake

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/intake` | POST | Create batch (returns batch_id) |
| `/api/intake` | GET | List batches for account |
| `/api/intake/[batchId]` | GET | Get batch + items + matched products |
| `/api/intake/[batchId]/process` | POST | AI extraction + matching (SSE streaming) |
| `/api/intake/[batchId]/review` | POST | Approve/reject items, commit to product table |

### Supplier Management (Future)

Intake batches track `supplier_name`. Over time this builds a supplier directory — foundation for Phase 2 procurement module.

## Current Phase

**Phase 0** — Android app cleanup, UI consistency, offline POS solid. ✅ Nearly complete.
**Phase 1** — Web console CRUD + API routes + auth integration + sync engine.
**Phase 1.5** — Product Intake Pipeline (intake batches, AI matching, review UX). ✅ Built.
**Phase 2** — Inventory, loyalty, catalogue, logistics.
**Phase 3** — Staff ops, supervisor, warehouse, AI assistant.

## Working with Specs

Before working on any module, always read:
1. `specs/shared/architecture.md` — stack, boundaries, sync model
2. `specs/shared/data-model.md` — full Supabase schema
3. The relevant `specs/modules/XX-module-name.md`

For UI work, also read:
- `specs/ui/design-system.md` — colors, typography, spacing tokens
- `posterita-prototype/src/App.jsx` — visual reference (1,242 lines)
- `.claude/skills/posterita-ui/SKILL.md` — design system quick reference
