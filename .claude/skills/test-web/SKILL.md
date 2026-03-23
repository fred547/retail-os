# Web Console Production Test

Full test suite for the Posterita web console. Run before any production deploy.

## Trigger
User says: `/test-web`, "test the web console", "web console ready for production?"

## Execution Plan

Run all steps sequentially. Report results as a table at the end.

### Step 1: TypeScript Check
```bash
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit 2>&1 | tail -10
```
Must show 0 errors.

### Step 2: Build Check
```bash
cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npm run build 2>&1 | tail -20
```
Must show "Compiled successfully". Count total routes.

### Step 3: Vitest Unit Tests (156 tests)
```bash
cd pos-android/server-side/posterita-cloud/web && npm test 2>&1 | tail -15
```
Report: X passed, Y failed, Z skipped.

### Step 4: Playwright E2E Tests (45 tests)
```bash
cd pos-android/server-side/posterita-cloud/web
NEXT_PUBLIC_SUPABASE_URL="https://ldyoiexyqvklujvwcaqq.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeW9pZXh5cXZrbHVqdndjYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc2MjE2OCwiZXhwIjoyMDg5MzM4MTY4fQ.hDzw0w2ZCxwAjfU9LINoLChV9EW-oe0Zc2yogIzWCJc" \
E2E_TEST_PASSWORD="E2E_Test_Pw_2026!" \
npx playwright test 2>&1 | tail -20
```
Report: X passed, Y failed, Z skipped.

### Step 5: API Health (production endpoints)
```bash
# Sync API
curl -s -o /dev/null -w "%{http_code}" -X POST https://web.posterita.com/api/sync -H "Content-Type: application/json" -d '{}'

# Signup API
curl -s -o /dev/null -w "%{http_code}" -X POST https://web.posterita.com/api/auth/signup -H "Content-Type: application/json" -d '{}'

# Data API (should 401)
curl -s -o /dev/null -w "%{http_code}" -X POST https://web.posterita.com/api/data -H "Content-Type: application/json" -d '{"table":"product"}'

# Monitor
curl -s "https://web.posterita.com/api/monitor" | python3 -m json.tool
```

### Step 6: Supabase Health
```bash
curl -s "https://ldyoiexyqvklujvwcaqq.supabase.co/rest/v1/" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeW9pZXh5cXZrbHVqdndjYXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjIxNjgsImV4cCI6MjA4OTMzODE2OH0.ai7vZMotuTus9idWvSlQ_ayo2VpKCZzollBoRzO1w0k" \
  -o /dev/null -w "%{http_code}"
```
Must return 200.

### Step 7: Render Backend Health
```bash
curl -s "https://posterita-backend.onrender.com/health"
```

## Output Format

```
## Web Console Production Readiness

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅/❌ | 0 errors / N errors |
| Build | ✅/❌ | X routes compiled |
| Unit Tests | ✅/❌ | X/Y passed |
| E2E Tests | ✅/❌ | X/Y passed |
| API Health | ✅/❌ | sync=400, signup=400, data=401 |
| Supabase | ✅/❌ | reachable/down |
| Render | ✅/❌ | healthy/down |

**Verdict: READY FOR PRODUCTION / BLOCKED — fix N issues**
```

If ANY check has failures, list the specific failures and recommend fixes.
