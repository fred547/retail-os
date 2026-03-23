# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one backend, one Supabase database.

## Repository Map

| Directory | Purpose |
|-----------|---------|
| `pos-android/` | Android POS app (Kotlin, Gradle, Hilt, Room) — offline-first |
| `pos-android/server-side/posterita-cloud/web/` | **Web console** (Next.js on Vercel) — admin CRUD |
| `pos-android/server-side/posterita-cloud/web/src/app/api/` | API routes (sync, data, AI import, intake, auth, Blink) |
| `pos-android/server-side/posterita-cloud/supabase/migrations/` | Supabase migrations (00001–00024) |
| `posterita-prototype/` | UI prototype (React JSX) — design reference |
| `specs/` | Specification files |

## Stack & URLs

- **Android:** Kotlin, Room (v25), Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink
- **Web:** Next.js 14+ (App Router) on Vercel
- **DB:** Supabase Postgres — `account_id` is TEXT. **RLS is enabled on all tables.** API routes use service role key (bypasses RLS). Web console reads use `createServerSupabaseAdmin()` (service role). Never use anon key for writes.
- **Auth:** Supabase Auth (web + Android login), OTT tokens (Android WebView), PIN (device unlock). `SITE_URL` set to `https://web.posterita.com`.
- **AI:** Claude Haiku 4.5 via Anthropic API (`CLAUDE_API_KEY` on Vercel) — web search for product discovery
- **WhatsApp:** Meta Cloud API (direct, no BSP) — single Posterita number for B2C + B2B. AI-first, human escalation via SalesIQ/Slack.
- **Production:** `https://web.posterita.com` (alias for `posterita-cloud.vercel.app`)
- **Legacy (DO NOT USE):** `my.posterita.com/posteritabo` — all `app/*` endpoints are dead

## Deployment

```bash
cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes
```
- Vercel project: `posterita-cloud` (team: `tamakgroup`). If wrong, re-link: `npx vercel link --project posterita-cloud --yes`
- Supabase migrations: run via Management API (see `reference_supabase.md`). Reload cache: `NOTIFY pgrst, 'reload schema'`
- Android: `cd pos-android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`
- **Always `rm -rf .next` before build** — stale cache causes phantom TypeScript errors from deleted code
- **Never** `createClient()` at module scope — use `function getDb() { return createClient(...) }` or `force-dynamic`

## Rules

1. **Android never talks to Supabase directly** — all data through `/api/sync`
2. **Server is source of truth for master data** — products, categories, taxes, stores, terminals, users are NEVER pushed from Android to cloud. They flow one way: server → device (pull only). Android only pushes transactional data: orders, tills, customers, error logs, inventory entries. This prevents empty local DBs from overwriting server data.
3. **Web console reads Supabase directly** — mutations through API routes
4. **Context = account_id + store_id + terminal_id** — every query scoped
5. **Offline-first** — every POS operation works without connectivity
6. **Three-layer rule** — every feature needs: migration + API route + UI (web or Android)
7. **No CRUD scaffolds** — every screen must feel designed (see UI Rules below)
8. **All errors logged to `error_logs` table** — Android via AppErrorLogger, web via `error-logger.ts` + `/api/errors/log`, server components via `error.tsx` boundaries. Never `Log.e()`, silent `catch`, or `console.error` without also logging to DB. Every dashboard route must have error.tsx coverage.
9. **Legacy workers disabled** — only `CloudSyncWorker` handles sync
10. **Capability-driven UI** — role-based visibility, not hardcoded screen lists
11. **Cloud-authoritative IDs** — server assigns all PKs (store_id, terminal_id, user_id). Android uses server-assigned IDs, never hardcodes 1.
12. **Soft delete** — key tables (product, store, terminal, pos_user, customer, productcategory, orders) use `is_deleted` + `deleted_at` instead of hard DELETE. Queries filter `is_deleted = false`.
13. **No standalone accounts** — all accounts created via `/api/auth/signup` or `/api/account/create-demo`. `AiImportService` throws if no `targetAccountId`.
14. **Demo brands are server-first** — create on Supabase via API, Android creates only an account shell in Room, then pulls via CloudSync. **Never create demo products locally.**
15. **Passwords never stored locally** — only Supabase Auth holds passwords. Local Room DB stores PINs only.
16. **No PostgREST FK joins** — cross-tenant FKs have been dropped. Never use `.select("*, table(column)")`. Use separate queries and map manually.
17. **Validate column names against actual DB schema** — `store` has no `phone`, `email`, `tax_number`. `productcategory` has no `description`. `pos_user` has no `store_id`. `owner` PK is `id` not `owner_id`. `error_logs` uses `stack_trace`, `device_info`, `created_at` (not `stacktrace`, `device_id`, `timestamp`).

## Where to Build

| Task | Android | Web Console | API |
|------|---------|-------------|-----|
| POS/cart/payments/receipts | Native | — | Sync |
| Products/stores/terminals/users/categories/taxes | WebView | Native | CRUD |
| Brands | Native | Native | CRUD |
| Product intake | WebView (`/intake`) | Native | AI + matching |
| Orders | Native | Native | Query |
| Till management | Native | View only | Sync |
| Printers/barcode scanning | Native | — | — |
| Reports/errors | WebView | Native | Query |
| Inventory count | Native | Native | CRUD + Sync |
| Kitchen/restaurant (KDS, stations, sections) | Native | Native (`/stations`) | Sync |
| Account management | — | Native (`/platform`) | CRUD |

## WebView (OTT Flow)

1. Android `POST /api/auth/ott` → gets 60-second token. Reads `account_id` from prefs, `user_id`/`store_id`/`terminal_id` from `SessionManager` or Room DB (not prefs — prefs may belong to another brand).
2. Loads `https://web.posterita.com/products?ott=<token>`
3. **Middleware** validates OTT → sets httpOnly cookie `posterita_ott_session` → redirects to `/customer/products`
4. **Customer layout** checks cookie → skips Supabase Auth → hides sidebar → renders
5. **`getSessionAccountId()`** reads cookie as fallback when no Supabase Auth user
6. WebView blocks nav to `/login`, `/platform`, `/manager` (prevents breaking Android nav)
7. **WebView layout** — slim 40dp top bar with back arrow + title + loading spinner + connectivity dot. CSS injection hides sidebar, breadcrumb, and page heading (Android top bar shows title). Content is full-width.

## Web Console Routes

| Route | Status | Route | Status |
|-------|--------|-------|--------|
| `/` Dashboard | ✅ | `/products` (section-based edit) | ✅ |
| `/orders` | ✅ | `/categories` | ✅ |
| `/customers` | ✅ | `/stores` | ✅ |
| `/reports` | ✅ | `/terminals` (QR enroll) | ✅ |
| `/errors` | ✅ | `/users` | ✅ |
| `/intake` + `/new` + `/[id]` | ✅ | `/settings` (currency) | ✅ |
| `/ai-import` | ✅ | `/price-review` | ✅ |
| `/platform` (5 tabs: brands/owners/errors/sync/tests) | ✅ | `/brands` | ✅ |
| `/platform/error-logs` | ✅ | `/catalogue` (PDF export) | ✅ |
| `/tables` (sections) | ✅ | `/inventory` + `/new` + `/[id]` | ✅ |
| `/stations` (prep stations) | ✅ | | |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sync` | POST | Sync: push transactional data (orders/tills/customers) + pull all data, device registration, sibling brand discovery |
| `/api/sync` | GET | Health check + sync API version |
| `/api/auth/signup` | POST | Create owner + live brand + demo brand (with 15 seeded products on server) |
| `/api/auth/login` | POST | Authenticate via Supabase Auth, return all brands + pos_user + server IDs |
| `/api/auth/check` | POST | Real-time email/phone uniqueness check |
| `/api/auth/reset` | POST | Delete all account data (cascading, preserves nothing) |
| `/api/auth/reset-password` | POST | Send password reset email (redirects to `web.posterita.com`) |
| `/api/account/[accountId]` | DELETE | Delete brand (account manager only, archive-before-delete for live) |
| `/api/account/[accountId]` | PATCH | Update brand status/name |
| `/api/account/create-demo` | POST | Create demo brand on server with 15 seeded products. Requires valid owner. |
| `/api/account/lifecycle` | PATCH/GET | Status transitions with validation + audit log |
| `/api/owner/[ownerId]` | GET/PATCH | Owner details + edit (name, email, phone). Email uniqueness enforced. |
| `/api/data` | POST | Data proxy for web console reads (auto-injects account_id + soft-delete filter + logs errors to DB) |
| `/api/data/insert` | POST | Insert records (web console creates) |
| `/api/data/update` | POST | Update records (includes `error_logs` for status marking) |
| `/api/data/delete` | POST | Soft delete for supported tables, hard delete for others |
| `/api/errors/log` | POST | Log errors from web client/API to `error_logs` table |
| `/api/inventory/sessions` | GET/POST | Inventory count session management |
| `/api/inventory/sessions/[sessionId]` | GET/PATCH | Individual session operations |
| `/api/inventory/sessions/[sessionId]/entries` | GET/POST | Session entries CRUD |
| `/api/ai-import` | POST | AI product discovery (Claude Haiku 4.5 + web search) |
| `/api/ai-import/save` | POST | Save AI-discovered products to Supabase (server-first, not local) |
| `/api/auth/ott` | POST | Generate OTT token for Android WebView |
| `/api/auth/ott/validate` | POST | Validate OTT token → set session cookie |
| `/api/auth/lookup` | POST | Auth user lookup by email |
| `/api/enroll` | POST | Device enrollment (QR code flow) |
| `/api/sync/register` | POST | Register device for sync |
| `/api/context` | GET | Resolve current session context (account, store, terminal) |
| `/api/catalogue` | GET | Generate catalogue PDF |
| `/api/platform/create-account` | POST | Create account from platform portal |
| `/api/super-admin/status` | GET | Super admin status check |
| `/api/super-admin/switch` | POST | Super admin account impersonation |
| `/api/account-manager/accounts/[accountId]/assignment` | POST | Assign account manager to brand |
| `/api/owner/accounts` | GET | List all accounts for an owner (by email/phone) |
| `/api/owner/accounts/[accountId]` | GET/PATCH/DELETE | Owner-scoped account operations |
| `/api/blink/dynamic-qr` | POST | Generate Blink dynamic QR for payment |
| `/api/blink/till` | POST | Blink till integration |
| `/api/intake` | GET/POST | Product intake batch list + create |
| `/api/intake/[batchId]` | GET | Get intake batch details |
| `/api/intake/[batchId]/process` | POST | Process intake batch (AI matching) |
| `/api/intake/[batchId]/review` | POST | Review + approve/reject intake items |
| `/api/debug/session` | GET | Debug: shows resolved auth_user_id, email, account_id for current session |

## Auth Flow

### Android First Launch
SetupWizard (online-first): Welcome (Sign Up / Owner Log In / Enroll Device — no "Try Demo") → Email+Password+Phone → Name → Brand → Country → Category → Set PIN → Setting Up (calls `POST /api/auth/signup` — server creates live + demo brands with products) → Resets sync timestamps to epoch → Sync (waits up to 30s for CloudSync to pull demo products) → Review → Home. No AI import during signup. Pre-populates email from Google account, country from SIM/locale. Connectivity dot + "Online/Offline" label reactive in toolbar.

### Android Login (Returning User)
**If local user with PIN exists:** Welcome "Owner Log In" → **LockScreen** (PIN only, no email/password). Uses dedicated Room.databaseBuilder per brand (not singleton) for reliable PIN detection. SplashActivity also auto-detects existing accounts and goes straight to PIN on cold start.

**If no local user (new device):** Welcome "Owner Log In" → **LoginActivity** (email+password) → **Online:** `POST /api/auth/login` → Supabase Auth → returns all brands + pos_user → updates local Room DB user → CloudSync → Home. **Offline:** scans local Room DBs for matching email, requires prior PIN → logs in with local data, schedules sync.

Force Sync button available on login screen. Sync always triggered at login. Connectivity dot visible on login and lock screens.

### Session Recovery on Cold Start
SplashActivity priority: (1) Active account with PIN → LockScreen. (2) No active account but registry has brands with PIN → restores first matching brand, goes to LockScreen. (3) Demo account → Home. (4) Nothing → SetupWizard.

### Account Resolution (`getSessionAccountId`)
Priority: (1) OTT cookie (Android WebView). (2) Super admin impersonation session. (3) Owner → `owner_account_session`. (4) Owner → first account by `owner_id`. (5) Fallback: owner by email → first account. (6) `pos_user.auth_uid` → account. Owner table PK is `id` (not `owner_id`).

### Signup Validation
- Email/phone uniqueness checked in real-time on field blur (`POST /api/auth/check`)
- Duplicate shows red error on field + "Already have an account? Sign in" link
- Server enforces unique indexes on `owner.email` and `owner.phone`
- 409 response shows dialog: "Sign In" or "Use Different Email"

### Password vs PIN
**Password:** Supabase Auth credential (web login, reset). Never stored locally. **PIN:** 4-digit device unlock. Mandatory. Synced via `pos_user.pin`. Password changes on web reflected on Android via login API (returns updated `pos_user`).

### Cold Start / Idle Timeout
Always lock screen with 4-digit PIN. 30-min idle → lock. Back button → background (can't bypass).

## Sync Protocol

**Version:** `SYNC_API_VERSION = 2`, `MIN_CLIENT_VERSION = 1`

**Multi-brand sync:** CloudSyncWorker syncs ALL registered brands each cycle — active brand first, then others. NO brand pushes master data (rule 2). Each brand has its own Room database. Worker saves/restores `storeName`, `storeId`, `terminalName`, `terminalId` in prefs to prevent context corruption.

**Per-account sync timestamps:** Each brand has its own `cloud_last_sync_at_<accountId>` key. Signup and demo creation reset timestamps to epoch before first sync.

**Store/terminal from local DB:** `CloudSyncService.performSync()` reads `store_id` and `terminal_id` from the brand's own Room DB, not from SharedPreferences.

**Sibling brand discovery:** Sync response includes `sibling_brands` — all accounts owned by the same owner. CloudSyncWorker registers new brands in `LocalAccountRegistry` automatically.

**Brands stats:** ManageBrandsActivity opens each brand's DB via dedicated `Room.databaseBuilder` (not the singleton) to read product/category/store counts and DB file size. Prevents cross-contamination.

**Connectivity indicator:** Green/red dot on every screen via `setupConnectivityDot()` from `ConnectivityDotHelper.kt`. Tap opens sync screen. Reactive via `ConnectivityMonitor`. Uses `NET_CAPABILITY_INTERNET` check. `onLost` re-checks active network (prevents false offline on multi-network devices). Do NOT use `NET_CAPABILITY_VALIDATED` — not set on all devices/emulators.

## Kitchen & Restaurant

**Table sections:** `table_section` table — zones/areas (Indoor, Patio, Bar, Takeaway). Tables have optional `section_id`. Takeaway sections auto-assign order numbers.

**Preparation stations:** `preparation_station` + `category_station_mapping`. Station types: kitchen/bar/dessert/custom. Each station can link to a printer via `printer.station_id`.

**Station routing priority:** (1) `product.station_override_id` → (2) `category_station_mapping` → (3) default kitchen station. Resolved via `StationResolver.resolveForCart()`. Falls back to legacy `printKitchenOnly()` if no stations configured.

**KDS (Kitchen Display System):** LAN-only, no internet needed. POS terminal runs embedded HTTP server (NanoHTTPD, port 8321) via `KdsServerService` (foreground service). KDS tablets discover via mDNS (`_posterita-kds._tcp.`) or manual IP. REST endpoints: `/kds/orders`, `/kds/stream` (SSE), `/kds/bump`, `/kds/recall`, `/kds/stations`, `/kds/health`. Events relayed via `KdsEventBus` (SharedFlow).

**Order operations:** Table transfer (long-press → move order between tables), order merge (long-press → combine two orders), delivery type (address/phone capture). Section-tabbed table picker dialog.

**Hold order JSON extensions:** Per-item `station_id`, `station_name`, `item_status` (new/in_progress/ready/served), `isKitchenItem`. Order-level `sectionName`. Backward compatible — missing fields default safely.

**Kitchen receipts:** Station name in bold H1 header (e.g., "GRILL STATION"). Item modifiers and notes printed. Both thermal (ReceiptPrinter) and Bluetooth (BluetoothPrinter) supported. Station name encoded as `[StationName]` prefix in order note.

## Unified Error Logging

All errors from Android, Web Console, and API routes go to the **same `error_logs` table** in Supabase.

| Source | How |
|--------|-----|
| Android | `AppErrorLogger` → Room `error_log` → CloudSync → `error_logs` |
| Web client (browser) | `error-logger.ts` → `POST /api/errors/log` → `error_logs` |
| Web API (server) | `/api/data` auto-logs failed queries → `error_logs` |
| React crashes | `ErrorBoundary` component → `POST /api/errors/log` → `error_logs` |
| Dashboard server components | `(dashboard)/error.tsx` catches + logs to `/api/errors/log` |
| Brands page | `brands/error.tsx` catches + logs to `/api/errors/log` |

**Server component error logging rule:** Every dashboard page that can crash should either (a) use the global `(dashboard)/error.tsx` boundary, or (b) have its own `error.tsx` with DB logging. Server component errors are NOT caught by `ErrorBoundary` (client-only) — they need Next.js `error.tsx` files. Always add try-catch around `getSessionAccountId()` and log failures.

**`error_logs` table columns:** `id`, `account_id`, `severity`, `tag`, `message`, `stack_trace`, `device_info`, `app_version`, `created_at`, `status` (open/fixed/ignored).

**Platform Error Logs page** (`/platform/error-logs`): summary cards, filters (severity, tag, status, search), expandable rows with stack trace, status actions (Mark Fixed / Ignore / Reopen). Account manager only.

## Data Consistency

- **Startup check:** SplashActivity verifies local DB has users for cached account_id. If inconsistent, clears prefs and forces re-setup.
- **Session recovery:** HomeActivity always loads user/account/store/terminal from Room DB if `sessionManager.user` is null.
- **Context bar:** Home dashboard shows `Brand › Store › Terminal ▾` — reads from `sessionManager` (not prefs which get contaminated by multi-brand sync).
- **Reset Account:** Settings → Danger Zone → clears all local Room DBs + SharedPreferences + calls `POST /api/auth/reset`.
- **No cross-tenant FKs:** Only `account_id→account` and `account→owner` FKs remain. **Never use PostgREST FK joins.**
- **Account lifecycle:** `draft → onboarding → active → suspended → archived` (+ `testing`, `failed`). CHECK constraint + audit log.

## UI Rules

- **View = Detail Brochure** — hero header + section cards + chips for booleans
- **Edit = Section-based bottom sheet** — collapsible section cards (Basic Info, Pricing, Status). Bottom sheet slides up on mobile, centered on desktop. Toggle switch for active/inactive.
- **Create = Wizard** — chain section editors as steps. Progress dots, skip optional.
- **List = Styled Cards** — colored icon + title + subtitle + badge + chevron. No raw tables.
- **Products page:** compact header (count + AI Import button), tabs (Live/Review/Drafts), no redundant heading.
- **PIN dots:** Use `bg_pin_dot` drawable with `mutate()`. PIN pad has 80dp bottom margin.
- **WebView wrapper:** 40dp top bar (back + title + spinner + dot). CSS hides sidebar + breadcrumb + heading.
- **Web sidebar:** Brand › Store › Terminal context shown below header (stacked, not cropped).
- See `.claude/skills/posterita-ui/SKILL.md` for design tokens.

## Android Navigation

- **Home:** greeting + `Brand › Store › Terminal ▾` context switcher (brand in blue semibold, store in ink, terminal in muted) + summary card + app grid + bottom nav
- **POS drawer:** Home, Orders, Terminal Info, Printers, Till History, MORE menu
- **Settings:** web console links (products, stores, terminals, users, categories, taxes) + Sync + Printers + Brands (owner only) + Reset Account (owner only, danger zone)
- **Brands:** lists all brands from `LocalAccountRegistry` with stats (products, categories, stores, DB size). Create: Demo (server-first) or AI Import. Delete: non-active demo/test brands.
- **Kitchen:** KitchenOrdersActivity — status cycle, split bill, recall, print, delete, complete. Long-press for table transfer / order merge.
- **KDS:** KdsSetupActivity (mDNS discovery + manual IP) → KdsDisplayActivity (full-screen grid, landscape, timers, bump/recall). Exit requires confirmation.

## Data Hierarchy

```
Owner → Brand (Account) → Store → Terminal (login context)
                        → Users (owner/admin/supervisor/cashier/staff)
```
Each brand has: currency, stores, terminals, users. Demo brand seeded with 15 products + images **on the server**. One Room DB per brand (not shared). Brands tracked cross-DB via `LocalAccountRegistry`.

## Terminal Types

**The terminal determines the experience.** Each terminal has a `terminal_type` that controls UI, features, and startup behavior. A single store can have retail registers, restaurant POS, kitchen displays, and staff devices.

| Type | Purpose | Startup |
|------|---------|---------|
| `pos_retail` | Standard retail register (default) | PIN → Home → POS |
| `pos_restaurant` | Restaurant POS with tables/kitchen | PIN → Home → POS + order type dialog |
| `kds` | Kitchen Display System | PIN → KdsDisplayActivity (full-screen) |
| `mobile_staff` | Staff device (orders, inventory) | PIN → Home (limited) |
| `customer_display` | Customer-facing cart mirror (future) | Auto-start |
| `self_service` | Self-ordering kiosk (future) | Auto-start |

**Terminal type replaces global `businessType`** — `prefsManager.isRestaurant` now reads from `terminal.terminal_type`, not a global pref. Set via EditTerminalActivity or web console `/terminals`.

**Feature gating:** Use `prefsManager.isRestaurantTerminal` / `prefsManager.isKdsTerminal` instead of the old `prefsManager.isRestaurant`. See `specs/modules/20-terminal-types.md` for full feature visibility matrix.

## Brand Management

- **Signup creates 2 brands on server:** live (empty) + demo (15 products with images, 4 categories, 2 taxes). Android pulls both via sync.
- **Create demo brand:** `POST /api/account/create-demo` → requires valid owner (rejects "null" email) → server creates full brand → Android creates Room DB shell → resets sync timestamp → CloudSync pulls.
- **AI Import:** `POST /api/ai-import` discovers products → `POST /api/ai-import/save` saves to Supabase (server-first) → sync pulls to Android. Never saves locally.
- **Delete brand (Web):** account manager only. Live brands must be archived first. Confirmation modal.
- **Switch brand:** Home context switcher or Brands screen. Resets session, switches Room DB, reloads HomeActivity.

## AI Import

- **Model:** Claude Haiku 4.5 (`claude-haiku-4-5`) — ~$0.025/import
- **Server endpoints:** `POST /api/ai-import` (discover) + `POST /api/ai-import/save` (persist to Supabase)
- **Web search:** `web_search_20260209` tool (GA, no beta header)
- **NOT used during signup** — available post-signup via Brands screen or web console `/ai-import`
- **Server-first:** AI results saved to Supabase via `/api/ai-import/save`, Android pulls via sync. Never saves to local Room DB.
- **Error handling:** Specific messages for credit exhaustion, rate limits, timeouts.

## WhatsApp Support

**Architecture:** Single Posterita WhatsApp number → Meta Cloud API (direct, no BSP) → `/api/whatsapp/webhook` → Claude AI agent → reply via WhatsApp API. Human escalation to SalesIQ/Slack when AI can't resolve.

**Two channels, one number:**
- **B2C (consumer→merchant):** Receipt QR scans (`wa.me/+230XXXXX?text=RECEIPT ORDER-REF`). AI resolves from order context — knows the merchant, products, customer. Handles: order status, loyalty points, store hours, menu questions.
- **B2B (merchant→Posterita):** `SUPPORT` keyword. AI has POS knowledge base (CLAUDE.md, specs, error_logs, sync_request_log). Handles: sync issues, setup help, feature questions.

**Knowledge base = Supabase.** No separate system. AI queries products, orders, loyalty, error_logs directly.

**Cost:** ~$50/month (1,000 free conversations/month from Meta, Claude Haiku ~$0.001/message).

**Per-merchant numbers:** Future premium feature via BSP (Twilio/WATI). Not needed at launch.

**Blocked:** Need dedicated phone number + Meta Business verification (2–4 weeks). See `specs/modules/22-whatsapp-support.md`.

## Web Platform Portal (`/platform`)

Account manager / super admin view. Tabbed layout (`/platform?tab=brands|owners|errors|sync|tests`):

- **Brands tab** (default) — owner-grouped brand list, type/status badges, store/product/user counts, account manager assignment, create account form, archive + delete, pagination (25/page)
- **Owners tab** — all owners with name, email, phone, brand count, join date, active status. Edit panel: change name/email/phone, send password reset. Summary cards.
- **Errors tab** — full error logs dashboard inline. Filters by severity/tag/status. Mark Fixed/Ignore/Reopen. Expandable stack traces.
- **Sync Monitor tab** — all `/api/sync` requests logged to `sync_request_log` table. Shows timing, push/pull counts, status (success/partial/error), expandable detail rows with full stats + errors. Account name resolved.
- **Test Results tab** — 625 total tests: 419 Android unit (21 files) + 156 web unit (13 files) + 42 production smoke tests (API, DB, pages, edge cases, SQL injection) + 8 ADB device tests (launch, crash, ANR, memory, logcat). CI reports from `ci_report` table with git SHA, commit message, pass/fail per push. Static breakdown in `test-data.ts`.

## DB Column Reference (common mistakes)

| Table | Has | Does NOT have |
|-------|-----|---------------|
| `store` | name, address, city, state, zip, country, currency, isactive | ~~phone, email, tax_number~~ |
| `productcategory` | name, position, isactive, display | ~~description~~ |
| `pos_user` | user_id, username, firstname, pin, role, email | ~~store_id~~ |
| `owner` | **id**, auth_uid, email, phone, name | ~~owner_id~~ (PK is `id`) |
| `orders` | order_id, **document_no**, grand_total, uuid, account_id, store_id, terminal_id, date_ordered | ~~ordernumber, documentno~~ (use `document_no`, `grand_total`) |
| `orderline` | orderline_id, order_id, product_id, productname, **qtyentered**, **priceentered**, lineamt, **linenetamt**, costamt | ~~qty, priceactual, tax_amount, discount~~ |
| `error_logs` | message, **stack_trace**, **device_info**, **created_at**, status | ~~stacktrace, device_id, timestamp, screen, user_name~~ |
| `restaurant_table` | table_id, store_id, terminal_id, table_name, seats, is_occupied, current_order_id, account_id, section_id | |
| `table_section` | section_id, account_id, store_id, name, display_order, color, is_active, is_takeaway | |
| `preparation_station` | station_id, account_id, store_id, name, station_type, printer_id, color, display_order, is_active | |
| `category_station_mapping` | id, account_id, category_id, station_id | |
| `terminal` | terminal_id, store_id, account_id, name, prefix, floatamt, isactive, **terminal_type**, zone | ~~type~~ (use `terminal_type`) |
| `printer` | printer_id, name, printer_type, width, ip, device_name, print_receipt, print_kitchen, cash_drawer, role, account_id, store_id, station_id | |

## Current Phase

- **Phase 0** ✅ Android cleanup, UI consistency, offline POS
- **Phase 1** ✅ Web console CRUD + API + auth + sync + device enrollment (QR)
- **Phase 1.5** ✅ Product Intake Pipeline + Product Lifecycle (draft/review/live)
- **Phase 2** ← CURRENT: Inventory, loyalty, catalogue, logistics
- **Phase 2.5** ✅ Kitchen & restaurant — table sections, prep stations, KDS, station routing (Phase E courses deferred)
- **Phase 3** Staff ops, supervisor, warehouse, AI assistant

### Phase 2 Priorities (next to implement)

1. **Inventory count** ✅ — spot check MVP (sessions, entries, barcode scan, web console)
2. **Kitchen & restaurant** ✅ — table sections/zones, preparation stations, KDS, station routing, table transfer/merge, delivery orders, terminal types. See `specs/modules/19-kitchen-restaurant.md`, `specs/modules/20-terminal-types.md`.
3. **WhatsApp support** — single Posterita number, Meta Cloud API direct (no BSP), AI-first (Claude agent scoped to merchant context), human escalation to SalesIQ/Slack. Receipt QR → WhatsApp → AI resolves order/loyalty/support. See `specs/modules/22-whatsapp-support.md`. **Blocked:** need phone number + Meta Business verification.
4. **Customer loyalty** — wallet, points, award on purchase, redeem at POS, balance display
5. **Catalogue PDF** — generate printable product catalogue from web console
6. **AI chat assistant** — Claude tool-use against backend endpoints, scoped to user permissions. WhatsApp is the primary channel (not in-app).
7. **Shelf labels** — Zebra ZPL + Epson ESC/POS label printing from web/Android
8. **Operational supplies** — `product_class` field, supply categories, reorder alerts
9. **Google Sign-In** — Supabase OAuth (needs Google Cloud Console credentials configured)

## Specs

Read before working: `specs/shared/architecture.md`, `specs/shared/data-model.md`, relevant `specs/modules/XX-*.md`. For UI: `.claude/skills/posterita-ui/SKILL.md`.
