---
name: report
description: Build a reporting feature — SQL aggregation + API route + web dashboard with filters and export
user-invocable: true
---

# Report: Build a Reporting Feature

Build a reporting/analytics feature for the web console. Reports follow a consistent pattern: SQL aggregation query → API route → web dashboard with filters and export.

## Input
The user describes what report they need: $ARGUMENTS

## Step 1: Design the Query
1. Identify source tables (orders, orderline, product, till, etc.)
2. Design the aggregation SQL:
   - Always filter by `account_id` (mandatory)
   - Always filter by date range (default: today)
   - Add store_id filter if multi-store
   - Add terminal_id filter if relevant
   - Use `is_deleted = false` for soft-deleted tables
3. Test the query mentally against the DB Column Reference in CLAUDE.md
4. **CRITICAL**: Verify column names exist. Common mistakes:
   - `orders` uses `document_no` not `ordernumber`
   - `orders` uses `grand_total` not `total`
   - `orderline` uses `qtyentered` not `qty`
   - `orderline` uses `priceentered` not `priceactual`
   - `orderline` uses `linenetamt` not `line_total`

## Step 2: Create API Route
1. Create `web/src/app/api/reports/[report-name]/route.ts`
2. Use `createServerSupabaseAdmin()` for DB access
3. Accept query params: `account_id`, `from`, `to`, `store_id` (optional), `format` (json/csv)
4. Return structured JSON with:
   - `summary` — top-level totals
   - `breakdown` — detailed rows
   - `filters` — what was applied
   - `generated_at` — timestamp
5. Support CSV export if `format=csv`
6. Log errors to error_logs on failure
7. Run `npx tsc --noEmit`

## Step 3: Create Web Dashboard Page
1. Create page in `web/src/app/(dashboard)/reports/[report-name]/page.tsx`
2. Layout pattern:
   - **Header**: Report title + date range picker + filter dropdowns + Export button
   - **Summary cards**: 3-5 KPI cards (total sales, order count, avg ticket, etc.)
   - **Table/Chart**: Detailed breakdown with sortable columns
   - **Footer**: Generation timestamp + filter description
3. Use responsive design (works on mobile WebView too)
4. Add loading states and error handling
5. Run `npx tsc --noEmit`

## Step 4: Add to Navigation
1. Add report to `/reports` page if it's a sub-report
2. Or add as standalone route in sidebar under Reports section
3. Update CLAUDE.md web routes table

## Step 5: Write Tests
1. Unit test the API route (mock Supabase response, verify aggregation logic)
2. Scenario test with real data if possible
3. Run `npx vitest run`

## Report Patterns Reference

### Z-Report (End of Day)
- Source: `orders` + `orderline` + `till` for date range
- Group by: payment_type (cash, card, mobile)
- Include: total sales, tax summary, discount total, void count, refund total
- Scope: single store + terminal + date

### Daily Item Sales
- Source: `orderline` JOIN `product` for date range
- Group by: product_id
- Include: qty sold, revenue, avg price, category
- Sort: by revenue DESC (top sellers first)

### Price Change Audit
- Source: `audit_event` WHERE action = 'price_change'
- Include: product name, old price, new price, changed by, timestamp
- Sort: by timestamp DESC

### Kitchen Order Report
- Source: `orders` WHERE has kitchen items, for date range
- Include: order count, avg prep time, items by station, reprint count
