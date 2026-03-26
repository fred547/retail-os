---
name: debug
description: Diagnose production issues via error_logs, sync_request_log, and health endpoints
user-invocable: true
---

# Debug: Production Issue Diagnosis

Diagnose a production issue by querying error logs, sync logs, and system health endpoints.

## Input
The user describes a symptom: $ARGUMENTS

## Step 1: System Health Check
```bash
# Check all services are up
curl -s https://web.posterita.com/api/monitor | jq .

# Check Render backend
curl -s https://posterita-backend.onrender.com/health | jq .

# Check sync API
curl -s https://web.posterita.com/api/sync | jq .
```

## Step 2: Error Logs (recent errors)
Query the Supabase `error_logs` table for recent errors:
- Filter by severity (FATAL, ERROR)
- Filter by tag if the symptom suggests a specific area
- Filter by account_id if known
- Sort by created_at DESC, limit 20

Use the Supabase REST API or read via the web console API:
```bash
# Via monitor endpoint
curl -s https://posterita-backend.onrender.com/monitor/errors | jq .
```

## Step 3: Sync Logs (if sync-related)
Query `sync_request_log` for the affected account:
- Check recent sync attempts (status, duration, errors)
- Look for patterns (always failing? intermittent? specific data?)
```bash
curl -s https://posterita-backend.onrender.com/monitor/sync | jq .
```

## Step 4: Code Investigation
Based on the error messages/stack traces found:
1. Read the relevant source file at the line mentioned in the stack trace
2. Check for recent changes to that file: `git log --oneline -5 -- <file>`
3. Look for common issues:
   - Missing account_id scoping
   - Wrong column name (check DB Column Reference in CLAUDE.md)
   - Missing Room migration (check buildDedicated has all migrations)
   - Type mismatch (INT vs TEXT for account_id)
   - Missing error.tsx boundary

## Step 5: Reproduce (if possible)
1. Check if the issue is reproducible locally
2. If web: check browser console for errors
3. If Android: check logcat output
4. If sync: try a manual sync and watch the response

## Step 6: Root Cause Analysis
Present findings:
1. **Symptom**: What the user reported
2. **Evidence**: Error logs, stack traces, health check results
3. **Root Cause**: What's actually wrong
4. **Fix**: Proposed solution
5. **Prevention**: How to prevent this in the future (test, monitoring, etc.)

## Step 7: Fix and Verify
1. Implement the fix
2. Run type checks (`tsc --noEmit`, `./gradlew compileDebugKotlin`)
3. Run relevant tests
4. Verify the fix resolves the original symptom

## Common Issues Reference
| Symptom | Likely Cause |
|---------|-------------|
| Sync crashes on brand switch | buildDedicated() missing latest migration |
| "column X does not exist" | Migration not run on Supabase, or wrong column name |
| Blank web page | Server component crash without error.tsx boundary |
| 401 on API routes | Session expired, or getSessionAccountId() failing |
| Android "no such table" | Room migration missing or entity not in @Database |
| "permission denied for table" | RLS blocking — use service role key, not anon |
| Stale data after edit | PostgREST cache — run NOTIFY pgrst, 'reload schema' |
