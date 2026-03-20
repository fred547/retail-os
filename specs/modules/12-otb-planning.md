# OTB Planning
> References: shared/architecture.md, shared/data-model.md

## Overview

Open-to-Buy (OTB) planning provides financial guardrails for purchasing: selling periods define time buckets, OTB budgets set the financial envelope per category per period, and stock cover dashboards show months of supply per store and warehouse. The module validates PO approvals against OTB budgets, tracks burn-down, and recalculates revised OTB weekly during in-season periods.

## Relevant Tables

`selling_period`, `otb_plan`, `purchase_order`, `purchase_order_line`, `mv_stock_cover` (materialized view)

## API Routes

### Selling Periods
- `POST /v1/otb/periods` — Create selling period
- `GET /v1/otb/periods` — List periods (filters: status, date range)
- `GET /v1/otb/periods/{id}` — Period detail with linked OTB plans
- `PUT /v1/otb/periods/{id}` — Update period
- `POST /v1/otb/periods/generate` — Auto-generate monthly/quarterly periods for date range
- `POST /v1/otb/periods/{id}/transition` — Transition status (planning->open->in_season->closed)

### OTB Plans
- `POST /v1/otb/plans` — Create OTB plan for category/period
- `GET /v1/otb/plans` — List plans (filters: period, category, status)
- `GET /v1/otb/plans/{id}` — Plan detail with burn-down data
- `PUT /v1/otb/plans/{id}` — Update plan targets
- `POST /v1/otb/plans/{id}/lock` — Lock plan (prevent further edits)
- `GET /v1/otb/plans/{id}/burn-down` — Burn-down chart data
- `POST /v1/otb/plans/recalculate` — Trigger revised OTB recalculation for in-season periods

### Stock Cover
- `GET /v1/otb/stock-cover` — Heatmap data: stock months per store x category
- `GET /v1/otb/stock-cover/{store_id}` — Store drill-down: stock months per category with SKU breakdown
- `GET /v1/otb/stock-cover/warehouse` — Warehouse forward cover aggregated across all stores' sell-through
- `POST /v1/otb/stock-cover/refresh` — Trigger materialized view refresh

### Arrival Timeline
- `GET /v1/otb/arrival-timeline` — All open POs with dates, status, period tags for Gantt rendering
- `GET /v1/otb/arrival-timeline/alerts` — Must-order-by alerts and ETA slip warnings

## Business Rules

### Three Interlocking Pieces

1. **Selling Periods** — time buckets that every purchase is tagged to
2. **OTB Budget** — the financial envelope per category per period
3. **Stock Cover Dashboard** — "how many months of stock do we have?" per store and at warehouse level

### Selling Periods

Brand-configurable time windows (monthly, quarterly, seasonal, or custom).

**Period lifecycle:**
- `planning` — future period, budgets being set, no POs tagged yet
- `open` — budget finalized, POs can be created against it
- `in_season` — period started, actuals flowing in, revised OTB recalculates weekly
- `closed` — period ended, performance locked for reporting

Brands can auto-generate periods or define custom seasons.

### OTB Formula

```
OTB = (Planned Sales + Planned EOM Stock + Planned Markdowns)
    - (BOM Stock + On-Order Commitments)
```

**Key behaviors:**
- `bom_stock` auto-snapshotted from inventory when period transitions to `open` or `in_season`
- `on_order` is a live aggregate of all approved POs tagged to this period + category
- `otb_amount` is a generated column — always current
- `otb_available` subtracts the reserve (default 15%)
- `revised_otb` recalculated weekly once `in_season`
- `target_stock_months` defaults to 4.0, configurable per category
- `performance_grade` computed at period close (+-5% = excellent, +-10% = good, +-20% = fair, >20% = poor)

### PO Period Tagging & OTB Validation

Every PO must declare which selling period it buys for. Line-level overrides allow a single PO to span periods.

**Validation on PO approval:**
- For each line, look up OTB plan for that period + category
- If (on_order + line_total) > otb_available: FLAG warning
- Soft block: Purchaser sees warning, cannot approve
- Owner/Admin can override with reason (logged to audit)

### Stock Cover (Months of Supply)

```
Stock Cover (months) = Current Stock Value at Cost
                       / Average Monthly Sales at Cost (trailing N months)
```

Materialized view `mv_stock_cover` refreshed nightly by `pg_cron`.

**Stock Cover Dashboard — Heatmap:**

Color coding against brand's target (default 4 months):
- Red: < 50% of target — Critical, will stockout soon
- Amber: 50-80% of target — Low, order soon
- Green: 80-120% of target — Healthy
- Blue: > 120% of target — Overstocked, slow down buying

### OTB Burn-Down Dashboard

Waterfall chart per period showing: Total budget -> Reserved -> Available -> Committed -> Received -> Remaining to buy.

### Arrival Timeline (Gantt)

Horizontal timeline of all open POs:
- Each PO as a bar from `created_at` to `expected_delivery`
- Color = selling period
- Bar segments show status: draft, sent to vendor, confirmed, shipped
- "Today" vertical marker
- Must-order-by markers: `period.starts_at - vendor.average_lead_time`
- ETA slip detection (amber triangle if delivery date pushed)

### Revised OTB (In-Season Recalculation)

Weekly every Monday:
```
Revised OTB = (Revised Sales Forecast + Planned EOM Stock + Revised Markdowns)
            - (Current Actual Stock + Remaining On-Order)

Revised Sales Forecast = actual_sales_so_far + (planned_remaining_weeks x adjusted_weekly_rate)
Adjusted weekly rate = trending rate from last 4 weeks
```

### Best Practice Rules (Enforced by System)

| Rule | Implementation |
|---|---|
| Never commit 100% of OTB upfront | `reserve_pct` defaults to 15% |
| Stock cover targets vary by category | Fashion = 2-3 months, staples = 5-6 months |
| Weekly OTB review cadence | `pg_cron` every Monday 06:00 UTC |
| The 5% rule | +-5% = excellent, +-10% = good, +-20% = fair, >20% = poor |
| Lead time awareness | Must-order-by = period start - vendor lead time |
| OTB is iterative | System won't let period sit in "planning" past `starts_at` |

### Reports

- OTB Performance by Period
- Stock Cover Trend
- OTB Utilization
- Arrival Forecast
- Must-Order-By Alert Summary

## Dependencies

- Procurement module (PO creation, vendor lead times)
- Container/Warehouse module (goods received updates)
- POS module (sales data for stock cover calculation)

## Implementation Notes

- **Phase 3:** OTB planning, stock cover dashboards, arrival timeline
- Open items 12-16: Default period type, stock cover basis, alert lead times, override policy, historical data seeding
- Decision 42: Full OTB with classic formula, selling periods, stock cover, Gantt timeline
- Web console: implemented as sub-tabs within "Merchandise Planning" section
