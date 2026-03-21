# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one backend, one Supabase database.

## Repository Map

| Directory | What it is |
|-----------|-----------|
| `pos-android/` | Production Android POS app (Kotlin, Gradle, Hilt, Room) — offline-first |
| `pos-android/server-side/posterita-cloud/web/` | **Production web console** (Next.js on Vercel) — admin CRUD |
| `pos-android/server-side/posterita-cloud/` | Vercel serverless API routes (sync, AI import, Blink payments) |
| `pos-android/server-side/supabase/` | Supabase migrations and config |
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
- **Auth:** Supabase Auth (web console), JWT tokens (Android)
- **Media:** Cloudinary | **WhatsApp:** Meta Cloud API | **Payments:** Blink SDK

## API Endpoints

- **Production:** `https://posterita-cloud.vercel.app/api/` — sync, data, AI import, Blink
- **Web Console:** `https://web.posterita.com` (alias for posterita-cloud.vercel.app)
- **Legacy (DO NOT USE):** `https://my.posterita.com/posteritabo`
- **Loyalty (legacy):** `https://loyalty.posterita.com/api/` — being migrated

## Deployment

- **Vercel project:** `posterita-cloud` (team: `tamakgroup`)
- **Deploy command:** `cd pos-android/server-side/posterita-cloud/web && npx vercel --prod --yes`
- **IMPORTANT:** Always deploy to the `posterita-cloud` project, NOT `web`. If `.vercel/project.json` points to the wrong project, re-link: `npx vercel link --project posterita-cloud --yes`
- **Domains:** `posterita-cloud.vercel.app` and `web.posterita.com`
- All API routes use `force-dynamic` or lazy-init Supabase clients — never create `createClient()` at module scope

## Key Architectural Rules

1. **Android never talks to Supabase directly** — all data flows through the API
2. **Web console reads Supabase directly** (via Supabase client) — mutations go through API routes
3. **One store per user per day** — JWT carries store_id claim
4. **Inventory count is scan-only** — no manual data entry
5. **Offline-first** — every store-floor operation works without connectivity
6. **Capability-driven UI** — role-based, not hardcoded screen lists
7. **Every mutation produces an audit event**
8. **Three-layer feature rule** — see Feature Development Workflow below
9. **No CRUD scaffolds** — see UI Pattern Rules below
10. **All errors go through AppErrorLogger** — see Error Logging below

## Feature Development Workflow

**CRITICAL: When implementing any feature, it must be built across all three layers:**

### Layer 1: Database (Supabase)
- Define the table/schema in `pos-android/server-side/supabase/`
- Add migrations
- This is the source of truth

### Layer 2: Backend API (Vercel serverless)
- Add API routes in `pos-android/server-side/posterita-cloud/web/src/app/api/`
- CRUD endpoints that Android and Web Console both call
- Validation, business logic, audit logging

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
| **POS checkout flow** | ✅ Native | ❌ | ✅ Sync orders |
| **View/edit products** | WebView (`/products`) | ✅ Native | ✅ CRUD |
| **View/edit stores** | WebView (`/stores`) | ✅ Native | ✅ CRUD |
| **View/edit terminals** | WebView (`/terminals`) | ✅ Native | ✅ CRUD |
| **View/edit users** | WebView (`/users`) | ✅ Native | ✅ CRUD |
| **View/edit categories** | WebView (`/categories`) | ✅ Native | ✅ CRUD |
| **View/edit taxes** | WebView (`/settings`) | ✅ Native | ✅ CRUD |
| **Manage brands** | ✅ Native (owner only) | ✅ Native | ✅ CRUD |
| **Product intake** | WebView embed | ✅ Native | ✅ AI extraction + matching |
| **View orders** | ✅ Native | ✅ Native | ✅ Query |
| **Till management** | ✅ Native | ✅ View only | ✅ Sync |
| **Printer config** | ✅ Native (local) | ❌ | ❌ |
| **Barcode scanning** | ✅ Native | ❌ | ❌ |
| **Reports/analytics** | WebView (`/reports`) | ✅ Native | ✅ Query |
| **Error logs** | ✅ Auto-synced | ✅ Native (`/errors`) | ✅ Sync |

### WebView Integration Pattern

**The web console is the primary CRUD interface. Android embeds it via `WebConsoleActivity`.**

- All Settings items (Stores, Terminals, Products, Categories, Users, Taxes) open web console pages in a WebView
- `WebConsoleActivity` takes `EXTRA_PATH` (e.g., `/products`) and `EXTRA_TITLE`
- Sidebar is hidden via CSS injection — Android provides its own navigation
- Auth via OTT (One-Time Token): Android fetches token from `/api/auth/ott`, appends `?ott=xxx` to URL
- After editing in web console, Android syncs to get updated data (CloudSyncWorker)
- **Only printers are local** — configured on-device, no web console involvement
- **Brands are native** because they control account switching (local concern)

## Web Console Routes

Real web app at `pos-android/server-side/posterita-cloud/web/`:

### Context Selection (before dashboard)
| Route | Page | Status |
|-------|------|--------|
| `/platform` | Owner's brand list → pick brand | ✅ |
| `/platform/[brand]/stores` | Stores in brand → pick store | ❌ Needs building |
| `/platform/[brand]/[store]/terminals` | Terminals in store → pick terminal | ❌ Needs building |

Login flow: **Owner → Brand → Store → Terminal → Dashboard** (context set for session).

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
| `/intake` | Intake dashboard — batch list, pending review counts | ❌ Needs building |
| `/intake/new` | Start new intake — pick source, upload/enter input | ❌ Needs building |
| `/intake/[batchId]` | Review batch — item-by-item approval with AI matching | ❌ Needs building |

### Data Management (scoped to selected brand)
| Route | Page | Status |
|-------|------|--------|
| `/products` | Products (CRUD, status tabs: Live / Pending Review / Drafts) | ✅ |
| `/categories` | Categories | ✅ |
| `/stores` | Stores | ✅ |
| `/terminals` | Terminals | ✅ |
| `/users` | Users | ✅ |
| `/settings` | Settings/Taxes | ✅ |
| `/ai-import` | AI product import (will migrate to intake pipeline) | ✅ |
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
4. **Biometric** — optional shortcut for PIN (fingerprint/face)
5. **Role-based** — cashier can't void/refund without supervisor PIN
6. **Audit log** — every action tracked with user + timestamp

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
- **Database:** `error_logs` Supabase table with RLS (migration `00013_error_logs.sql`)
- **Crash handler:** `AppErrorLogger.installCrashHandler()` in `PosteritaApp.onCreate()`

## Android Navigation Architecture

- **Home screen:** Hub with bottom nav (Home | POS | Orders | More)
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
- **Android app:** same hierarchy, but terminal is auto-selected (device is enrolled to a terminal).

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
All tender types are reconciled, not just cash. Cashiers sometimes record wrong payment type (e.g. ring up "card" when customer paid cash).

**Step 1: Count cash** (same denomination counter as open till)
**Step 2: Enter card batch total** (manual entry from card machine's batch report; auto-fill if integrated later)
**Step 3: Enter Blink total** (manual entry for now; auto-fill if integrated later)

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

- Per-type breakdown is **informational**
- **Total discrepancy is the headline number** — that's what the cashier is accountable for
- Optional note field for explaining discrepancy
- Terminal record updated with closing float for next session

### UX Rules for Till Screens
- **No progressive disclosure** for the denomination counter — one scrollable screen
- **Stepper input** (`-` `[n]` `+`) per denomination, not a numpad — most counts are under 20
- **No reconfirmation** — the digital count is the record, no counting twice
- Denominations ordered **largest to smallest**, grouped Notes / Coins

## Brand Colors

- Primary: `#1976D2` | Light: `#DCEBFF` | Dark: `#0D5DB3`
- Success: `#2E7D32` | Error: `#E53935` | Warning: `#F57F17`
- Purple: `#5E35B1` | Background: `#F5F2EA` | Paper: `#FFFFFF`
- Ink: `#141414` | Muted: `#6C6F76` | Line: `#E6E2DA`

## Product Intake Pipeline

Products enter the system from many sources but NEVER go straight to the POS. Every product passes through a staging area where the owner reviews, enhances, and approves before it becomes sellable.

### The Problem

A retailer gets product data from everywhere — supplier catalogues, websites, purchase orders, invoices, AI discovery. Each source has different data quality: a catalogue PDF might have names and prices but no images; an invoice has cost prices but no selling prices; a website scrape has images but approximate prices. Without a funnel, products land directly in the POS with missing data, wrong prices, or duplicate entries.

### Core Concept: Intake Batch → Intake Items → Products

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTAKE SOURCES                               │
│                                                                     │
│  Website    Catalogue   Purchase    Invoice   AI                    │
│  Scrape     PDF/CSV     Order                 Search                │
└──────┬──────────┬──────────────┬─────────────┬────────────┬─────────┘
       │          │              │             │            │
       ▼          ▼              ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INTAKE BATCH                                  │
│  Groups all items from one import action                           │
│  Tracks: source, source_ref, status, who created it, when          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INTAKE ITEMS                                  │
│  Raw extracted data — one row per candidate product                │
│                                                                     │
│  AI MATCHING ENGINE:                                                │
│  • Each item is matched against the existing product catalog       │
│  • match_type: exact (barcode hit) | fuzzy (name similarity) |    │
│                 new (no match found) | manual (owner linked it)    │
│  • match_confidence: 0.00–1.00                                     │
│  • match_product_id: FK to existing product if matched             │
│                                                                     │
│  OWNER REVIEW:                                                      │
│  • Side-by-side: extracted data vs existing product (if matched)   │
│  • Fix names, adjust prices, assign categories, pick images        │
│  • Approve / reject / merge with existing product                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌────────┐ ┌──────────┐
              │ NEW      │ │ UPDATE │ │ REJECTED │
              │ PRODUCT  │ │ EXIST. │ │ (skip)   │
              │ created  │ │ PRODUCT│ │          │
              │ as live  │ │ price/ │ │          │
              │          │ │ image  │ │          │
              └──────────┘ └────────┘ └──────────┘
                    │          │
                    ▼          ▼
              ┌──────────────────────┐
              │   PRODUCT TABLE      │
              │   status = live      │
              │   source = (origin)  │
              │   → syncs to POS     │
              └──────────────────────┘
```

### Database Schema

#### `intake_batch` — one import action

| Column | Type | Purpose |
|--------|------|---------|
| `batch_id` | SERIAL PK | |
| `account_id` | UUID FK | Scoped to brand |
| `source` | TEXT | `website`, `catalogue`, `purchase_order`, `invoice`, `ai_search`, `supplier_feed` |
| `source_ref` | TEXT | URL, filename, PO number, invoice number |
| `source_file_url` | TEXT | Cloudinary URL of uploaded document (PDF, CSV, image) |
| `status` | TEXT | `processing` → `ready` → `in_review` → `committed` / `failed` |
| `item_count` | INT | Total items extracted |
| `approved_count` | INT | Items approved (created or merged) |
| `rejected_count` | INT | Items skipped |
| `supplier_name` | TEXT | Extracted or entered supplier name |
| `created_by` | INT | User who initiated |
| `created_at` | TIMESTAMPTZ | |
| `reviewed_by` | INT | User who completed review |
| `reviewed_at` | TIMESTAMPTZ | |
| `notes` | TEXT | Owner notes |

#### `intake_item` — one candidate product within a batch

| Column | Type | Purpose |
|--------|------|---------|
| `item_id` | SERIAL PK | |
| `batch_id` | INT FK | Parent batch |
| `account_id` | UUID FK | |
| **Extracted data** | | |
| `name` | TEXT | Product name as extracted |
| `description` | TEXT | |
| `selling_price` | NUMERIC(12,2) | Selling price if available |
| `cost_price` | NUMERIC(12,2) | Cost/wholesale price if available |
| `image_url` | TEXT | Original source URL |
| `image_cdn_url` | TEXT | After Cloudinary upload |
| `barcode` | TEXT | UPC/EAN if found |
| `category_name` | TEXT | Raw category text (not FK yet) |
| `unit` | TEXT | "kg", "piece", "bottle", "pack" |
| `supplier_sku` | TEXT | Supplier's own product code |
| `quantity` | NUMERIC(12,2) | Quantity (for POs/invoices) |
| **AI matching** | | |
| `match_product_id` | INT FK nullable | Matched existing product |
| `match_confidence` | NUMERIC(3,2) | 0.00–1.00 |
| `match_type` | TEXT | `exact`, `fuzzy`, `new`, `manual` |
| **Review** | | |
| `status` | TEXT | `pending`, `approved`, `rejected`, `merged` |
| `override_name` | TEXT | Owner's corrected name |
| `override_price` | NUMERIC(12,2) | Owner's corrected price |
| `override_category_id` | INT FK nullable | Owner-assigned category |
| `committed_product_id` | INT FK nullable | Product created/updated on commit |
| `created_at` | TIMESTAMPTZ | |
| `reviewed_at` | TIMESTAMPTZ | |

### Source Types & What Each Extracts

| Source | Input | Extracts | Typical data quality |
|--------|-------|----------|---------------------|
| **Website scrape** | URL(s) | Names, prices, images, descriptions, categories | Good names + images, prices may be tax-ambiguous |
| **Catalogue PDF** | Uploaded PDF | Names, SKUs, prices, descriptions, images | Good structure, may lack images |
| **Catalogue CSV** | Uploaded spreadsheet | All columns as-is | High quality if supplier format is known |
| **Purchase order** | Uploaded PO document | Items, quantities, cost prices, supplier SKUs | Cost prices (not selling), quantities for inventory |
| **Invoice** | Uploaded invoice image/PDF | Items, quantities, unit costs, totals, supplier info | Definitive cost prices, may reference existing products |
| **AI search** | Business name + location | Names, prices, images, categories, store info | Variable — AI's best guess from web search |
| **Supplier feed** | API/URL (future) | Full catalog with updates | High quality, automated |

### AI Matching Engine

When intake items are extracted, each is matched against the existing product catalog:

1. **Exact match** (confidence 1.0) — barcode/UPC matches an existing product
2. **Fuzzy match** (confidence 0.6–0.9) — name similarity above threshold, same category
3. **New** (confidence 0.0) — no plausible match found
4. **Manual** — owner explicitly links the item to an existing product during review

Matching is done by Claude AI with the existing catalog as context. The AI sees:
- All existing product names, barcodes, categories, and prices
- The intake item's extracted data
- Returns: `match_product_id`, `match_confidence`, `match_type`, reasoning

### Review UX (Web Console)

#### Batch list (`/intake`)
- Table of batches: source icon, source_ref, item count, status badge, date
- Status badges: `Processing` (spinner), `Ready for Review` (orange), `Committed` (green), `Failed` (red)
- Click → opens batch review

#### Batch review (`/intake/[batchId]`)
Three-column layout per item:

| Extracted (left) | Match (center) | Action (right) |
|-------------------|----------------|----------------|
| Name, price, image from source | Existing product if matched (with confidence %) | Approve / Reject / Edit |

**For matched items (update existing product):**
- Show diff: "Cost price: Rs 50 → Rs 45" (from invoice)
- Owner can accept update, reject, or override values

**For new items (create product):**
- Show extracted data with editable fields
- Owner fills in: selling price (if only cost known), category, tax rule
- Image preview with option to crop/replace

**Bulk actions:**
- "Approve All New" — creates all unmatched items as products
- "Approve All Matches" — updates all matched products
- "Reject Remaining" — skips everything not yet reviewed

### Commit Logic

When the owner approves an item:

**If `match_type = 'new'` (or manual override to "create new"):**
1. Create a new `product` row
2. `product_status = 'live'`, `source = <batch.source>`
3. Upload image to Cloudinary if not already done
4. Set `committed_product_id` on the intake_item

**If `match_type = 'exact' | 'fuzzy' | 'manual'` (merge with existing):**
1. Update the matched product's fields (only the fields the owner approved)
2. Common updates: cost_price (from PO/invoice), image (from catalogue), description
3. Set `committed_product_id` on the intake_item
4. If selling_price changed → `needs_price_review = null` (owner just approved it)

**If status = 'rejected':**
1. Skip — no product created or updated
2. Item stays in `intake_item` for audit trail

When all items in a batch are reviewed → batch.status = `committed`.

### How This Replaces the Current AI Import

The existing AI import (`/ai-import`, `/api/ai-import`) currently creates products directly in the `product` table with `product_status = 'review'`. With the intake pipeline:

1. **AI import becomes one source type** — `ai_search` or `website` source in the intake pipeline
2. **Same AI extraction** — Claude still does the heavy lifting (web search, scraping, image analysis)
3. **But products land in `intake_item`** — not directly in the product table
4. **Review happens in `/intake/[batchId]`** — not in the products page status tabs
5. **The existing `/ai-import` UI becomes a "start intake" flow** — pick source type, provide input, kick off processing

### Relationship to `product_status` and `needs_price_review`

| Concept | Where | Purpose |
|---------|-------|---------|
| **Intake review** | `intake_item.status` | "Should this external data become a product at all?" |
| **Product status** | `product.product_status` | `live` = sellable, `draft` = owner WIP (manual creation in progress) |
| **Price review** | `product.needs_price_review` | "A cashier changed the price — is the new price OK?" |

These are three different review queues:
- Intake review: **before** a product exists (external data → product)
- Product draft: **during** manual creation (owner hasn't finished filling in fields)
- Price review: **after** a product is live (staff changed something)

### API Routes for Intake

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/intake` | POST | Create batch, start AI processing (returns batch_id) |
| `/api/intake` | GET | List batches for account |
| `/api/intake/[batchId]` | GET | Get batch + items |
| `/api/intake/[batchId]/process` | POST | Trigger AI extraction + matching (async, SSE for progress) |
| `/api/intake/[batchId]/review` | POST | Approve/reject items, commit to product table |
| `/api/intake/[batchId]/match` | POST | Re-run AI matching on specific items |

### Android Integration

Android does NOT interact with the intake pipeline directly. The flow is:
1. Owner uses web console (or WebView on Android) to run intake
2. Approved products land in `product` table as `live`
3. Next sync cycle delivers them to Android POS
4. Business as usual

**Exception:** The existing Android `AiImportService` (first-launch setup) currently writes products directly to Room. This stays as-is for the onboarding experience — it creates products locally with `product_status = 'review'` and `source = 'ai_import'`. These sync up to Supabase on first cloud sync, and the owner can review them in the web console.

### Source-Specific Parsers

Each source type has its own extraction strategy:

**Website (`website`):**
- Fetch HTML → Claude extracts product data from page structure
- Follow pagination/category links if detected
- Download and re-host images on Cloudinary

**Catalogue PDF (`catalogue`):**
- Upload to Cloudinary for storage
- Claude Vision analyzes each page for tabular product data
- Extracts: name, SKU, price, description, image regions

**Catalogue CSV/Excel (`catalogue`):**
- Parse columns with header detection
- AI maps arbitrary column names to standard fields
- "Item Description" → name, "RRP" → selling_price, "Trade Price" → cost_price

**Purchase Order (`purchase_order`):**
- Upload document (PDF/image)
- Claude Vision extracts line items: product name, quantity, unit cost
- Matched products get cost_price updated
- Unmatched items flagged as potential new products (need selling price from owner)

**Invoice (`invoice`):**
- Upload invoice image/PDF
- Claude Vision extracts: supplier, items, quantities, unit prices, totals, tax
- Cross-reference with PO if PO number present
- Update cost prices on matched products
- Extract supplier info for future reference

**AI Search (`ai_search`):**
- Business name + location → Claude web search
- Finds menus, product pages, social media posts
- Extracts whatever product data is available
- Lower confidence — more review needed

### Supplier Management (Future)

Intake batches track `supplier_name`. Over time this builds a supplier directory:
- Which suppliers provide which products
- Cost price history per supplier per product
- Preferred supplier per product
- Reorder points and lead times

This is the foundation for the Phase 2 procurement module.

## Current Phase

**Phase 0** — Android app cleanup, UI consistency, offline POS solid. ✅ Nearly complete.
**Phase 1** — Web console CRUD + API routes + auth integration + sync engine.
**Phase 1.5** — Product Intake Pipeline (intake batches, AI matching, review UX).
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
