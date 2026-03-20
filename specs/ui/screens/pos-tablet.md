# Screen: POS — Tablet Split View
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Tablet-optimized POS layout with a 62/38 split: product browsing on the left, always-visible cart on the right.

## Layout
- **Left panel (62%):** Product selection
  - Top bar: hamburger, cart count, divider, last-added preview, UNDO
  - Order type toggle (DINE IN / TAKE AWAY)
  - Category chips: 4-column grid (vs 3 on phone)
  - Product grid: 2-column, smaller cards (48px images)
  - Bottom action bar: CLEAR | SEARCH | MORE | SCAN (4 equal columns)
- **Right panel (38%):** Cart
  - Header: "Cart (N)" centered
  - Scrollable item list (no images, name + price x qty + remove button)
  - Totals: Sub Total, Tax Total, Grand Total
  - Action buttons: HOLD then PAY (single column, stacked)

## Key Components Used
- Tablet container (28px border-radius, gray background, shadow-lg)
- Split grid layout (gridTemplateColumns "62% 38%")
- Compact product cards (48px images)
- Compact category chips (32px height)
- Inline cart panel

## Data Requirements
- Same as phone POS: products, categories, cart state

## User Actions
- Same as phone POS, but cart is always visible (no sheet overlay needed)
- Tap product to add, see it immediately appear in right cart panel

## Design Notes
- Left panel: white background, borderRight 1px solid #d8d8d8
- Right panel: white background, gridTemplateRows "auto 1fr auto auto"
- Product cards: gridTemplateColumns "48px 1fr", smaller than phone (48px vs 56px images)
- Category chips: 4-column grid, 32px height (vs 38px on phone)
- All button heights reduced ~15% for tablet density
- Cart items: text-only (no images), 15px font for name, 15px blue for price
- "Tap line for edit dialog" hint on each cart item
- Total: same layout but with 10-12px padding
- Action buttons: single column stacked, 44px height (vs 48/52 on phone)
