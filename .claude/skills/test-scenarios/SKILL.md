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

## Test Suites (114 tests)

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
| 09-inventory-count | 6 | Create session -> add entries -> read quantities -> status transitions -> session isolation |
| 10-error-logging | 5 | Log error via API -> verify in DB -> minimal fields -> fatal severity -> empty message resilience |
| 11-device-enrollment | 5 | Health check -> enroll device -> products/categories/users returned -> missing fields rejected |
| 12-monitor-health | 5 | Monitor status -> Supabase check -> Render check -> sync API health -> enroll health |
| 13-account-lifecycle | 6 | draft->onboarding->active -> suspended -> archived -> type/currency preserved |
| 14-soft-delete-sync | 6 | Soft-deleted in DB -> is_deleted filter -> sync excludes deleted -> categories pulled -> orders excluded |
| 15-auth-check | 5 | Email/phone uniqueness -> existing detected -> non-existent returns false -> empty request |
| 16-owner-accounts | 5 | Owner lookup by email/phone -> archived excluded -> empty for non-existent -> 400 without params |
| 17-restaurant-tables | 6 | Table sections -> tables with sections -> occupied flag -> takeaway section -> account scoping |
| 18-store-terminal-user | 6 | Store CRUD -> terminal types (retail/kds/restaurant) -> user roles -> store deactivation |
| 19-modifier-management | 6 | Product modifiers -> category modifiers -> query by product/category -> deactivate -> isolation |
| 20-changelog-debug | 5 | Changelog commits + version -> debug session -> infrastructure services + row counts |
| 21-preparation-stations | 8 | Station CRUD (kitchen/bar/dessert) -> category mapping -> product override -> sync pull -> deactivation -> isolation |
| 22-restaurant-orders | 8 | Table-section linking -> occupy/clear table -> dine-in order sync -> section transfer -> sync pull tables+sections |

## Cleanup
All tests create unique test data (timestamped IDs) and clean up in afterAll(). No persistent test data left in Supabase.

## Output
Report: X passed, Y failed. List any failures with details.
