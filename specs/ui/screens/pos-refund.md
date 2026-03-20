# Screen: POS — Refund
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Process a refund by looking up the original order, selecting items to refund, and specifying a reason.

## Layout
- Back button to order history
- Title: "Process Refund" at 18px/800
- Subtitle: "Search the original order" at 12px muted
- Search field: "Order # or scan receipt barcode..."
- Order detail card:
  - Order number and timestamp
  - Total amount (right-aligned, 15px/800)
  - Item list with checkboxes: each row has checkbox, product name, price
- Reason field: "Select reason..."
- Primary CTA: "REFUND Rs 1,290.00" showing selected items total

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Field (search, reason dropdown)
- Card (order detail)
- Checkbox items (custom 20x20 squares with blue fill and checkmark)
- Btn48 (refund action)

## Data Requirements
- Order lookup by ID or barcode
- Order items with prices
- Refund reason codes

## User Actions
- Search for order by number or scan receipt barcode
- Select/deselect individual items for refund
- Select refund reason
- Tap "REFUND" to process the selected amount

## Design Notes
- Checkboxes: 20x20, 6px border-radius, 2px border; selected: blue fill with white checkmark; unselected: line border
- Item rows: flex layout with 10px gap, 8px vertical padding, separated by line borders
- Refund button text dynamically shows the calculated refund amount
