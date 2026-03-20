# Screen: Web Console — Reconciliation Review
> Module: modules/05-till-reconciliation.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Manager-facing reconciliation detail view for reviewing till discrepancies, cashier notes, evidence, and resolving cases.

## Layout
- Title: "Reconciliation Review" at 20px/800
- Glass detail card:
  - Header: store name + cashier name + shift time, discrepancy badge (red)
  - Three metric boxes (3-column grid): EXPECTED, COUNTED, DISCREPANCY
  - Cashier's note: quoted text on bg background
  - Evidence section: clickable document links (Till photo, Bank deposit slip, Z-report)
  - Resolution section: dropdown for resolution type + manager note field + RESOLVE button

## Key Components Used
- WebShell (sidebar navigation)
- Glass (main detail card)
- Badge (discrepancy amount)
- Metric boxes (bg background, labeled)
- Btn48 (RESOLVE)

## Data Requirements
- Till session: store, cashier, shift time, expected total, counted total, discrepancy
- Cashier's explanation note
- Evidence documents/photos
- Resolution options: Accepted, Adjusted, HR referral

## User Actions
- Review expected vs counted amounts
- Read cashier's explanation
- View evidence documents
- Select resolution type
- Add manager note
- Click RESOLVE to close the case

## Design Notes
- Discrepancy badge: redLight background, red text, positioned in header
- Metric boxes: 3-column grid, 10px gap
  - Labels: 10px/800 muted, 0.06em letter-spacing
  - Values: 18px/800, relevant color (ink for expected/counted, red for discrepancy)
  - Discrepancy box: redLight background
- Cashier note: bg background, 10px border-radius, 10-14px padding, 13px muted text, line-height 1.6
- Evidence links: bg background, 8px border-radius, 6px 12px padding, 11px/700 blue text, line border
- Resolution dropdowns: bg background, 10px border-radius, 8px 12px padding, line border
