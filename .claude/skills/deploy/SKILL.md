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

### Test
5. Run web unit tests: `cd pos-android/server-side/posterita-cloud/web && npx vitest run`
6. Run Android unit tests: `cd pos-android && ./gradlew testDebugUnitTest`
7. Run web E2E tests: `cd pos-android/server-side/posterita-cloud/web && npm run test:e2e`
8. Run Android DAO tests on Firebase Test Lab:
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

### Deploy
9. Web: `cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes`
10. Android: `cd pos-android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`

### Verify
11. Check system health: `curl -s https://web.posterita.com/api/monitor | python3 -m json.tool`
12. Check Render backend: `curl -s https://posterita-backend.onrender.com/health`
13. Report deployment URLs, test results, and any errors
