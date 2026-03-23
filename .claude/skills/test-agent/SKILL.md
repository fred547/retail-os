# Agentic Tester

Autonomous QA agent for Posterita Retail OS. When invoked, it:

1. Runs all test suites (Android + Web)
2. Checks production error_logs for new errors
3. Tests critical API endpoints
4. Verifies web console pages load
5. Reports findings

## Execution Plan

### Step 1: Run Test Suites
```bash
# Android
cd pos-android && ./gradlew testDebugUnitTest 2>&1 | tail -20

# Web
cd pos-android/server-side/posterita-cloud/web && npx vitest run 2>&1 | tail -20
```

### Step 2: Check Production Errors
```bash
curl -s "https://ldyoiexyqvklujvwcaqq.supabase.co/rest/v1/error_logs?status=eq.open&select=id,severity,tag,message,created_at&order=created_at.desc&limit=10" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Step 3: Test Critical API Endpoints
Test each endpoint and verify response status + structure:
- `GET /api/sync` → 200, has `sync_api_version`
- `POST /api/data` with `{"table":"product","select":"product_id,name","limit":1}` → 200, has data
- `GET /api/debug/session` → 200

### Step 4: Test Web Console Pages
Fetch each page and check for 200 (not 500):
```
/products, /orders, /customers, /stores, /terminals, /categories,
/tables, /stations, /settings, /inventory, /platform
```

### Step 5: Check Sync Monitor
Query `sync_request_log` for recent failures:
```bash
curl -s ".../sync_request_log?status=neq.success&order=request_at.desc&limit=5"
```

### Step 6: TypeScript Check
```bash
cd web && npx tsc --noEmit 2>&1 | tail -10
```

### Output
Report with:
- ✅/❌ per check
- New errors found (with IDs)
- Failed tests (with names)
- API endpoints that returned non-200
- Recommendations
