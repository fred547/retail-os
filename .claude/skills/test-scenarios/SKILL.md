# Scenario Tests (Journey Tests)

Real-data integration tests that exercise full business workflows against production Supabase.

## Trigger
User says: `/test-scenarios`, "run scenario tests", "journey tests"

## Execution

```bash
cd pos-android/server-side/posterita-cloud/web

NEXT_PUBLIC_SUPABASE_URL="https://ldyoiexyqvklujvwcaqq.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeW9pZXh5cXZrbHVqdndjYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc2MjE2OCwiZXhwIjoyMDg5MzM4MTY4fQ.hDzw0w2ZCxwAjfU9LINoLChV9EW-oe0Zc2yogIzWCJc" \
npm run test:scenarios 2>&1
```

## Test Suites (33 tests)

| Suite | Tests | What it exercises |
|-------|-------|-------------------|
| 01-signup-flow | 5 | Create account -> verify owner, brands, store, terminal, user, taxes, duplicate rejection |
| 02-lookup-login | 4 | Lookup by email, 404 for unknown, login with correct/wrong password |
| 03-sync-push-orders | 5 | Push orders via sync -> verify in Supabase, multi-order batch, pull products back |
| 04-product-lifecycle | 5 | Create category -> product -> update price -> deactivate -> cross-account isolation |
| 05-till-reconciliation | 4 | Open till -> push orders -> close till -> verify totals match |
| 06-data-isolation | 3 | Two brands -> each only sees own products, independent currencies |
| 07-ott-security | 4 | Generate OTT -> validate -> single-use enforcement -> reject fake tokens |
| 08-sync-register | 3 | Register new account with data -> verify stored -> re-register doesn't downgrade |

## Cleanup
All tests create unique test data (timestamped IDs) and clean up in afterAll(). No persistent test data left in Supabase.

## Output
Report: X passed, Y failed. List any failures with details.
