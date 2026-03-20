# Screen: POS — Order History
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Orders.tsx

## Purpose
Shows the chronological list of today's orders with quick actions for refunds, holds, and till operations.

## Layout
- Back button to products
- Title: "Order History" at 18px/800
- Subtitle: "Today - 47 orders" at 12px muted
- Search field: "Search orders..."
- Quick action button row: REFUND | HOLDS | OPEN TILL | CLOSE TILL (horizontal scroll)
- Scrollable order list: each card shows:
  - Order ID and timestamp at 13px/800 (with muted time)
  - Payment method at 11px muted
  - Total at 14px/800 (right-aligned)
  - Status badge: "Complete" (green) or "Refunded" (red)

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Field (search)
- Btn48 (quick action buttons)
- Card (per order, 10px 12px padding, 4px margin-bottom)
- Badge (status indicator)

## Data Requirements
- Order list: ID, timestamp, total, payment method, status
- Today's order count

## User Actions
- Search orders by ID or details
- Tap REFUND to navigate to refund screen
- Tap HOLDS to view held orders
- Tap OPEN TILL / CLOSE TILL for till management
- Tap any order card to view order detail

## Design Notes
- Quick action buttons: horizontal flex with 6px gap, standard Btn48 style
- Order cards: compact 4px margin-bottom
- Status badges use Badge component with colored background/text pairs
