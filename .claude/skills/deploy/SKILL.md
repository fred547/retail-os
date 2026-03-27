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

### Version bump
9. Read current version from `pos-android/app/build.gradle` (grep for `versionCode` and `versionName`)
10. Increment `versionCode` by 1 and bump `versionName` patch version (e.g., 4.0.0 → 4.0.1)
11. Update `build.gradle` with the new values

### Deploy
12. Web: `cd pos-android/server-side/posterita-cloud/web && rm -rf .next && npx vercel --prod --yes --archive=tgz`
13. Android: `cd pos-android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`

### Publish APK to GitHub Releases
14. Create a new GitHub Release with the APK attached. The download link auto-updates:
```bash
cd pos-android
VERSION=$(grep 'versionName' app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
gh release create "v${VERSION}" \
  app/build/outputs/apk/debug/app-debug.apk \
  --title "Posterita Retail OS v${VERSION}" \
  --notes "Auto-release from deploy workflow" \
  --latest
```
The sidebar "Download POS App" link (`/api/download/android`) always points to the latest release automatically.

### Verify
15. Check system health: `curl -s https://web.posterita.com/api/monitor | python3 -m json.tool`
16. Check Render backend: `curl -s https://posterita-backend.onrender.com/health`
17. Report deployment URLs, version number, test results, and any errors
