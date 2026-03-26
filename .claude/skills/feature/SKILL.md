---
name: feature
description: Plan and scaffold a full feature using the three-layer rule (migration + API route + UI + tests)
user-invocable: true
---

# Feature: Full Three-Layer Implementation

You are implementing a new feature for Posterita Retail OS. Every feature MUST follow the **three-layer rule**: migration + API route + UI (web or Android).

## Input
The user will describe a feature: $ARGUMENTS

If they provide a spec file path, read it first.

## Step 1: Plan (MANDATORY — do NOT skip)
Before writing any code, create a plan covering:
1. **Database changes** — new tables, columns, constraints, indexes. List exact column names, types, defaults, nullability.
2. **API routes** — endpoints needed (method, path, request/response shape). Follow existing patterns in `/api/`.
3. **Web UI** — pages, components, forms needed. Follow UI Rules from CLAUDE.md.
4. **Android impact** — Room entity, DAO, sync field mapping, UI screens (if any).
5. **Test plan** — what tests to write (unit, scenario, E2E).
6. **CLAUDE.md updates** — what documentation needs updating after implementation.

Present this plan and get user approval before proceeding.

## Step 2: Migration (Database Layer)
1. Read the latest migration file number: `ls pos-android/server-side/posterita-cloud/supabase/migrations/ | tail -1`
2. Create the next numbered migration SQL file.
3. Create matching Room migration in `AppDatabase.kt` (add to BOTH `getInstance` AND `buildDedicated` — CRITICAL).
4. Create/update Room entity class if new table.
5. Create/update DAO if new table.
6. Create/update TypeScript types if needed.
7. Run `./gradlew compileDebugKotlin` to verify Android.
8. Run `npx tsc --noEmit` in web dir to verify TypeScript.

## Step 3: API Route
1. Create route file(s) in `web/src/app/api/`.
2. Use `createServerSupabaseAdmin()` for all DB operations (service role, bypasses RLS).
3. Always scope queries by `account_id`.
4. Log errors to `error_logs` table on failure.
5. Follow existing patterns — read a similar route first.
6. Run `npx tsc --noEmit` after each file.

## Step 4: Web UI
1. Create page(s) in `web/src/app/(dashboard)/`.
2. Follow UI Rules: List = Styled Cards, View = Detail Brochure, Edit = Section-based bottom sheet, Create = Wizard.
3. Add error.tsx boundary if it's a new route group.
4. Add to sidebar navigation if it's a top-level page.
5. Run `npx tsc --noEmit` after each file.

## Step 5: Sync (if Android needs the data)
1. Update `CloudSyncService` field mapping for new/changed entities.
2. Update sync API route to include new data in pull response.
3. Verify push/pull directions match Rule 2 (server is source of truth for master data).

## Step 6: Tests
1. Write web unit tests for new API routes.
2. Write scenario tests for the full workflow.
3. Run all tests: `cd web && npx vitest run`
4. Fix any failures before moving on.

## Step 7: Documentation
1. Update CLAUDE.md: API routes table, web routes table, DB column reference, phase status.
2. Update test-data.ts if test counts changed.

## Quality Gates (enforce at every step)
- TypeScript: 0 errors after every file edit
- Kotlin: compiles after every Room/entity change
- No hardcoded IDs — use UUIDs with prefixes for tests
- **EVERY API route MUST log errors to `error_logs` table** — wrap route body in try/catch, on failure insert to `error_logs` with account_id, severity, tag, message, stack_trace, device_info="web-api". Use helper pattern: `async function logToErrorDb(accountId, tag, message, stack?)`. Never just `console.error` or return 500 without also logging to DB. This is Rule 8 — non-negotiable.
- **EVERY catch block in sync logic** must also log to `error_logs` — sync errors that only go to the `errors[]` response array are invisible in the platform error dashboard.
- No `console.error` or `console.warn` without also logging to error_logs
- No PostgREST FK joins
- All queries scoped by account_id
- Soft delete for key tables (is_deleted + deleted_at)
