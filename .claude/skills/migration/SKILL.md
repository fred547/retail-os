---
name: migration
description: Create a cross-platform migration across Supabase SQL + Android Room + TypeScript types in lockstep
user-invocable: true
---

# Migration: Cross-Platform Schema Change

Create a database migration that stays consistent across all three layers: Supabase (SQL), Android (Room), and Web (TypeScript).

## Input
The user describes what schema changes are needed: $ARGUMENTS

## Step 1: Verify Current State
1. Read the latest Supabase migration: `ls pos-android/server-side/posterita-cloud/supabase/migrations/ | tail -3`
2. Read `AppDatabase.kt` to check current Room version and migration count.
3. If modifying an existing table, read the original migration that created it AND the current Room entity.

## Step 2: Create Supabase Migration
1. Create file: `pos-android/server-side/posterita-cloud/supabase/migrations/NNNNN_descriptive_name.sql`
2. Use `CREATE TABLE IF NOT EXISTS` for new tables.
3. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns.
4. Add RLS policy if new table: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
5. Add indexes for columns used in WHERE clauses or JOINs.
6. Add `account_id TEXT NOT NULL` to every new table (tenant scoping).
7. Use snake_case for all column names.

## Step 3: Create Room Migration
1. In `AppDatabase.kt`, increment the version number.
2. Add a new `MIGRATION_X_Y` object with the equivalent SQL.
3. **CRITICAL**: Add the migration to BOTH `getInstance().addMigrations()` AND `buildDedicated().addMigrations()`. Missing either causes crashes.
4. If new table: create Entity class in `pos-android/core/database/src/main/java/com/posterita/pos/android/data/local/entity/`
5. If new table: create DAO in `pos-android/core/database/src/main/java/com/posterita/pos/android/data/local/dao/`
6. If new table: add abstract DAO getter in `AppDatabase`.
7. If new table: add entity to `@Database(entities = [...])` annotation.
8. Run `cd pos-android && ./gradlew compileDebugKotlin` — must pass.

## Step 4: Create/Update TypeScript Types
1. If new table: add type interface in the relevant web source file.
2. Verify column names match Supabase exactly (snake_case).
3. Verify types match: `TEXT` → `string`, `INTEGER` → `number`, `REAL` → `number`, `BOOLEAN` → `boolean`.
4. Run `cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit` — must pass.

## Step 5: Update CLAUDE.md
1. Update migration range if it changed (e.g., "00001–00032" → "00001–00033").
2. Update Room version if it changed.
3. Update entity/DAO counts if new table added.
4. Add new table to DB Column Reference section.
5. Update migration count in both Repository Map and Module Architecture sections.

## Step 6: Cross-Check
Run `/sync-check` mentally — verify:
- Column names identical across Supabase, Room entity, and TypeScript type
- Types are compatible (Room uses INTEGER for booleans, Supabase uses BOOLEAN)
- Nullability matches (Room `DEFAULT` vs Supabase `DEFAULT` vs TypeScript optional `?`)
- No camelCase in Supabase, no snake_case in Room entities (they use annotations)

## Anti-patterns to avoid
- Never assume column names — always verify against actual DB
- Never use `owner_id` — the PK is `id` on the owner table
- Never add `store_id` to `pos_user` — it doesn't have one
- Never forget `account_id` on new tables
- Never use PostgREST FK joins
