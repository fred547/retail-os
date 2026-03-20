# Screen: POS — Payment
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Presents payment method options after checkout from the cart. Supports cash, card/Blink, and split payments.

## Layout
- Back button to products
- Title: "Payment" at 18px/800
- Subtitle: total amount (e.g., "Total: Rs 3,726.50") at 13px muted
- Three payment method cards (tappable):
  - CASH: green icon, "Count and confirm"
  - CARD / BLINK: blue icon, "Tap or insert card"
  - SPLIT PAYMENT: purple icon, "Cash + Card"
- "QUICK CASH AMOUNTS" section with 3-column grid: EXACT | Rs 4,000 | Rs 5,000
- Primary CTA: "COMPLETE SALE" full-width button

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Card (payment method options, 14px padding)
- Section (labeled section with title)
- Btn48 (primary full-width for complete)

## Data Requirements
- Cart total from previous screen
- Available payment methods
- Quick cash denomination presets

## User Actions
- Tap a payment method to select it
- Tap a quick cash amount for immediate cash processing
- Tap "COMPLETE SALE" to finalize the transaction
- Tap Back to return to product selection

## Design Notes
- Payment method cards: icon in 40x40 colored tint container (12px border-radius), label at 14px/800, description at 11px muted, right chevron
- Quick cash buttons: bordered cards, 12px border-radius, 12px padding, center-aligned text
- "EXACT" button highlighted with blueLight background and blue tint border
- In v3.8.1, the POS screen handles payment inline with a receipt view after checkout
