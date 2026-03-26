---
name: security-audit
description: OWASP vulnerability scan — injection, XSS, auth bypass, secrets, multi-tenant isolation
user-invocable: true
---

# Security Audit: OWASP Vulnerability Scan

Perform a security audit of recent code changes or a specific area of the codebase.

## Input
Optionally specify a scope (e.g., "api routes", "sync", "auth", "payments"). Default: all recently changed files.

$ARGUMENTS

## Step 1: Identify Scope
```bash
# Recent changes (last 5 commits)
git diff --name-only HEAD~5
# Or scan specific directory
```

Read all files in scope.

## Step 2: Injection Attacks (OWASP A03)

### SQL Injection
- [ ] All Supabase queries use `.eq()`, `.in()`, `.filter()` — never string concatenation
- [ ] No raw SQL with user input (if raw SQL needed, use parameterized queries)
- [ ] Room queries use `@Query` with `:param` binding — never string concatenation
- Search for: template literals in `.from()`, `.rpc()`, or `.select()` calls

### Command Injection
- [ ] No `exec()`, `spawn()`, `execSync()` with user input
- [ ] No `eval()` or `Function()` constructor with user input
- Search for: `exec(`, `spawn(`, `eval(`, `child_process`

### XSS (Cross-Site Scripting)
- [ ] No `dangerouslySetInnerHTML` with user data
- [ ] No `document.write()` or `innerHTML` with user data
- [ ] React auto-escapes JSX — but check any raw HTML rendering
- Search for: `dangerouslySetInnerHTML`, `innerHTML`, `document.write`

## Step 3: Authentication & Authorization (OWASP A01, A07)
- [ ] Every API route calls `getSessionAccountId()` or checks auth before DB operations
- [ ] Account manager routes verify account manager role
- [ ] Super admin routes verify super admin status
- [ ] OTT tokens expire (60-second TTL enforced)
- [ ] No API routes accessible without authentication (except health checks)
- [ ] Service role key (`createServerSupabaseAdmin`) used server-side only
- [ ] Anon key never used for writes
- Search for: routes without `getSessionAccountId()`, exposed credentials

## Step 4: Data Exposure (OWASP A01)
- [ ] No API keys, passwords, or tokens in source code
- [ ] `.env` files are in `.gitignore`
- [ ] No sensitive data in error responses (stack traces, DB schemas)
- [ ] API responses don't leak data from other accounts (account_id scoping)
- Search for: `sk_`, `key_`, `password`, `secret`, `token` in source files (not .env)

## Step 5: Multi-Tenant Isolation
- [ ] Every Supabase query filters by `account_id`
- [ ] No cross-tenant data leakage possible
- [ ] RLS enabled on all tables
- [ ] Service role key queries still manually scope by account_id
- [ ] Sync only returns data for the requesting account
- Search for: queries without `.eq('account_id',` or `WHERE account_id =`

## Step 6: Cryptographic Failures (OWASP A02)
- [ ] Passwords only in Supabase Auth — never stored locally
- [ ] PINs stored as-is (4-digit numeric, not hashed — known design decision)
- [ ] HTTPS used for all external calls
- [ ] No sensitive data in localStorage/cookies without httpOnly

## Step 7: Security Misconfiguration (OWASP A05)
- [ ] CORS configured correctly (not `*` for authenticated routes)
- [ ] Rate limiting on auth endpoints (signup, login, OTT)
- [ ] Error pages don't expose stack traces to users
- [ ] Debug endpoints protected (e.g., `/api/debug/session`)

## Output Format

### CRITICAL (exploit possible)
- Description, file, line, and fix

### HIGH (vulnerability present, harder to exploit)
- Description, file, line, and fix

### MEDIUM (defense-in-depth gap)
- Description and recommendation

### PASSED
- List of checks that passed

Fix all CRITICAL and HIGH issues immediately. Verify fixes compile and pass tests.
