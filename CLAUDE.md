# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one NestJS backend, one Supabase database.

## Repository Map

| Directory | What it is |
|-----------|-----------|
| `pos-android/` | Production Android POS app (Kotlin, Gradle, Hilt, Room) — 58 Activities, offline-first |
| `manus-retail-os/` | Manus prototype — inspiration only, NOT the production codebase |
| `manus-retail-os-prototype/` | Earlier Manus prototype variant — inspiration only |
| `pos-android/server-side/posterita-cloud/web/` | **Production web console** (Next.js on Vercel) — the actual web app |
| `posterita-loyalty/` | Legacy loyalty Flask API + Zoho scripts (being retired) |
| `posterita-prototype/` | Latest interactive UI prototype (React JSX, 1,242 lines) |
| `specs/` | AI-optimized specification files (split from master plan v3.9) |
| `downloads-archive/` | Historical files, loose JSX prototypes, master plan PDF/MD |

## Stack

- **Android:** Kotlin, Gradle, Room, Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink payments
- **Backend:** NestJS modular monolith on Render, BullMQ workers, Redis (Phase 1 — not yet deployed)
- **Cloud Sync:** Vercel serverless functions at `posterita-cloud.vercel.app/api/` (current sync endpoint)
- **Web Console:** Next.js on Vercel (in `manus-retail-os/`)
- **Database:** Supabase Postgres (sole source of truth)
- **Media:** Cloudinary | **WhatsApp:** Meta Cloud API via SalesIQ | **Payments:** Blink SDK

## API Endpoints

- **Cloud Sync (current):** `https://posterita-cloud.vercel.app/api/` — Android syncs here
- **Legacy (being retired):** `https://my.posterita.com/posteritabo` — DO NOT USE
- **Loyalty (legacy):** `https://loyalty.posterita.com/api/` — Flask API, being migrated to NestJS
- **Backend (Phase 1):** TBD — NestJS on Render, will replace both legacy endpoints

## Key Architectural Rules

1. Android never talks to Supabase directly — all data flows through the backend API
2. Web console mutations go through the backend API — Supabase Realtime is for live updates only
3. One store per user per day — JWT carries store_id claim
4. Inventory count is scan-only — no manual data entry
5. Offline-first — every store-floor operation works without connectivity
6. Capability-driven UI — role-based, not hardcoded screen lists
7. Every mutation produces an audit event

## Working with Specs

Before working on any module, always read:
1. `specs/shared/architecture.md` — stack, boundaries, sync model
2. `specs/shared/data-model.md` — full Supabase schema
3. The relevant `specs/modules/XX-module-name.md`

For UI work, also read:
- `specs/ui/screens/screen-name.md` — layout and component spec
- `specs/ui/component-inventory.md` — what's built vs needed
- `specs/ui/design-system.md` — colors, typography, spacing tokens

## Brand Colors

- Primary: `#1976D2` (posterita_primary — blue)
- Primary Light: `#DCEBFF` (posterita_primary_light)
- Primary Dark: `#0D5DB3` (posterita_primary_dark)
- Secondary/Success: `#2E7D32` (posterita_secondary — green)
- Error: `#E53935` (posterita_error — red)
- Warning: `#F57F17` (posterita_warning — amber)
- Purple: `#5E35B1` (posterita_purple — loyalty/points)
- Background: `#F5F2EA` (posterita_bg — warm cream canvas)
- Paper: `#FFFFFF` (posterita_paper — cards/panels)
- Ink: `#141414` (posterita_ink — primary text)
- Muted: `#6C6F76` (posterita_muted — secondary text)
- Line: `#E6E2DA` (posterita_line — borders/dividers)

## Current Phase

Phase 0 — Android app cleanup, UI consistency, getting offline POS solid. (Nearly complete)
Next: Phase 1 — NestJS backend on Render + Supabase database.

## Navigation Architecture

- **Home screen:** Hub for all modules (POS, Orders, Settings, etc.)
- **POS drawer menu:** Only Home, Close Till, Logout (minimal — not a navigation hub)
- **Connectivity dot:** Green/red indicator in every top bar, tapping opens sync screen
- **Sync:** Automatic via CloudSyncWorker (5-min interval). Manual sync via connectivity dot.
- **About, Help:** Accessible from Settings screen, not from POS drawer
- **Logout:** From POS drawer or Settings
