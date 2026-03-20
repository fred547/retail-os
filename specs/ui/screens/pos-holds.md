# Screen: POS — Held Orders
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Shows orders that have been put on hold (parked), allowing cashiers to resume or cancel them.

## Layout
- Back button to products
- Title: "Held Orders" at 18px/800
- Subtitle: count of orders on hold at 12px muted
- List of held order cards, each showing:
  - Customer name or "Walk-in" at 14px/800
  - Hold ID and time since hold at 11px muted
  - Total amount at 16px/800 (right side)
  - Note/reason at 12px muted
  - Action buttons: RESUME (primary) | CANCEL (secondary)

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Card (per held order)
- Btn48 (resume, cancel)

## Data Requirements
- List of held orders: ID, customer, total, timestamp, note

## User Actions
- Tap RESUME to restore the held cart and return to POS
- Tap CANCEL to discard the held order

## Design Notes
- Cards: 14px padding, standard margin-bottom 8px
- Customer and amount in flex space-between layout
- Note text in muted color below the header
- Action buttons in a flex row with 6px gap
