# Posterita Retail OS

Unified retail management platform: one Android app, one web console, one NestJS backend, one Supabase database.

## Repository Map

| Directory | What it is |
|-----------|-----------|
| `pos-android/` | Production Android POS app (Kotlin, Gradle, Hilt, Room) — 58 Activities, offline-first |
| `manus-retail-os/` | NestJS backend + Next.js web console prototype (React+TS, tRPC, Drizzle) |
| `manus-retail-os-prototype/` | Earlier Manus prototype variant |
| `posterita-loyalty/` | Legacy loyalty Flask API + Zoho scripts (being retired) |
| `posterita-prototype/` | Latest interactive UI prototype (React JSX, 1,242 lines) |
| `specs/` | AI-optimized specification files (split from master plan v3.9) |
| `downloads-archive/` | Historical files, loose JSX prototypes, master plan PDF/MD |

## Stack

- **Android:** Kotlin, Gradle, Room, Hilt, Coroutines, Retrofit, WorkManager, ZXing, Blink payments
- **Backend:** NestJS modular monolith on Render, BullMQ workers, Redis
- **Web Console:** Next.js on Vercel
- **Database:** Supabase Postgres (sole source of truth)
- **Media:** Cloudinary | **WhatsApp:** Meta Cloud API via SalesIQ | **Payments:** Blink SDK

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

- Primary: `#007AFF` (posterita_primary)
- Secondary/Success: `#34C759`
- Error: `#FF3B30`
- Warning: `#FF9500`

## Current Phase

Phase 0 — Android app cleanup, UI consistency, getting offline POS solid.
Next: Phase 1 — NestJS backend on Render + Supabase database.
