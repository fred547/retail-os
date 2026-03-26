---
name: sync-check
description: Verify Android ↔ Web sync field mappings are consistent for a given entity
user-invocable: true
---

# Sync Check: Verify Android ↔ Web Field Mapping Consistency

Verify that sync field mappings are consistent between Android (Room entities + CloudSyncService) and the Web (sync API route + TypeScript types).

## Input
Optionally specify an entity name (e.g., "product", "order", "till"). If none specified, check ALL synced entities.

$ARGUMENTS

## Step 1: Identify Sync Entities
Read `pos-android/core/sync/src/main/java/com/posterita/pos/android/sync/CloudSyncService.kt` to find:
- All entities that are PULLED from server (master data)
- All entities that are PUSHED to server (transactional data)

## Step 2: For Each Synced Entity, Compare Three Sources

### Source A: Supabase (actual DB columns)
Read the migration file that creates/modifies the table.

### Source B: Android Room Entity
Read the entity class in `pos-android/core/database/src/main/java/com/posterita/pos/android/data/local/entity/`
Note: `@ColumnInfo(name = "snake_case")` annotations map to Supabase column names.

### Source C: Sync API Route
Read `pos-android/server-side/posterita-cloud/web/src/app/api/sync/route.ts` to see:
- What columns are selected in pull queries
- What fields are expected in push payloads
- How field names are mapped (camelCase ↔ snake_case)

### Source D: CloudSyncService
Read the sync service to see how JSON fields are mapped to Room entity fields.

## Step 3: Build Comparison Table

For each entity, produce a table:

| Supabase Column | Room Entity Field | Sync API (pull) | CloudSyncService (map) | Status |
|---|---|---|---|---|
| product_id | productId | ✓ | ✓ | OK |
| is_deleted | isDeleted | ✓ | ✓ | OK |
| new_column | — | — | — | MISSING |

## Step 4: Check Direction Rules
- Master data (product, category, tax, store, terminal, user): pull ONLY, never pushed
- Transactional data (order, till, customer, error_log, inventory_entry): push + pull
- Verify CloudSyncService respects these directions

## Step 5: Check Sync Hardening
- [ ] `insertOrUpdate()` uses `updated_at` for conflict detection
- [ ] Payload checksum computed for orders/tills
- [ ] Failed items stay unsynced via `syncErrorMessage`
- [ ] Retry with exponential backoff (5 retries, 30s→240s)

## Step 6: Report
List all mismatches found:
- Missing fields (in DB but not synced)
- Extra fields (synced but not in DB)
- Type mismatches (INTEGER vs TEXT, etc.)
- Direction violations (master data being pushed)
- Naming inconsistencies (camelCase vs snake_case mapping errors)

Fix any issues found immediately. Run builds after fixes.
