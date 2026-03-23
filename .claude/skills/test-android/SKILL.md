# Android Production Test

Full test suite for the Posterita Android POS app. Run before any production deploy.

## Trigger
User says: `/test-android`, "test android", "android ready for production?"

## Prerequisites
- Emulator running: `adb devices` must show a device
- If no device: `emulator -avd Medium_Phone -dns-server 8.8.8.8 &` and wait 20s

## Execution Plan

Run all steps sequentially. Report results as a table at the end.

### Step 1: Lint / Compile Check
```bash
cd pos-android && ./gradlew assembleDebug 2>&1 | grep -E "e:|BUILD"
```
Must show BUILD SUCCESSFUL with 0 errors.

### Step 2: Unit Tests
```bash
cd pos-android && ./gradlew testDebugUnitTest 2>&1 | tail -20
```
Report: X passed, Y failed.

### Step 3: Install on Device
```bash
adb install -r pos-android/app/build/outputs/apk/debug/app-debug.apk 2>&1
```
Must show "Success".

### Step 4: App Launch Test
```bash
# Clear logcat
adb logcat -c

# Launch app
adb shell am start -n com.posterita.pos.android/.ui.activity.SplashActivity

# Wait for launch
sleep 5

# Check for crashes
adb logcat -d | grep -E "FATAL|AndroidRuntime|crash" | head -5
```
Must show no FATAL exceptions.

### Step 5: Activity Stack Test
```bash
# Check which activity is on top
adb shell dumpsys activity activities | grep -E "mResumedActivity|topActivity" | head -3
```
Should show SetupWizardActivity (fresh install), HomeActivity (existing account), or LockScreenActivity (PIN set).

### Step 6: Network Connectivity Test
```bash
# Verify DNS works
adb shell ping -c 1 -W 3 web.posterita.com

# Verify API reachable from device
adb shell am start -a android.intent.action.VIEW -d "https://web.posterita.com/api/monitor"
```

### Step 7: Sync Test (if account exists)
```bash
# Check shared prefs for account
adb shell "run-as com.posterita.pos.android ls /data/data/com.posterita.pos.android/shared_prefs/"

# Check Room databases exist
adb shell "run-as com.posterita.pos.android ls /data/data/com.posterita.pos.android/databases/" 2>&1 | grep "POSTERITA_LITE_DB"

# Trigger sync and check logs
adb logcat -c
sleep 10
adb logcat -d | grep -E "CloudSync|Sync complete|Sync failed" | tail -10
```

### Step 8: Firebase Test Lab (if configured)
```bash
cd pos-android
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ] && command -v gcloud &>/dev/null; then
  gcloud firebase test android run \
    --type instrumentation \
    --app app/build/outputs/apk/debug/app-debug.apk \
    --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
    --device model=MediumPhone.arm,version=34 \
    --timeout 15m \
    --results-dir "e2e-$(date +%s)" 2>&1 | tail -20
else
  echo "SKIP: Firebase Test Lab not configured (gcloud not found or APK missing)"
fi
```

### Step 9: APK Size Check
```bash
ls -lh pos-android/app/build/outputs/apk/debug/app-debug.apk | awk '{print $5}'
```
Report size. Flag if > 50MB.

### Step 10: Post Results to Platform
After all steps complete, post the results to the `ci_report` table in Supabase so the Platform Tests tab shows them. Read the Supabase URL and service role key from `.env.local`:

```bash
cd pos-android/server-side/posterita-cloud/web
source .env.local 2>/dev/null

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  VERSION=$(cd /path/to/pos-android && git rev-parse --short HEAD)
  BRANCH=$(cd /path/to/pos-android && git rev-parse --abbrev-ref HEAD)
  COMMIT_MSG=$(cd /path/to/pos-android && git log -1 --pretty=%s | head -c 200)

  curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ci_report" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"git_sha\": \"${VERSION}\",
      \"branch\": \"${BRANCH}\",
      \"commit_message\": \"local test run\",
      \"android_passed\": ${UNIT_PASSED:-0},
      \"android_failed\": ${UNIT_FAILED:-0},
      \"firebase_passed\": ${FIREBASE_PASSED:-0},
      \"firebase_failed\": ${FIREBASE_FAILED:-0},
      \"firebase_status\": \"${FIREBASE_STATUS:-skipped}\",
      \"source\": \"local\",
      \"status\": \"${OVERALL_STATUS:-pass}\"
    }"
  echo "Posted to platform"
else
  echo "SKIP: .env.local not found — results not posted to platform"
fi
```

Replace the variables (`UNIT_PASSED`, `UNIT_FAILED`, `FIREBASE_PASSED`, `FIREBASE_FAILED`, `FIREBASE_STATUS`, `OVERALL_STATUS`) with actual values collected during steps 1–9.

## Output Format

```
## Android Production Readiness

| Check | Status | Details |
|-------|--------|---------|
| Build | ✅/❌ | BUILD SUCCESSFUL / N errors |
| Unit Tests | ✅/❌ | X/Y passed |
| Install | ✅/❌ | Success / Failed |
| Launch | ✅/❌ | No crashes / FATAL: ... |
| Activity | ✅/❌ | TopActivity: ... |
| Network | ✅/❌ | DNS OK / DNS failed |
| Sync | ✅/❌ | Sync complete / Failed: ... |
| Firebase | ✅/❌/⏭ | X passed / skipped |
| APK Size | ✅/⚠ | X MB |
| Platform | ✅/⏭ | Posted to ci_report / skipped |

**Verdict: READY FOR PRODUCTION / BLOCKED — fix N issues**
```

If ANY check fails, list the specific failures and recommend fixes.
