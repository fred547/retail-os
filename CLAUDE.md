# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one backend, one Supabase database.

## Quick Reference

```bash
# Web typecheck (run after EVERY edit)
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit

# Web build + deploy
cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes --archive=tgz

# Android compile (run after EVERY edit)
cd pos-android && ./gradlew compileDebugKotlin

# Android build + install
cd pos-android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Rules

These are non-negotiable architectural constraints. Violating any of these causes production bugs.

1. **Android never talks to Supabase directly** — all data through `/api/sync`
2. **Server is source of truth for master data** — products, categories, taxes, stores, terminals, users flow one way: server → device (pull only). Android only pushes transactional data: orders, tills, customers, error logs, inventory entries.
3. **Web console reads Supabase directly** — mutations through API routes
4. **Context = account_id + store_id + terminal_id** — every query scoped
5. **Offline-first** — every POS operation works without connectivity
6. **Three-layer rule** — every feature needs: migration + API route + UI (web or Android)
7. **No CRUD scaffolds** — every screen must feel designed (see UI Rules)
8. **All errors logged to `error_logs` table** — Android via AppErrorLogger, web via `error-logger.ts` + `/api/errors/log`, server components via `error.tsx` boundaries. Never `Log.e()`, silent `catch`, or `console.error` without also logging to DB.
9. **Legacy workers disabled** — only `CloudSyncWorker` handles sync
10. **Capability-driven UI** — role-based visibility, not hardcoded screen lists
11. **Cloud-authoritative IDs** — server assigns all PKs. Android uses server-assigned IDs, never hardcodes 1.
12. **Soft delete** — key tables use `is_deleted` + `deleted_at` instead of hard DELETE. Queries filter `is_deleted = false`.
13. **No standalone accounts** — all accounts created via `/api/auth/signup` or `/api/account/create-demo`.
14. **Demo brands are server-first** — create on Supabase via API, Android creates only an account shell in Room, then pulls via CloudSync. **Never create demo products locally.**
15. **Passwords never stored locally** — only Supabase Auth holds passwords. Local Room DB stores PINs only.
16. **No PostgREST FK joins** — cross-tenant FKs have been dropped. Never use `.select("*, table(column)")`. Use separate queries and map manually.
17. **Validate column names against actual DB schema** — see DB Column Gotchas below.

## Build & Verification

After every file edit, run `tsc --noEmit` (web) or gradle compile (Android) to catch type errors immediately — do NOT batch all changes and test at the end. Fix errors before moving to the next file.

- **Web/TypeScript:** `cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit`. Run `npm run build` before deploying. Watch for type mismatches, missing fields, and lock file issues.
- **Android/Kotlin:** `cd pos-android && ./gradlew compileDebugKotlin`. Watch for Room schema mismatches and missing imports.

## Project Overview

Multi-platform project: TypeScript/Next.js web app deployed to Vercel, and an Android (Kotlin) app. When refactoring shared logic or sync code, check BOTH platforms for consistency. Always check the actual database schema before writing queries — never assume column types or names.

## DB Column Gotchas

These are the column names that get confused most often. **Always verify against actual schema before writing queries.**

| Table | Has | Does NOT have |
|-------|-----|---------------|
| `store` | name, address, city, state, zip, country, currency, isactive | ~~phone, email, tax_number~~ |
| `productcategory` | name, position, isactive, display | ~~description~~ |
| `pos_user` | user_id, username, firstname, pin, role, email | ~~store_id~~ |
| `owner` | **id**, auth_uid, email, phone, name | ~~owner_id~~ (PK is `id`) |
| `orders` | order_id, **document_no**, grand_total, uuid, **till_uuid** | ~~ordernumber, documentno~~ |
| `orderline` | orderline_id, order_id, **qtyentered**, **priceentered**, lineamt, **linenetamt** | ~~qty, priceactual, tax_amount, discount~~ |
| `error_logs` | message, **stack_trace**, **device_info**, **created_at**, status | ~~stacktrace, device_id, timestamp, screen~~ |
| `terminal` | terminal_id, store_id, account_id, name, **terminal_type** | ~~type~~ |
| `v_price_review` | product_id, product_name, sellingprice, **price_set_at** | ~~updated_at~~ |
| `till` | till_id, uuid, documentno, **status** (open/closed — Supabase only, not in Room) | |

**Additional schema notes:**
- `account_id` is TEXT everywhere
- `serial_item.warranty_expiry` is auto-computed (`delivered_date + warranty_months`)
- `till.status` exists only in Supabase — Android derives open/closed from `dateClosed`
- Full column listings for all 30+ tables: check migration files in `supabase/migrations/`

## Repository Map

| Directory | Purpose |
|-----------|---------|
| `pos-android/` | Android POS app (Kotlin, Gradle, Hilt, Room) — offline-first |
| `pos-android/core/database/` | **`:core:database`** — Room DB: 37 entities, 37 DAOs, AppDatabase, converters, 27 migrations |
| `pos-android/core/common/` | **`:core:common`** — SharedPreferencesManager, LocalAccountRegistry, DateUtils, NumberUtils, Constants |
| `pos-android/core/network/` | **`:core:network`** — Retrofit APIs, request/response models, NetworkInterceptor |
| `pos-android/core/sync/` | **`:core:sync`** — CloudSyncService, CloudSyncWorker, SyncStatusManager |
| `pos-android/server-side/posterita-cloud/web/` | **Web console** (Next.js on Vercel) — admin CRUD |
| `pos-android/server-side/posterita-cloud/web/src/app/api/` | API routes (30 domains — see filesystem for full list) |
| `pos-android/server-side/posterita-cloud/backend/` | **Render backend** (Express/Node.js) — webhooks, workers, cron |
| `pos-android/server-side/posterita-cloud/supabase/migrations/` | Supabase migrations (00001–00039) |
| `posterita-prototype/` | UI prototype (React JSX) — design reference |
| `specs/` | Specification files (19-kitchen, 20-terminal-types, 22-whatsapp-support) |

## Stack & URLs

- **Android:** Kotlin, Room (v30, multi-module), Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink
- **Web:** Next.js 16 (App Router) on Vercel — responsive design, `prefetch={true}` on sidebar links
- **DB:** Supabase Postgres — `account_id` is TEXT. **RLS enabled on all tables.** API routes use service role key (bypasses RLS). Web console reads use `createServerSupabaseAdmin()` (service role). Never use anon key for writes.
- **Auth:** Supabase Auth (web + Android login), OTT tokens (Android WebView), PIN (device unlock). `SITE_URL` = `https://web.posterita.com`.
- **AI:** Claude Haiku 4.5 + Sonnet 4.6 via Anthropic API — Haiku for AI import/discovery, Sonnet for intake processing
- **Production Web:** `https://web.posterita.com` (Vercel)
- **Production Backend:** `https://posterita-backend.onrender.com` (Render)
- **Monitor:** `https://web.posterita.com/api/monitor` — checks all services
- **Firebase:** Test Lab for Android UI tests. Project: `posterita-retail-os`
- **Legacy (DO NOT USE):** `my.posterita.com/posteritabo` — all `app/*` endpoints are dead

## Android Module Architecture

Multi-module Gradle monolith — single APK, modular codebase. No feature module depends on another feature module.

```
:app                → Application shell, UI, Activities, Hilt DI, remaining services
:core:database      → Room DB: 37 entities, 37 DAOs, AppDatabase, converters, schema v31 (27 migrations)
:core:common        → SharedPreferencesManager, LocalAccountRegistry, DateUtils, NumberUtils, Constants, OrderDetails
:core:network       → Retrofit APIs (CloudSyncApi, ApiService, BlinkApiService, LoyaltyApiService), request/response models, NetworkInterceptor
:core:sync          → CloudSyncService, CloudSyncWorker, SyncStatusManager
```

**Dependency graph:** `:app → :core:sync → :core:network, :core:database, :core:common` (all core modules are leaves except `:core:sync`).

**Key rules:**
- `DATABASE_NAME` lives in `AppDatabase.companion` (not Constants.kt)
- `DatabaseModule` (Hilt DI for DAOs) stays in `:app` (depends on `SharedPreferencesManager`)
- Package names unchanged from monolith — all existing imports resolve without modification
- Cross-module smart casts require local val (e.g., `val dateHold = holdOrder.dateHold`)

## Deployment

**Web console (Vercel):**
```bash
cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes --archive=tgz
```
- Vercel project: `posterita-cloud` (team: `tamakgroup`). If wrong, re-link: `npx vercel link --project posterita-cloud --yes`
- **Always `rm -rf .next` before build** — stale cache causes phantom TypeScript errors from deleted code

**Backend (Render):** Auto-deploys on push to `main` (repo must be public for Render to fetch — make public, deploy, make private).
- Service ID: `srv-d70mlka4d50c73f1d2t0`
- Plan: Starter ($19/mo) — always-on, no sleep
- Root dir: `pos-android/server-side/posterita-cloud/backend`
- Runtime: Node.js, build: `npm install && npx tsc || true`, start: `node dist/index.js`
- Cron: hourly FATAL error check, 6hr stale error cleanup (>30d), daily sync log purge (>90d)

**Supabase migrations:** Run via Management API (see `reference_supabase.md`). Reload cache: `NOTIFY pgrst, 'reload schema'`

**Never** `createClient()` at module scope — use `function getDb() { return createClient(...) }` or `force-dynamic`

## Testing

- After generating or modifying tests, run the full test suite immediately and fix failures before moving on.
- Use unique generated IDs (e.g., UUIDs with test prefixes) — never hardcode IDs (causes parallel test collisions).
- Verify field names and enum cases match the actual schema/API response BEFORE writing test assertions.
- After any fix, keep running and fixing until ALL tests pass with zero failures. Do not stop at partial success.

**Android instrumented tests MUST run on Firebase Test Lab** — never locally. Use `gcloud firebase test android run` with project `posterita-retail-os`. Unit tests (`testDebugUnitTest`) can still run locally.

```bash
# Build APKs
cd pos-android && ./gradlew assembleDebug assembleDebugAndroidTest

# Run on Firebase Test Lab
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=MediumPhone.arm,version=34,locale=en,orientation=portrait \
  --timeout 10m
```

**Playwright E2E (Web Console):**
```bash
cd pos-android/server-side/posterita-cloud/web && npm run test:e2e
```
- Runs against production (`web.posterita.com`) by default, or set `PLAYWRIGHT_BASE_URL` for local
- Set `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` for authenticated tests
- Commands: `npm run test:e2e` (headless), `npm run test:e2e:ui` (interactive)

## Code Changes

When refactoring or rewriting a file, diff against the original to ensure no existing function calls or service registrations are accidentally dropped. Verify that all existing service calls and integrations are preserved. Avoid excessive changes — keep modifications scoped to what was requested. Do not batch 10+ file changes without verifying each one compiles.

## Where to Build

| Task | Android | Web Console | API |
|------|---------|-------------|-----|
| POS/cart/payments/receipts | Native | — | Sync |
| Products/stores/terminals/users/categories/taxes | WebView | Native | CRUD |
| Brands | Native | Native | CRUD |
| Product intake | WebView (`/intake`) | Native | AI + matching |
| Orders / Till management | Native | Native (view) | Query/Sync |
| Printers/barcode scanning | Native | — | — |
| Reports/errors | WebView | Native | Query |
| Inventory count | Native | Native | CRUD + Sync |
| Kitchen/restaurant (KDS, stations, sections) | Native | Native (`/stations`) | Sync |
| Loyalty / promotions / menus | POS integration | Native | CRUD + Sync |
| Shifts (clock in/out) | Settings card | Native | CRUD + Sync |
| Suppliers / POs / deliveries | — | Native | CRUD + Sync |
| Account management | — | Native (`/platform`) | CRUD |

## API Routes (by domain)

Routes live in `pos-android/server-side/posterita-cloud/web/src/app/api/`. Check filesystem for exact paths.

| Domain | Key Routes | Notes |
|--------|-----------|-------|
| **auth** | signup, login, check, reset, reset-password, ott, ott/validate, lookup | OTT for Android WebView |
| **sync** | POST (push+pull), GET (health), register, replay | Core Android sync |
| **data** | POST (read proxy), insert, update, delete | Web console CRUD proxy — auto-injects account_id + soft-delete filter |
| **account** | [accountId] (PATCH/DELETE), create-demo, lifecycle | Brand management |
| **owner** | [ownerId] (GET/PATCH), accounts, accounts/[accountId] | Owner CRUD |
| **products** | ai-import, ai-import/save, intake/*, serial-items/*, stock, stock/journal | Product lifecycle |
| **loyalty** | earn/redeem/adjust, config, wallets, transactions | Points system |
| **suppliers** | CRUD, purchase-orders/*, purchase-orders/[id]/receive (GRN) | Supply chain |
| **operations** | promotions/*, deliveries/*, shifts, menu-schedules/*, reports/z-report | Daily ops |
| **platform** | create-account, delete-test-brands, super-admin/*, account-manager/* | Admin portal |
| **other** | enroll, context, catalogue, monitor, changelog, infrastructure, errors/log, blink/*, debug/session | Misc |

**Render Backend** (`posterita-backend.onrender.com`): `/health`, `/webhook/whatsapp`, `/monitor/errors`, `/monitor/sync`, `/monitor/accounts`

## Auth Flow

### Android First Launch
SetupWizard: Welcome → Email+Password+Phone → Name → Brand → Country → Category → Set PIN → `POST /api/auth/signup` (creates live + demo brands) → Resets sync timestamps → CloudSync pulls demo products → Review → Home. Pre-populates email from Google account, country from SIM/locale.

### Android Login (Returning User)
**Local user with PIN:** Welcome → **LockScreen** (PIN only). Uses dedicated `Room.databaseBuilder` per brand for reliable PIN detection.

**New device:** Welcome → **LoginActivity** (email+password) → `POST /api/auth/login` → Supabase Auth → returns all brands + pos_user → CloudSync → Home. **Offline:** scans local Room DBs for matching email, requires prior PIN.

### Session Recovery (Cold Start)
SplashActivity priority: (1) Active account with PIN → LockScreen. (2) Registry brands with PIN → restore first. (3) Demo account → Home. (4) Nothing → SetupWizard.

### Account Resolution (`getSessionAccountId`)
Priority: (1) Cached account_id cookie. (2) Super admin impersonation. (3) Owner → `owner_account_session`. (4) `pos_user.account_id`. (5) Owner fallback by email → first account. (6) OTT cookie (last resort).

### Password vs PIN
**Password:** Supabase Auth credential (web login, reset). Never stored locally. **PIN:** 4-digit device unlock. Mandatory. Synced via `pos_user.pin`. 30-min idle → lock.

## Sync Protocol

**Version:** `SYNC_API_VERSION = 2`, `MIN_CLIENT_VERSION = 1`

**Multi-brand sync:** CloudSyncWorker syncs ALL registered brands each cycle — active brand first, then others. Each brand has its own Room database. Worker saves/restores store/terminal context in prefs to prevent corruption.

**Per-account sync timestamps:** Each brand has its own `cloud_last_sync_at_<accountId>` key. Signup and demo creation reset timestamps to epoch before first sync.

**Store/terminal context resolution:** CloudSyncService validates store/terminal from Room DB. Priority: prefs ID → DB lookup → first active store → first terminal for store.

**Sibling brand discovery:** Sync response includes `sibling_brands`. CloudSyncWorker registers new brands in `LocalAccountRegistry` automatically.

**Till sync (push-only, two-pass):** Tills sync exactly **twice**: once at **open** and once at **close**. Both passes mark `isSync=true`. Closing sets `isSync=false` (via `TillService.closeTill()`), triggering second pass. `till.status` (Supabase only) tracks `open`/`closed`. Orders carry `till_uuid`; server matches by UUID. If till hasn't synced yet, `till_uuid` preserved and `till_id` back-filled via `reconcile_till_orders()`.

**Sync integrity check:** If local product count is 0 but `last_sync_at` is not epoch, resets to epoch for full pull. Server allows `terminal_id=0` for initial pull.

**Sync hardening:**

| Feature | How |
|---------|-----|
| **Error surfacing** | Sync errors → `error_logs`, nav drawer shows pending + failure count |
| **Retry with backoff** | 5 retries, exponential (30s→240s). Failed items stay unsynced via `syncErrorMessage` |
| **Sync receipt** | Synchronizer screen: ↑SENT / ↓RECEIVED / ⏳PENDING / ✗ERRORS |
| **Context hardening** | Store/terminal resolved per-brand from Room DB, not shared prefs |
| **Conflict detection** | Server `insertOrUpdate()` checks `updated_at` — skips stale overwrites |
| **Payload checksum** | SHA-256 of order/till UUIDs+totals. **Warning-only** — Kotlin/JS float serialization differs |

**Android's sole sync responsibility:** build correct JSON, send it, confirm HTTP 200. All conflict resolution, FK validation, and data integrity logic is **server-side**.

**Connectivity indicator:** Green/red dot on every screen via `ConnectivityDotHelper.kt`. Uses `NET_CAPABILITY_INTERNET`. Do NOT use `NET_CAPABILITY_VALIDATED` — not set on all devices/emulators.

## Data Hierarchy

```
Owner → Brand (Account) → Store → Terminal (login context)
                        → Users (owner/admin/supervisor/cashier/staff)
```
Each brand has: currency, stores, terminals, users. Demo brand seeded with 15 products + images + 12 modifiers + 3 table sections + 10 tables **on the server**. One Room DB per brand. Brands tracked cross-DB via `LocalAccountRegistry`.

## Terminal Types

**The terminal determines the experience.** Each terminal has a `terminal_type` that controls UI, features, and startup behavior.

| Type | Purpose | Startup |
|------|---------|---------|
| `pos_retail` | Standard retail register (default) | PIN → Home → POS |
| `pos_restaurant` | Restaurant POS with tables/kitchen | PIN → Home → POS + order type dialog |
| `kds` | Kitchen Display System | PIN → KdsDisplayActivity (full-screen) |
| `mobile_staff` | Staff device (orders, inventory) | PIN → Home (limited) |
| `customer_display` | Customer-facing cart mirror (future) | Auto-start |
| `self_service` | Self-ordering kiosk (future) | Auto-start |

**Terminal type replaces global `businessType`** — `prefsManager.isRestaurant` checks both `terminalType` AND legacy `businessType` for backward compat. Use `prefsManager.isRestaurantTerminal` / `prefsManager.isKdsTerminal` instead of old `prefsManager.isRestaurant`.

## Kitchen & Restaurant

**Table sections:** `table_section` — zones/areas (Indoor, Patio, Bar, Takeaway). Tables have optional `section_id`. Takeaway sections auto-assign order numbers.

**Preparation stations:** `preparation_station` + `category_station_mapping`. Station types: kitchen/bar/dessert/custom. Each station links to a printer via `printer_id`.

**Station routing priority:** (1) `product.station_override_id` → (2) `category_station_mapping` → (3) default kitchen station. Resolved via `StationResolver.resolveForCart()`.

**KDS:** LAN-only, no internet. POS terminal runs embedded HTTP server (NanoHTTPD, port 8321) via `KdsServerService`. KDS tablets discover via mDNS (`_posterita-kds._tcp.`) or manual IP. REST endpoints: `/kds/orders`, `/kds/stream` (SSE), `/kds/bump`, `/kds/recall`, `/kds/stations`, `/kds/health`.

**Order operations:** Table transfer (long-press), order merge (long-press), delivery type (address/phone capture).

## Printer Types

Printers are **output-only devices**. KDS is NOT a printer (it's an interactive terminal type).

| Type | Hardware | Station-aware |
|------|----------|---------------|
| `receipt` | Thermal 80mm/58mm | No |
| `kitchen` | Thermal (wall-mounted) | Yes — prints items for assigned stations only |
| `label` | Zebra ZPL / Epson ESC/POS | No |
| `queue` | Thermal / ticket dispenser | No |

**Station routing:** Only applies to `kitchen`/`bar` role printers. No station assignment = prints ALL kitchen items. With station assignment = only prints items for those stations via `category_station_mapping`. Retail terminals ignore stations entirely.

## Unified Error Logging

All errors go to the **same `error_logs` table** in Supabase.

| Source | How |
|--------|-----|
| Android | `AppErrorLogger` → Room `error_log` → CloudSync → `error_logs` |
| Web client | `error-logger.ts` → `POST /api/errors/log` → `error_logs` |
| Web API | `/api/data` auto-logs failed queries |
| React crashes | `ErrorBoundary` → `POST /api/errors/log` |
| Server components | `error.tsx` boundaries → `POST /api/errors/log` |

**Server component error logging rule:** Every dashboard page needs either the global `(dashboard)/error.tsx` boundary or its own `error.tsx` with DB logging. Server component errors are NOT caught by `ErrorBoundary` (client-only). Always add try-catch around `getSessionAccountId()`.

## WebView (OTT Flow)

1. Android `POST /api/auth/ott` → 60-second token. Reads context from `SessionManager` or Room DB (not prefs).
2. Loads `https://web.posterita.com/products?ott=<token>`
3. Middleware validates OTT → sets httpOnly cookie `posterita_ott_session` → redirects
4. Customer layout checks cookie → skips Supabase Auth → hides sidebar
5. WebView blocks nav to `/login`, `/platform`, `/manager`
6. WebView layout: 40dp top bar (back + title + spinner + dot). CSS injection hides sidebar + breadcrumb.

## Data Consistency

- **Startup check:** SplashActivity verifies local DB has users for cached account_id. If inconsistent, clears prefs and forces re-setup.
- **Session recovery:** HomeActivity loads from Room DB if `sessionManager.user` is null.
- **Context bar:** Home dashboard reads from `sessionManager` (not prefs — prefs get contaminated by multi-brand sync).
- **Account lifecycle:** `draft → onboarding → active → suspended → archived` (+ `testing`, `failed`). CHECK constraint + audit log.

## UI Rules

- **View = Detail Brochure** — hero header + section cards + chips for booleans
- **Edit = Section-based bottom sheet** — collapsible section cards. Bottom sheet slides up on mobile, centered on desktop.
- **Create = Wizard** — chain section editors as steps. Progress dots, skip optional.
- **List = Styled Cards** — colored icon + title + subtitle + badge + chevron. No raw tables.
- **Web sidebar:** Brand › Store › Terminal context shown below header (stacked, not cropped).
- See `.claude/skills/posterita-ui/SKILL.md` for design tokens.

## Product Images

**Upload spec:** 800x800px square, JPEG or WebP, under 200KB. Cloudinary auto-transforms (`w_400,h_400,c_fill`).

**All image frames are square.** Non-square images are cropped to fill (`object-cover`), never stretched or letterboxed.

| Surface | Size | Notes |
|---------|------|-------|
| Android POS grid | 400x400 | Glide auto-resizes |
| Web console table | 40x40 | `object-cover`, rounded-lg |
| PDF catalogue (grid) | 120x120 | Centered, crops to fill |
| Thermal receipt | N/A | Not printed |

## Brand Management

- **Signup creates 2 brands on server:** live (empty) + demo (15 products with images, 4 categories, 2 taxes, 12 modifiers). Android pulls both via sync.
- **Create demo brand:** `POST /api/account/create-demo` → server creates full brand → Android creates Room DB shell → resets sync → CloudSync pulls.
- **AI Import (web-only):** `POST /api/ai-import` → `POST /api/ai-import/save` → sync pulls to Android. Never saves locally. Models: Haiku 4.5 for discovery, Sonnet 4.6 for intake.
- **Delete brand (Web):** account manager only. Live brands must be archived first.
- **Switch brand:** Resets session, switches Room DB, reloads HomeActivity.

## Android Navigation

- **Home dashboard:** greeting + `Brand › Store › Terminal ▾` context switcher + summary card + **4 app launchers** (POS, Warehouse, Admin, Synchronizer) + bottom nav
- **POS app:** TillActivity. Side drawer: Home, Orders, Customers, Till History, Cash Drawer, Terminal Info, Printers, Kitchen Orders
- **Warehouse app:** InventoryCountActivity
- **Admin app:** SettingsActivity. WebView links to web console + Sync + Printers + Brands (owner only)
- **Synchronizer:** DatabaseSynchonizerActivity
- **KDS:** KdsSetupActivity (mDNS discovery + manual IP) → KdsDisplayActivity (full-screen grid, landscape)

## Infrastructure & Costs

| Service | Plan | Cost/mo | Usage |
|---------|------|---------|-------|
| Vercel | Pro | $20 | Web console, serverless API |
| Render | Starter | $19 | Backend: webhooks, cron, monitoring |
| Supabase | Free | $0 | Postgres DB, Auth, Realtime |
| Anthropic | Pay-as-you-go | ~$5–25 | Claude Haiku for AI import |
| Firebase | Spark (free) | $0 | Test Lab |
| Cloudinary | Free | $0 | Product images |
| **Total** | | **~$44–64** | |

## Web Platform Portal (`/platform`)

Account manager / super admin view. 12 tabs: brands, owners, errors, sync, mra, tests, benchmark, changelog, roadmap, infra, legacy, claude.

Key tabs: **Brands** (owner-grouped list, CRUD, assignment), **Owners** (edit, password reset), **Errors** (filters, stack traces, status actions), **Sync Monitor** (`sync_request_log` dashboard), **MRA** (e-invoicing compliance), **Tests** (~1180+ tests across Android/web/scenario/E2E), **Infra** (live service status + DB row counts).

## Current Phase

| Phase | Status | Summary |
|-------|--------|---------|
| 0 | ✅ | Android cleanup, UI consistency, offline POS |
| 1 | ✅ | Web console CRUD + API + auth + sync + device enrollment (QR) |
| 1.5 | ✅ | Product Intake Pipeline + Product Lifecycle (draft/review/live) |
| 2 | ✅ | Inventory, loyalty, catalogue, logistics |
| 2.5 | ✅ | Kitchen & restaurant — table sections, prep stations, KDS, station routing |
| 2.6 | ✅ | Serialized inventory — VIN/IMEI tracking, serial items, warranty |
| 2.7 | ✅ | Multi-module architecture — :core:database, :core:common, :core:network, :core:sync |
| 2.8 | ✅ | Sync hardening — errors, retry, receipt, context, conflicts, checksum |
| 3 | ✅ | Compliance, loyalty, suppliers, promotions, delivery, shifts, analytics (10/12, 2 blocked) |
| 3.5 | ✅ | Android POS integration — loyalty, promotions, menus, shifts sync + UI |
| **4** | **CURRENT** | **Scale, integrations, advanced features** |

**Phase 3 completed:** MRA e-invoicing, stock deduction on sale, customer loyalty, Z-report, supplier & PO management (with GRN), promotions engine, catalogue PDF, menu scheduling, delivery tracking, shift clock in/out. **Blocked:** WhatsApp (needs phone + Meta verification), Peach Payments.

**Phase 4+ roadmap:** Shelf labels, self-checkout kiosks, franchise/multi-store analytics, segment extensions (pharmacy, salon, freelancers), Google Sign-In.

## Specs

Read before working: `specs/shared/architecture.md`, `specs/shared/data-model.md`, relevant `specs/modules/XX-*.md`. For UI: `.claude/skills/posterita-ui/SKILL.md`.
