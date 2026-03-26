---
name: review
description: Quality gate — review recent changes for security, schema drift, sync gaps, and error handling
user-invocable: true
---

# Review: Quality Gate for Recent Changes

Perform a thorough quality review of all uncommitted or recently committed changes. This is the "measure twice, cut once" check before shipping.

## Step 1: Gather Changes
```bash
git diff --stat HEAD~${1:-1}  # Default: review last 1 commit. Pass number as argument.
git diff --stat               # Also check uncommitted changes
```

$ARGUMENTS

Read every changed file in full.

## Step 2: Schema Consistency (if any DB changes)
- [ ] Supabase migration column names match Room entity field names (accounting for @ColumnInfo annotations)
- [ ] Supabase migration column names match TypeScript types
- [ ] Room migration added to BOTH `getInstance()` AND `buildDedicated()` in AppDatabase.kt
- [ ] Room version incremented
- [ ] Entity added to `@Database(entities = [...])` if new table
- [ ] DAO abstract method added to AppDatabase if new DAO
- [ ] `account_id` present on every new table
- [ ] RLS enabled on new Supabase tables

## Step 3: Sync Consistency (if any sync changes)
- [ ] New fields mapped in CloudSyncService (both push and pull directions)
- [ ] Master data flows server→device only (Rule 2)
- [ ] Transactional data (orders, tills, customers) are the only things pushed
- [ ] Sync API route updated to include new data in response

## Step 4: Security (OWASP Top 10)
- [ ] No SQL injection — parameterized queries only, no string concatenation
- [ ] No XSS — user input sanitized/escaped in React JSX (React auto-escapes, but check dangerouslySetInnerHTML)
- [ ] No secrets in code — no API keys, passwords, tokens hardcoded
- [ ] Auth checked — routes verify session/account_id before DB operations
- [ ] No command injection — user input never passed to exec/spawn
- [ ] account_id scoping — every query filters by account_id (multi-tenant isolation)
- [ ] Service role key used server-side only — never exposed to client

## Step 5: Error Handling
- [ ] No silent catch blocks — all errors logged to error_logs table
- [ ] No bare `console.error` without also calling error logger
- [ ] API routes return proper HTTP status codes (400/401/404/500)
- [ ] Server component pages have error.tsx boundaries
- [ ] Android uses AppErrorLogger, not Log.e()

## Step 6: Code Quality
- [ ] No unused imports or variables
- [ ] No hardcoded IDs (use dynamic lookups)
- [ ] No duplicate code that should be extracted
- [ ] Function/variable names are clear and descriptive
- [ ] No over-engineering — changes are scoped to what was requested

## Step 7: Build Verification
```bash
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit
cd pos-android && ./gradlew compileDebugKotlin  # Only if Kotlin files changed
```

## Step 8: Test Verification
```bash
cd pos-android/server-side/posterita-cloud/web && npx vitest run  # If web files changed
cd pos-android && ./gradlew testDebugUnitTest                     # If Android files changed
```

## Output Format
Report findings as:

### CRITICAL (must fix before merge)
- ...

### HIGH (should fix before merge)
- ...

### MEDIUM (fix soon)
- ...

### LOW (nice to have)
- ...

### PASSED
- List of checks that passed cleanly

If there are CRITICAL or HIGH issues, fix them immediately. Do not just report — fix.
