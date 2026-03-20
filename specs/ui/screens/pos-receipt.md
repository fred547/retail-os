# Screen: POS — Receipt
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Displays the completed sale receipt with order details, totals, payment info, change due, and loyalty points awarded.

## Layout
- **Success indicator:** Green checkmark in 48x48 greenLight container, "Sale Complete" title, change due amount
- **Receipt card (Glass component):**
  - Store name: "Funky Fish -- Grand Baie" at 14px/800
  - Receipt number and date
  - Dashed separator line
  - Line items: product name x quantity | price (right-aligned)
  - Dashed separator
  - Subtotal, VAT 15%, Total rows
  - Dashed separator
  - Paid amount and Change amount (green)
  - Loyalty banner: purple background, points awarded message
- **Action buttons:** PRINT | WHATSAPP (side by side), then NEW SALE (primary, full-width)

## Key Components Used
- PF (Phone Frame, active="pos")
- Glass (glassmorphism receipt card)
- Row (totals display)
- Badge (loyalty points in purple)
- Btn48 (PRINT, WHATSAPP, NEW SALE)

## Data Requirements
- Complete order: items, quantities, prices
- Tax calculation
- Payment method and amount tendered
- Change due
- Loyalty customer (if linked): name, points earned, total points

## User Actions
- Tap PRINT to print physical receipt via connected Epson printer
- Tap WHATSAPP to send digital receipt to customer
- Tap NEW SALE to clear and start a new transaction

## Design Notes
- Receipt uses Glass component with 16px padding, 14px border-radius
- Dashed separators: 1px solid T.line with border-style dashed
- Loyalty section: purpleLight background, 8px border-radius, 8px padding, 11px/800 purple text
- Change amount displayed in green
- In v3.8.1: includes a QR code for loyalty scanning, and loyalty points message if customer was linked
