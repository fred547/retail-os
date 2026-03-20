# Screen: POS — Cart Sheet
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Overlay sheet showing the current cart contents with quantity controls, totals, and payment/hold actions.

## Layout
- **Position:** Absolute overlay on top of POS screen, inset "64px 8px 8px", border-radius 22px
- **Header:** "Cart (N)" title + close button (36x36, rounded, "x" icon)
- **Scrollable item list:** Each item shows:
  - Product image (50x60px, rounded)
  - Name (16px/700), price (17px/800 blue, underlined), modifier hint
  - Remove button (40x40, red text, light red background)
  - Quantity controls: minus / count / plus buttons (38px circles)
- **Totals section:** Sub Total, Tax Total, Grand Total rows
- **Action buttons:** 2-column — HOLD (secondary) | PAY (primary)

## Key Components Used
- Cart sheet overlay (absolute positioned, shadow-sheet)
- Row (flex space-between for totals)
- Btn48 (HOLD and PAY buttons)
- Quantity stepper (minus/count/plus)

## Data Requirements
- Cart items: product details, quantities, prices
- Tax calculation (15% VAT in Mauritius)
- Subtotal, tax, and grand total

## User Actions
- Tap "x" on any item to remove it completely
- Tap "-" / "+" to adjust quantity
- Tap HOLD to save cart and return to product selection
- Tap PAY to proceed to payment screen
- Tap close button to dismiss cart and return to product selection

## Design Notes
- Sheet: white background, shadow-sheet ("0 24px 80px rgba(0,0,0,0.18)"), 1px border rgba(0,0,0,0.08)
- Grid layout: gridTemplateRows "auto 1fr auto auto" (header, scroll area, totals, buttons)
- Item card: 5px margin, 6px padding, 10px border-radius, grid "50px 1fr auto"
- Price is underlined to indicate it's tappable (for discount/modifier)
- Quantity buttons: 38px diameter circles, #f2f2f2 background
- Grand total row: 18px/800 weight
- PAY button: 52px height in the prototype (differs from standard 48px)
