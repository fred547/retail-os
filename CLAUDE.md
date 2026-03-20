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
- **Legacy (DO NOT USE):** `https://my.posterita.com/posteritabo`
- **Loyalty (legacy):** `https://loyalty.posterita.com/api/` — being migrated

## Key Architectural Rules

1. **Android never talks to Supabase directly** — all data flows through the API
2. **Web console reads Supabase directly** (via Supabase client) — mutations go through API routes
3. **One store per user per day** — JWT carries store_id claim
4. **Inventory count is scan-only** — no manual data entry
5. **Offline-first** — every store-floor operation works without connectivity
6. **Capability-driven UI** — role-based, not hardcoded screen lists
7. **Every mutation produces an audit event**
8. **Three-layer feature rule** — see Feature Development Workflow below

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
- Read-only views of web-managed data (synced from API)
- WebView integration for admin tasks (opens web console embedded)
- Offline Room DB with sync engine

### When to build where:

| Task | Android | Web Console | API |
|------|---------|-------------|-----|
| **POS checkout flow** | ✅ Native | ❌ | ✅ Sync orders |
| **Create/edit products** | WebView embed | ✅ Native | ✅ CRUD |
| **Create/edit stores** | WebView embed | ✅ Native | ✅ CRUD |
| **Create/edit users** | WebView embed | ✅ Native | ✅ CRUD |
| **Create brands** | WebView embed | ✅ Native | ✅ CRUD |
| **View orders** | ✅ Native | ✅ Native | ✅ Query |
| **Till management** | ✅ Native | ✅ View only | ✅ Sync |
| **Printer config** | ✅ Native (local) | ❌ | ❌ |
| **Barcode scanning** | ✅ Native | ❌ | ❌ |
| **Reports/analytics** | WebView embed | ✅ Native | ✅ Query |

### WebView Integration Pattern

The Android app embeds the web console via `WebConsoleActivity`:
- Settings items open web console pages (e.g., `/products`, `/stores`)
- Sidebar is hidden via CSS injection — Android provides its own navigation
- Auth token will be passed from Android to WebView (Phase 1)
- After editing in web console, Android syncs to get updated data

## Web Console Routes

Real web app at `pos-android/server-side/posterita-cloud/web/`:

| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard | ✅ |
| `/products` | Products (CRUD) | ✅ |
| `/categories` | Categories | ✅ |
| `/stores` | Stores | ✅ |
| `/terminals` | Terminals | ✅ |
| `/users` | Users | ✅ |
| `/orders` | Orders | ✅ |
| `/customers` | Customers | ✅ |
| `/settings` | Settings/Taxes | ✅ |
| `/reports` | Reports | ✅ |
| `/platform` | Account/Brand switcher | ✅ |
| `/ai-import` | AI product import | ✅ |
| `/price-review` | Price review queue | ✅ |
| `/brands` | Brand management | ❌ Needs building |

## Android Navigation Architecture

- **Home screen:** Hub with bottom nav (Home | POS | Orders | More)
- **POS drawer:** Home, Orders, Terminal Info, Printers, Till History
- **POS MORE menu:** Open Cash Drawer, Clear Cart, Hold Order, Close Till
- **Settings:** Opens web console pages via WebView
- **Connectivity dot:** Green/red in every top bar, tap opens sync screen
- **Sync:** Automatic (5-min CloudSyncWorker). Manual via connectivity dot.

## Data Hierarchy

```
Brand (Account)
├── Currency, WhatsApp number, head office address, website
├── Store 1
│   ├── Name, address, city, country
│   ├── Terminal A (POS type)
│   │   ├── POS config (columns, categories, security)
│   │   └── Printers (receipt, kitchen, bar, label)
│   └── Terminal B (Kitchen type)
├── Store 2
│   └── Terminal C
└── Users (roles: owner, admin, supervisor, cashier, staff)
```

## Brand Colors

- Primary: `#1976D2` | Light: `#DCEBFF` | Dark: `#0D5DB3`
- Success: `#2E7D32` | Error: `#E53935` | Warning: `#F57F17`
- Purple: `#5E35B1` | Background: `#F5F2EA` | Paper: `#FFFFFF`
- Ink: `#141414` | Muted: `#6C6F76` | Line: `#E6E2DA`

## Current Phase

**Phase 0** — Android app cleanup, UI consistency, offline POS solid. ✅ Nearly complete.
**Phase 1** — Web console CRUD + API routes + auth integration + sync engine.
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
