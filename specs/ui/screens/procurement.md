# Screen: Procurement
> Module: modules/18-procurement.md
> Status: prototype-only
> Production file: not yet built

## Purpose
End-to-end procurement management: sourcing pipeline, RFQ management, purchase orders, and vendor directory with AI-assisted vendor discovery.

## Layout (Tabbed)

### Pipeline Tab
- Stage summary cards (horizontal scroll): Sourcing, Quoting, Ordered, Receiving — each with count
- Sourcing requirement cards: ID, title, status pill, quantity, RFQ count, AI vendor suggestions
- "+ New Sourcing Requirement" button

### RFQ Tab
- RFQ cards: reference, vendor name, total quote, response status (Responded/Sent)
- Tappable for comparison detail

### RFQ Comparison Detail (sub-screen)
- TopBar: RFQ ref + "RFQ Comparison" subtitle
- Per-vendor quote cards on bg background:
  - Vendor name, reference, total in green, star rating
  - "Accept -> PO" and "Reject" buttons
- Inbound email info card (blueLight): explains auto-capture of vendor email replies

### Orders Tab
- PO cards: reference, vendor, total, item count, status (Approved/Received)

### Vendors Tab
- Vendor cards: name, country, order count, verification status
- Unverified vendors: "Run AI Verification" link
- "+ Add Vendor" button

## Key Components Used
- TopBar
- Tab selector pills
- Card (sourcing items, RFQs, POs, vendors)
- StatusPill (status indicators throughout)
- Btn (new sourcing, accept PO, add vendor, AI verify)

## Data Requirements
- Sourcing pipeline: requirements with ID, title, status, quantities, RFQ counts
- RFQs: reference, vendor, response status, total, quality score
- Purchase orders: reference, vendor, total, item count, status
- Vendors: name, country, verification status, order history

## User Actions
- Browse procurement pipeline by stage
- Create new sourcing requirements
- Compare RFQ responses side-by-side
- Accept RFQ to create PO
- View purchase order status
- Add vendors and run AI verification
- View inbound email capture status

## Design Notes
- Tab pills: 20px border-radius, #0277BD blue when active
- Stage summary cards: min-width 80px, flex-none, centered, 10px padding
- Stage count: 20px/800 in relevant color; label: 10px muted
- RFQ comparison: bg background cards with 10px padding, 14px border-radius
- Star rating: 11px, amber color
- Email info card: blueLight background, blue 33% border, blue text
