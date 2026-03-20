# Reports
> References: shared/architecture.md, shared/data-model.md

## Overview

The reports module provides parameterized reporting via SQL views and materialized views in Supabase, served through NestJS API endpoints with CSV/PDF export and scheduled email summaries. Reports cover sales, discrepancies, device health, inventory, loyalty enrollment, showroom analytics, and more.

## Relevant Tables

All tables are read for reporting. Materialized views include `mv_stock_cover` and daily sales summary views.

## API Routes

### Reports

- `GET /v1/reports/daily-sales?store_id=&date=` — Daily sales summary
- `GET /v1/reports/hourly-heatmap?store_id=&date=` — Hourly sales breakdown
- `GET /v1/reports/product-ranking?store_id=&period=` — Product sales ranking
- `GET /v1/reports/discrepancy-summary?store_id=&period=` — Till discrepancy report
- `GET /v1/reports/device-health` — Device fleet health
- `GET /v1/reports/count-session/{id}` — Inventory count results
- `GET /v1/reports/enrollment-funnel?period=` — Loyalty enrollment funnel
- `GET /v1/reports/points-economy?period=` — Points earned vs redeemed
- `GET /v1/reports/voucher-performance?campaign_id=` — Voucher redemption rates
- `GET /v1/reports/attendance-summary?store_id=&period=` — Attendance report
- `POST /v1/reports/export` — Export any report as CSV or PDF

## Business Rules

### Architecture

| Component | Technology |
|---|---|
| Query layer | SQL views + materialized views in Supabase |
| API | NestJS reports module with parameterized endpoints |
| Rendering | Web console (Recharts for charts, tables for data) |
| Export | Server-side PDF + CSV generation |
| Scheduling | Cron jobs for daily/weekly email summaries |

### MVP Reports (6)

1. **Daily Sales Summary** — revenue, order count, avg transaction, payment breakdown per store
2. **Till Discrepancy Summary** — discrepancy per cashier, resolution status, trend
3. **Device Fleet Health** — online/stale/offline, battery, app versions, sync performance
4. **Inventory Count Session Results** — matched vs disputed shelves, variance by product
5. **Enrollment Funnel** — new customers by channel, consent rate, points economy
6. **Showroom Funnel** — QR scans per day, scan-to-enrollment conversion, most-scanned products, scan-to-purchase conversion

### Post-MVP Reports

**POS:** hourly heatmap, product ranking, refund report, discount usage, held order aging.
**Loyalty:** top customers, voucher performance, consent breakdown.
**Workforce:** attendance, leave balance, expense claims, task completion.
**Inventory:** variance trend, shrinkage rate, stock alerts.
**COD:** driver cash collection summary, undeposited cash aging, COD vs prepaid breakdown.
**Cash Collection:** daily summary, cash in transit, deposit reconciliation, discrepancy aging.
**Container:** receiving summary, landed cost analysis, claim aging, margin analysis.
**OTB:** performance by period, stock cover trend, utilization, arrival forecast, must-order-by alerts.

### Product Display UI Improvements (Section 28)

**View Mode Toggle:** Compact list (68px cards, 2 columns) / Visual grid (120px cards, 80px images)

**Search Promotion:** Persistent search icon in top bar, real-time filtering.

**Stock Indicator:** 3px colored bar at card bottom — Green (#2E7D32) >= 10, Amber (#F57F17) 1-9, Red (#E53935) = 0 (greyed, not tappable).

**Frequent Items:** Auto-populated category chip showing 12 most-sold products in last 7 days.

**Category Color Accents:** 4px left-border color on each chip. 6 predefined cycling colors.

## Dependencies

- All data-producing modules (POS, loyalty, inventory, workforce, logistics, etc.)
- Supabase (materialized views, pg_cron)

## Implementation Notes

- **Phase 0:** Reports module skeleton with daily sales summary materialized view
- **Phase 3:** Full MVP report set
- Decision 20: Backend-generated, served to web console, CSV/PDF export
