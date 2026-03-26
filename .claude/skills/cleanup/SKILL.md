---
name: cleanup
description: Post-feature consistency check — verify CLAUDE.md, test counts, schema refs, dead code, build cleanliness
user-invocable: true
---

# Cleanup: Post-Feature Consistency Check

After implementing a feature, verify everything is consistent and nothing was forgotten.

## Step 1: CLAUDE.md Accuracy
Read CLAUDE.md and verify these sections are up to date:

### Repository Map
- [ ] Entity count matches `@Database(entities = [...])` in AppDatabase.kt
- [ ] DAO count matches abstract methods in AppDatabase.kt
- [ ] Migration count matches actual MIGRATION_X_Y objects
- [ ] Supabase migration range matches actual files in `supabase/migrations/`

### Module Architecture
- [ ] Room schema version matches `version = N` in `@Database` annotation
- [ ] Migration count matches

### Stack & URLs
- [ ] Room version matches actual

### Web Console Routes
- [ ] All routes in `web/src/app/(dashboard)/` are listed
- [ ] Platform tab count matches `ALL_TABS` in PlatformTabs.tsx

### API Routes
- [ ] All routes in `web/src/app/api/` are listed
- [ ] Methods and descriptions are accurate

### DB Column Reference
- [ ] New tables are documented
- [ ] Modified tables have updated column lists
- [ ] Common mistakes section updated if applicable

### Current Phase
- [ ] Completed features marked with checkmark
- [ ] Current phase marker is correct
- [ ] Phase 3 priorities list reflects actual status

### Test Counts
- [ ] Web unit test count matches: `find src/__tests__/api -name "*.test.ts" | wc -l`
- [ ] Scenario test count matches: `find src/__tests__/scenarios -name "*.test.ts" | wc -l`
- [ ] test-data.ts matches actual test counts

## Step 2: Build Cleanliness
```bash
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit 2>&1 | head -5
cd pos-android && ./gradlew compileDebugKotlin 2>&1 | tail -5
```
Both must pass with zero errors.

## Step 3: Test Passage
```bash
cd pos-android/server-side/posterita-cloud/web && npx vitest run 2>&1 | tail -20
```
All tests must pass. If any fail, fix them.

## Step 4: Dead Code Check
- [ ] No unused imports in changed files
- [ ] No commented-out code blocks left behind
- [ ] No TODO comments without a tracking issue
- [ ] No orphaned test files for deleted features

## Step 5: Schema Drift
- [ ] Room entity fields match Supabase columns for any touched tables
- [ ] TypeScript types match Supabase columns for any touched tables
- [ ] buildDedicated() has same migrations as getInstance() in AppDatabase.kt

## Step 6: Git Hygiene
```bash
git status
git diff --stat
```
- [ ] No unintended file changes
- [ ] No secrets or .env files staged
- [ ] tsconfig.tsbuildinfo is gitignored or expected to change

## Output
Report what was checked and any issues found. Fix all issues before reporting "clean".
