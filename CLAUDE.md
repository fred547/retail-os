# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one backend, one Supabase database.

## Repository Map

| Directory | Purpose |
|-----------|---------|
| `pos-android/` | Android POS app (Kotlin, Gradle, Hilt, Room) — offline-first |
| `pos-android/server-side/posterita-cloud/web/` | **Web console** (Next.js on Vercel) — admin CRUD |
| `pos-android/server-side/posterita-cloud/web/src/app/api/` | API routes (sync, data, AI import, intake, auth, Blink) |
| `pos-android/server-side/posterita-cloud/supabase/migrations/` | Supabase migrations |
| `posterita-prototype/` | UI prototype (React JSX) — design reference |
| `specs/` | Specification files |

## Stack & URLs

- **Android:** Kotlin, Room, Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink
- **Web:** Next.js 14+ (App Router) on Vercel
- **DB:** Supabase Postgres — `account_id` is TEXT. **RLS is enabled on all tables.** API routes use service role key (bypasses RLS). Web console reads use `createServerSupabaseAdmin()` (service role). Never use anon key for writes.
- **Auth:** Supabase Auth (web), OTT tokens (Android WebView), PIN (device unlock)
- **Production:** `https://posterita-cloud.vercel.app/api/` = `https://web.posterita.com`
- **Legacy (DO NOT USE):** `my.posterita.com/posteritabo` — all `app/*` endpoints are dead

## Deployment

```bash
cd pos-android/server-side/posterita-cloud/web && npx vercel --prod --yes
```
- Vercel project: `posterita-cloud` (team: `tamakgroup`). If wrong, re-link: `npx vercel link --project posterita-cloud --yes`
- Supabase migrations: run via Management API (see `reference_supabase.md`). Reload cache: `NOTIFY pgrst, 'reload schema'`
- **Never** `createClient()` at module scope — use `function getDb() { return createClient(...) }` or `force-dynamic`

## Rules

1. **Android never talks to Supabase directly** — all data through `/api/sync`
2. **Web console reads Supabase directly** — mutations through API routes
3. **Context = account_id + store_id + terminal_id** — every query scoped
4. **Offline-first** — every POS operation works without connectivity
5. **Three-layer rule** — every feature needs: migration + API route + UI (web or Android)
6. **No CRUD scaffolds** — every screen must feel designed (see UI Rules below)
7. **All errors through AppErrorLogger** — never `Log.e()` or silent `catch`
8. **Legacy workers disabled** — only `CloudSyncWorker` handles sync. `OrderSyncWorker`, `CloseTillSyncWorker`, `DocumentNoSyncWorker` skip for cloud accounts.
9. **Capability-driven UI** — role-based visibility, not hardcoded screen lists

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

## WebView Auth (OTT Flow)

1. Android `POST /api/auth/ott` → gets 60-second token
2. Loads `https://web.posterita.com/products?ott=<token>`
3. **Middleware** validates OTT → sets httpOnly cookie `posterita_ott_session` → redirects to `/customer/products`
4. **Customer layout** checks cookie → skips Supabase Auth → hides sidebar → renders
5. **`getSessionAccountId()`** reads cookie as fallback when no Supabase Auth user
6. WebView blocks nav to `/login`, `/platform`, `/manager` (prevents breaking Android nav)

## Web Console Routes

| Route | Status | Route | Status |
|-------|--------|-------|--------|
| `/` Dashboard | ✅ | `/products` | ✅ |
| `/orders` | ✅ | `/categories` | ✅ |
| `/customers` | ✅ | `/stores` | ✅ |
| `/reports` | ✅ | `/terminals` | ✅ |
| `/errors` | ✅ | `/users` | ✅ |
| `/intake` + `/new` + `/[id]` | ✅ | `/settings` (taxes) | ✅ |
| `/ai-import` (legacy) | ✅ | `/price-review` | ✅ |
| `/platform` (brand picker) | ✅ | `/brands` | ✅ |

## Auth Flow

### Android First Launch
SetupWizard (online-first, requires internet): Welcome → Email+Password+Phone → Name → Brand → Country → Category → Set PIN (4-digit, mandatory) → Setting Up (calls `POST /api/auth/signup`) → Review Products → Home. Creates 2 brands (live + demo). Sync-first: waits for CloudSync before proceeding. No offline fallback for signup.

### Android Login (Returning User / New Device)
Enter email+password → `POST /api/auth/login` → gets account IDs → triggers CloudSync → waits up to 30s for data → Home. No offline login on new devices.

### Password vs PIN
**Password:** Supabase Auth credential (web login, reset). Any length. **PIN:** 4-digit device unlock. Mandatory. Synced to Supabase. Separate fields — never conflate.

### Cold Start / Idle Timeout
Always lock screen with 4-digit PIN. 30-min idle → lock. Back button → background (can't bypass).

### Security: Email OTP → Password → PIN → OTT → Biometric (optional) → Role-based permissions

## UI Rules

- **View = Detail Brochure** — hero header + section cards + chips for booleans
- **Edit = Section Editors** — tap a section card → bottom sheet with 2-4 fields → save independently
- **Create = Wizard** — chain section editors as steps. Progress dots, skip optional.
- **List = Styled Cards** — colored icon + title + subtitle + badge + chevron. No raw tables.
- See `.claude/skills/posterita-ui/SKILL.md` for design tokens.

## Error Logging

```kotlin
AppErrorLogger.log(context, "Tag", "message", exception)   // ERROR: toast + DB + logcat
AppErrorLogger.warn(context, "Tag", "message", exception)   // WARN: DB + logcat (no toast)
AppErrorLogger.fatal(context, "Tag", "message", throwable)  // FATAL: crash handler
AppErrorLogger.info(context, "Tag", "message")              // INFO: diagnostic only
```
Flow: Logcat → Room `error_log` → CloudSync → Supabase → `/errors` page. Never `catch (_: Exception) {}`.

## Android Navigation

- **Home:** greeting + context switcher ("Store › Terminal ▾") + summary card + app grid + bottom nav
- **POS drawer:** Home, Orders, Terminal Info, Printers, Till History, MORE menu
- **Settings:** all data management via WebView (products, stores, terminals, users, categories, taxes)
- **Connectivity dot:** green/red, tap → sync screen. Auto-sync every 5 min.

## Data Hierarchy

```
Owner → Brand (Account) → Store → Terminal (login context)
                        → Users (owner/admin/supervisor/cashier/staff)
```
Each brand has: currency, denominations, stores, terminals, users. Demo brand auto-created on signup.

## Product Intake Pipeline

```
Source → intake_batch → intake_items (AI extraction + matching) → Owner review → Product table (live)
```
Sources: website, catalogue (PDF/CSV), purchase order, invoice, AI search. Each item matched against catalog (exact barcode / fuzzy name / new). Owner approves/rejects/merges in `/intake/[batchId]`.

**Three independent review queues:**
- **Intake** (`intake_item.status`) — before product exists
- **Draft** (`product.product_status = 'draft'`) — manual creation in progress
- **Price** (`product.needs_price_review = 'Y'`) — staff changed price

API: `POST /api/intake` (create), `GET /api/intake` (list), `GET /api/intake/[id]` (detail), `POST /api/intake/[id]/process` (AI+SSE), `POST /api/intake/[id]/review` (approve/reject).

## Till Management

Open: denomination counter (stepper per note/coin, largest→smallest) → opening float. Close: count cash + enter card/Blink totals → reconciliation summary (expected vs counted per tender type, total shortage). Float stored on terminal. No progressive disclosure — one scrollable screen.

## Colors

Primary `#1976D2` | Success `#2E7D32` | Error `#E53935` | Warning `#F57F17` | Purple `#5E35B1` | BG `#F5F2EA` | Paper `#FFF` | Ink `#141414` | Muted `#6C6F76` | Line `#E6E2DA`

## Current Phase

- **Phase 0** ✅ Android cleanup, UI consistency, offline POS
- **Phase 1** Web console CRUD + API + auth + sync
- **Phase 1.5** ✅ Product Intake Pipeline
- **Phase 2** Inventory, loyalty, catalogue, logistics
- **Phase 3** Staff ops, supervisor, warehouse, AI assistant

## Specs

Read before working: `specs/shared/architecture.md`, `specs/shared/data-model.md`, relevant `specs/modules/XX-*.md`. For UI: `.claude/skills/posterita-ui/SKILL.md`.
