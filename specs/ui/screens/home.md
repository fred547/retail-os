# Screen: Home Dashboard
> Module: modules/02-home-and-navigation.md
> Status: built
> Production file: manus-retail-os/client/src/pages/Home.tsx

## Purpose
The main hub screen after login. Shows greeting, today's summary metrics, pending approval count, and navigation tiles to all major modules. Adapts based on user role.

## Layout
- **Header row:** Greeting ("Good morning, [Name]") + store/role info on left, notification bell with red badge count on right
- **Pending approvals banner:** Blue-light background card with count and breakdown ("2 leave, 1 expense"), tappable to navigate to supervisor screen
- **Quick-access tile grid:** 2-column grid of module tiles (POS, Staff Ops, Supervisor, Inventory, etc.)
- **Today's summary card:** Glass component showing Orders count, Revenue, and Loyalty sign-ups in 3-column layout
- **Bottom nav:** 4 tabs — Home, POS, Tasks, More

### v3.8.1 Role-based Home Tiles
- **Owner (15 tiles):** POS, Inventory, Barcode My Store, Loyalty, Catalogue, Logistics, Warehouse, Procurement, Marketplace, Staff Ops, Shifts, AI Chat, Cash Collection, Financials, Settings
- **Purchaser (5):** Procurement, Warehouse, Inventory, AI Chat, Settings
- **Merchandiser (7):** Warehouse, Inventory, Barcode My Store, Catalogue, Procurement, AI Chat, Settings
- **Accountant (4):** Financials, PO Reports, Loyalty Liability, Settings
- **Supervisor (6):** POS, Inventory, Shifts, Staff Ops, Logistics, AI Chat
- **Staff/Cashier (4):** POS, Inventory, Staff Ops, AI Chat

## Key Components Used
- PF (Phone Frame with bottom nav, active="home")
- Glass (glassmorphism card for summary)
- Badge (notification count, approval count)
- Card (navigation tiles with icon + label + description)
- BottomNav (4-tab navigation)
- Avatar (user profile circle, in v3.8.1)

## Data Requirements
- User name, role, and store assignment
- Today's summary: order count, revenue, loyalty sign-ups
- Pending approval count with breakdown
- Notification count
- Sync status

## User Actions
- Tap notification bell to view notifications
- Tap approval banner to go to supervisor screen
- Tap any module tile to navigate to that module
- Use bottom nav tabs for quick switching
- v3.8.1: gradient sales summary card at top showing today's sales, order count, average

## Design Notes
- Greeting: 18px/800; store/role info: 12px muted
- Notification bell: 40x40 container, blueLight background, 12px border-radius; red badge: 16x16 circle, absolute positioned top-right
- Approval banner: blueLight background, 14px border-radius, blue count badge (34x34)
- Module tiles: white background, 14px border-radius, subtle shadow, 16x14px padding; icon in 40x40 colored tint square, label at 14px/800, description at 11px muted
- Summary card: glassmorphism with "Synced" green badge
- v3.8.1 tiles: 3-column grid instead of 2-column, with icon containers using 12px border-radius and colored tint backgrounds at 18% opacity
