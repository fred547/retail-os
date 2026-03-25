# Schema Drift Audit

Detect mismatches between Supabase DB schema, Android Room entities, and TypeScript types.

## Trigger
User says: `/schema-audit`, "check schema", "audit schema drift"

## Steps

### 1. Read Supabase Schema (source of truth)
Read all migration files in `pos-android/server-side/posterita-cloud/supabase/migrations/` to understand the canonical schema.

### 2. Read Android Room Entities
Read all entity files in `pos-android/app/src/main/java/com/posterita/pos/android/data/local/entity/`.
Also read `AppDatabase.kt` for migration definitions.

### 3. Read TypeScript Types
Read any shared type files in the web project. Also check API route parameter handling in `pos-android/server-side/posterita-cloud/web/src/app/api/`.

### 4. Compare and Report
For each table, compare all three sources and flag:
- **Column type mismatches** (INT vs TEXT, especially `account_id`)
- **Enum case differences** (`Admin` vs `admin`, `Y` vs `true`)
- **Missing fields** (field exists in DB but not in entity/type, or vice versa)
- **Nullable vs non-nullable differences**
- **Field name discrepancies** (camelCase vs snake_case)
- **Default value mismatches** (Room entity default vs DB default)
- **Missing FK handling** (dropped cross-tenant FKs)

### 5. Fix Mismatches
For each mismatch, align the code with Supabase schema as the source of truth.
Run both web (`tsc --noEmit`) and Android (`./gradlew compileDebugKotlin`) builds to confirm fixes compile.

### Output
Table showing: | Table | Field | Supabase | Android | TypeScript | Status |
