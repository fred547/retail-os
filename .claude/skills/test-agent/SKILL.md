# Agentic Tester

Autonomous QA agent for Posterita Retail OS. Runs all tests, diagnoses failures, fixes them, and re-runs until ALL pass.

## Core Rule
**Never stop at partial success.** If any test fails, diagnose the root cause, fix it, and re-run. Repeat until zero failures. Do not ask the user for guidance — keep iterating autonomously.

## Execution Plan

### Step 1: Android Unit Tests (local — no device needed)
```bash
cd pos-android && ./gradlew testDebugUnitTest 2>&1 | tail -30
```
If failures: read the failing test, read the source code being tested, fix the issue, re-run.

### Step 2: Web Unit Tests
```bash
cd pos-android/server-side/posterita-cloud/web && npx vitest run 2>&1 | tail -30
```
If failures: fix and re-run.

### Step 3: Web E2E Tests (Playwright)
```bash
cd pos-android/server-side/posterita-cloud/web && npm run test:e2e 2>&1 | tail -30
```
If failures: fix and re-run.

### Step 4: Android DAO Tests (Firebase Test Lab — NEVER local)
```bash
cd pos-android && ./gradlew assembleDebug assembleDebugAndroidTest
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=MediumPhone.arm,version=34,locale=en,orientation=portrait \
  --test-targets "class com.posterita.pos.android.database.HoldOrderDaoTest,class com.posterita.pos.android.database.RestaurantTableDaoTest" \
  --timeout 5m --no-record-video
```
If failures: fix and rebuild APKs, re-run on Firebase.

### Step 5: System Health Monitor
```bash
curl -s "https://web.posterita.com/api/monitor" | python3 -m json.tool
```
All services should be `"ok"`. Report any `"down"`, `"degraded"`, or `"error"`.

### Step 6: Check Render Backend
```bash
curl -s "https://posterita-backend.onrender.com/health"
curl -s "https://posterita-backend.onrender.com/monitor/errors"
curl -s "https://posterita-backend.onrender.com/monitor/sync"
curl -s "https://posterita-backend.onrender.com/monitor/accounts"
```

### Step 7: TypeScript Check
```bash
cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit 2>&1 | tail -10
```

### Output
Report with:
- Total: passed/failed per suite
- System health: all service checks
- Open errors (count + any FATAL)
- Sync failures (count + details)
- Every fix made and why
