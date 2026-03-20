# Screen: Financials (Accountant View)
> Module: modules/19-financials.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Analytics.tsx (partial)

## Purpose
Financial overview for accountants: revenue, COGS, margins, container cost summaries, PO spending, exchange rates, and marketplace commission.

## Layout
- TopBar: "Financials" + "Cost reports & analytics" subtitle
- Summary metrics (2x2 grid):
  - Revenue: Rs 1.42M (green, up 12%)
  - COGS: Rs 680K (red, down 3%)
  - Margin: 52.1% (blue, up 2.1pp)
  - Loyalty Liability: $426.80 (amber, 42,680 pts)
- Container Cost Summary card: per-container FOB, landed cost, margin percentage
- PO Spending card: this month, last month, outstanding POs
- Exchange Rates card: currency pairs with locked rates and source notes
- Marketplace Commission card: revenue, points burned, net liability change

## Key Components Used
- TopBar
- Card (all section cards)
- StatusPill (not used directly, implied for trends)

## Data Requirements
- Revenue, COGS, margin calculations
- Loyalty liability (total points * point value)
- Container costs: FOB, landed, margin per container
- PO spending: current month, previous month, outstanding
- Exchange rates: currency pairs, rates, lock sources
- Marketplace: commission revenue, points burned, liability change

## User Actions
- Review financial metrics
- Drill into container cost details
- View exchange rate history
- Track marketplace commission impact on loyalty liability

## Design Notes
- Metric cards: 2-column grid, 8px gap, 12px padding, centered text
- Metric labels: 10px muted/600; values: 18px/800 in relevant color; sub-text: 10px muted
- Container summary: stacked rows with flex space-between, 8px padding, line border-bottom
- Reference: 700 weight; "Landed:" label with 700 weight value
- PO spending rows: 12px font, 4px padding
- Exchange rates: 12px font, 600 weight for pair, 700 weight for rate, 10px muted for notes
- Marketplace: green for revenue, red for points burned, green for net liability change
