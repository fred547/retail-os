# Agentic Tester

Autonomous QA agent for Posterita Retail OS. Runs 641 tests across 4 layers + checks production health.

## Execution Plan

### Step 1: Run Unit Tests
```bash
# Android (419 tests, 21 files)
cd pos-android && ./gradlew testDebugUnitTest 2>&1 | tail -20

# Web (156 tests, 13 files)
cd pos-android/server-side/posterita-cloud/web && npx vitest run 2>&1 | tail -20
```

### Step 2: Run Smoke Tests (hits production)
```bash
cd pos-android/server-side/posterita-cloud/web

# Vercel + Supabase (42 tests)
SUPABASE_SERVICE_ROLE_KEY="$KEY" npx vitest run src/__tests__/api/smoke-test.test.ts

# Render backend (16 tests)
SUPABASE_SERVICE_ROLE_KEY="$KEY" npx vitest run src/__tests__/api/render-backend.test.ts
```

### Step 3: System Health Monitor
```bash
curl -s "https://web.posterita.com/api/monitor" | python3 -m json.tool
```
Checks: Supabase, Render backend, error monitor, sync monitor, Vercel sync API.
All should be `"ok"`. Report any `"down"`, `"degraded"`, or `"error"`.

### Step 4: Check Production Errors
```bash
curl -s "https://ldyoiexyqvklujvwcaqq.supabase.co/rest/v1/error_logs?status=eq.open&select=id,severity,tag,message,created_at&order=created_at.desc&limit=10" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Step 5: Check Render Backend Health
```bash
curl -s "https://posterita-backend.onrender.com/health"
curl -s "https://posterita-backend.onrender.com/monitor/errors"
curl -s "https://posterita-backend.onrender.com/monitor/sync"
curl -s "https://posterita-backend.onrender.com/monitor/accounts"
```

### Step 6: Check Sync Health
```bash
curl -s "https://ldyoiexyqvklujvwcaqq.supabase.co/rest/v1/sync_request_log?status=neq.success&order=request_at.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Step 7: TypeScript Check
```bash
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit 2>&1 | tail -10
```

### Step 8: ADB Device Test (if device connected)
```bash
cd pos-android && ./scripts/adb-smoke-test.sh
```

### Output
Report with:
- ✅/❌ per step
- Test counts: passed/failed per suite
- System health: all 5 service checks
- Open errors (count + any FATAL)
- Sync failures (count + details)
- Render backend uptime + response time
- Recommendations for anything failing
