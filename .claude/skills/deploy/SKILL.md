# Deploy Workflow

## Trigger
User says: `/deploy`, "deploy to production", "ship it"

## Steps

### Pre-flight checks
1. Kill any stale build processes: `pkill -f 'next build' || true`
2. Run TypeScript check: `cd pos-android/server-side/posterita-cloud/web && npx tsc --noEmit` — fix ALL errors before proceeding
3. Run Android compile check: `cd pos-android && ./gradlew compileDebugKotlin` — fix ALL errors before proceeding

### Schema drift check
4. Compare Supabase migration files, Android Room entities, and TypeScript types for any mismatches (INT vs TEXT, field name casing, missing fields). Flag and fix any drift before deploying.

### Test — ALL suites must pass before deploying (BLOCKING)

5. **Web unit tests** (includes POS smoke test, API mocks, IndexedDB schema validation):
```bash
cd pos-android/server-side/posterita-cloud/web && npx vitest run
```
Must show 0 failed, 0 errors. Skipped scenario tests (need service key) are OK.

6. **Android unit tests**:
```bash
cd pos-android && ./gradlew testDebugUnitTest
```

7. **Web E2E tests** (Playwright against production):
```bash
cd pos-android/server-side/posterita-cloud/web && npm run test:e2e
```

8. **Scenario tests** (journey tests against production Supabase):
```bash
cd pos-android/server-side/posterita-cloud/web
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeW9pZXh5cXZrbHVqdndjYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc2MjE2OCwiZXhwIjoyMDg5MzM4MTY4fQ.hDzw0w2ZCxwAjfU9LINoLChV9EW-oe0Zc2yogIzWCJc" \
npm run test:scenarios
```

9. **Firebase Test Lab** (DAO + UI tests, 106 tests across 10 classes):
```bash
cd pos-android && ./gradlew assembleDebug assembleDebugAndroidTest

# Batch 1: DAO tests (fast, 32 tests, 2 min)
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=MediumPhone.arm,version=34,locale=en,orientation=portrait \
  --test-targets "class com.posterita.pos.android.database.HoldOrderDaoTest,class com.posterita.pos.android.database.RestaurantTableDaoTest" \
  --timeout 5m --no-record-video

# Batch 2: UI tests (74 tests, ~13 min — run in background)
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=MediumPhone.arm,version=34,locale=en,orientation=portrait \
  --test-targets "class com.posterita.pos.android.ui.HomeScreenTest,class com.posterita.pos.android.ui.POSFlowTest,class com.posterita.pos.android.ui.NavigationFlowTest,class com.posterita.pos.android.ui.SettingsFlowTest,class com.posterita.pos.android.ui.RestaurantModeTest,class com.posterita.pos.android.ui.EdgeCaseTest,class com.posterita.pos.android.ui.LoginFlowTest,class com.posterita.pos.android.ui.SignupFlowTest" \
  --timeout 15m
```
Note: LoginFlowTest (3) and SignupFlowTest (4) may fail on fresh cloud devices without pre-seeded credentials — this is expected.

**If ANY test fails → fix it before deploying. Do NOT deploy with failures.**

### Version bump
10. Read current version from `pos-android/app/build.gradle` (grep for `versionCode` and `versionName`)
11. Increment `versionCode` by 1 and bump `versionName` patch version (e.g., 4.0.0 → 4.0.1)
12. Update `build.gradle` with the new values

### Deploy
13. Web: `cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes --archive=tgz`
14. Android: `cd pos-android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`

### Publish APK to GitHub Releases
15. Create a new GitHub Release with the APK attached:
```bash
cd pos-android
VERSION=$(grep 'versionName' app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
gh release create "v${VERSION}" \
  app/build/outputs/apk/debug/app-debug.apk \
  --title "Posterita Retail OS v${VERSION}" \
  --notes "Auto-release from deploy workflow" \
  --latest
```

### Verify
16. Check system health: `curl -s https://web.posterita.com/api/monitor | python3 -m json.tool`
17. Check Render backend: `curl -s https://posterita-backend.onrender.com/health`
18. Check DB errors: `curl` the error_logs table for any new open errors since deploy
19. Report: deployment URLs, version number, all test results, any errors
