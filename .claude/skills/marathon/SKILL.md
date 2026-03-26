---
name: marathon
description: Autonomous feature marathon — implements Phase 3 features one by one with full quality workflow, commits each, zero interruption
user-invocable: true
---

# Marathon: Autonomous Feature Implementation

You are running an autonomous development marathon. Implement Phase 3 features one by one, following the full quality workflow for each. Work until context runs out or all features are done. **Do NOT ask the user for approval — they are sleeping.**

## Input
Optional: specify which features or how many. Default: pick the next undone features from Phase 3 priorities.

$ARGUMENTS

## Rules
1. **Never ask the user anything.** Make all decisions autonomously. If uncertain, pick the safer/simpler option.
2. **Commit after EACH feature.** Never batch multiple features into one commit. If something breaks, the last good commit is safe.
3. **Skip blocked features.** If a feature requires external setup (phone numbers, SDK keys, hardware), skip it and move to the next.
4. **Stop cleanly.** If you sense context is getting long, finish the current feature, commit, and stop. Don't start a feature you can't finish.
5. **Fix errors immediately.** If a build or test fails, fix it before moving on. Never leave broken state.
6. **Log progress.** After each feature, update CLAUDE.md Phase 3 status.

## Workflow Per Feature

For each feature, execute these steps IN ORDER:

### Step 1: Pick Next Feature
Read CLAUDE.md "Phase 3 Priorities" section. Find the first item NOT marked ✅. Skip items marked as blocked.

### Step 2: Plan (internal — don't ask user)
Think through:
- What tables/columns are needed?
- What API routes?
- What web UI changes?
- What Android sync impact?
- Read existing similar code for patterns before writing new code.

### Step 3: Implement (three-layer rule)

**Layer 1 — Database:**
1. Create Supabase migration file (next number after latest in `supabase/migrations/`)
2. Add Room migration to AppDatabase.kt — BOTH `getInstance` AND `buildDedicated`
3. Increment Room version
4. Update entity if existing table, create entity+DAO if new table
5. `cd pos-android && ./gradlew compileDebugKotlin` — MUST pass

**Layer 2 — API:**
1. Create route files in `web/src/app/api/`
2. Use `createServerSupabaseAdmin()` / `getDb()` for DB access
3. Always check `getSessionAccountId()` first (auth)
4. Always scope by `account_id` (multi-tenant)
5. **EVERY route must log errors to `error_logs` table** — wrap in try/catch, insert on failure
6. `cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit` — MUST pass

**Layer 3 — Web UI:**
1. Create/update pages in `web/src/app/(dashboard)/`
2. Follow UI Rules: List=Cards, View=Brochure, Edit=Bottom Sheet, Create=Wizard
3. `npx tsc --noEmit` — MUST pass

**Sync (if needed):**
1. Update CloudSyncService mapTo* function for new fields
2. Sync pull uses `select("*")` — new columns auto-included
3. Only add push mapping for transactional data (Rule 2)

### Step 4: Tests
1. Write unit tests for new API routes
2. Write scenario test (next number after latest in `__tests__/scenarios/`)
3. `npx vitest run src/__tests__/api/<new-test>.test.ts` — MUST pass
4. If test fails, fix and re-run. Do NOT move on with failing tests.

### Step 5: Review (self-review)
Quick self-check:
- [ ] Room migration in BOTH getInstance AND buildDedicated?
- [ ] account_id on every new table?
- [ ] RLS enabled on new tables?
- [ ] Error logging in every API route catch block?
- [ ] No console.error without error_logs insert?
- [ ] All queries scoped by account_id?
- [ ] TypeScript: 0 errors?
- [ ] Android: compiles?

### Step 6: Update Documentation
1. CLAUDE.md: migration range, Room version, API routes table, DB column reference, phase status (mark ✅)
2. test-data.ts: update test counts if changed

### Step 7: Commit
```bash
git add <specific files>
git commit -m "<descriptive message>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Step 8: Next Feature
Go back to Step 1. Pick the next undone feature.

## Feature Priority Order (from CLAUDE.md Phase 3)

1. ~~MRA e-invoicing~~ ✅
2. ~~Stock deduction on sale~~ ✅
3. **Customer loyalty** — wallet, points, award on purchase, redeem at POS
4. **Z-report / daily summary** — end-of-day totals by payment type, tax, discount, voids
5. ~~WhatsApp receipt sharing~~ BLOCKED (needs phone + Meta verification) — SKIP
6. **Supplier & Purchase Orders** — supplier table, PO creation, GRN, cost tracking
7. **Promotions engine** — auto-apply, time-based, buy-X-get-Y, promo codes (COMPLEX — may skip if context low)
8. ~~Catalogue PDF~~ ✅
9. **Peach Payments SDK** — BLOCKED (needs SDK access) — SKIP
10. **Menu scheduling** — breakfast/lunch/dinner by time of day
11. **Delivery tracking** — driver assignment, delivery status
12. **Shift clock in/out** — staff time tracking

## Context Management

Each feature typically uses 50-100K tokens. With 1M context:
- **Safe:** 3-4 features
- **Stretch:** 5-6 features
- **Stop signal:** If you're past feature #4 and responses feel slow, finish current and stop

After each commit, briefly assess: "Do I have enough context for one more feature?" If yes, continue. If uncertain, stop.

## Output

After completing all features (or stopping), write a summary:

```
## Marathon Results
- Feature X: ✅ committed (hash)
- Feature Y: ✅ committed (hash)
- Feature Z: ⏭️ skipped (blocked)
- Stopped after N features (context limit)
```
