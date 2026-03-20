# Screen: Web Console — Dashboard
> Module: modules/02-home-and-navigation.md
> Status: built
> Production file: manus-retail-os/client/src/pages/Dashboard.tsx

## Purpose
Web console overview for managers/owners showing aggregate metrics across all stores, reconciliation alerts, and pending approvals.

## Layout
- **Sidebar (200px):** Posterita branding, navigation menu (Dashboard, Devices, Users & Roles, Capabilities, Stores, Products, Reconciliation, Requests, Staff Ops, Approvals, Assets, Loyalty, Audit Trail, Compliance, AI Tasks, AI Setup)
- **Content area:**
  - Header: "Dashboard" at 22px/800 + "All stores - Today" subtitle
  - Metric cards (4-column grid): Total Sales, Orders, Pending, Devices
  - Two-panel row:
    - Reconciliation alerts: per-store discrepancy cards with status badges
    - Pending approvals: staff requests with Approve/Reject buttons

## Key Components Used
- WebShell (sidebar + content layout)
- Glass / WMetric (glassmorphism metric cards)
- Badge (status indicators)
- Inline Approve/Reject buttons

## Data Requirements
- Aggregate metrics: total sales, order count, pending items, device status
- Per-store reconciliation: store name, discrepancy amount, status
- Pending approvals: staff name, request type, details

## User Actions
- Navigate between web console sections via sidebar
- Click reconciliation alert to drill into detail
- Approve or reject pending requests inline

## Design Notes
- Sidebar: bg (#F5F2EA) background, 200px width, borderRight 1px line
- Active nav item: blueLight background, blue text, 3px right border in blue
- Nav items: 7px 16px padding, 12px font, 600 weight normal, 800 active
- Metric cards: glassmorphism (rgba(255,255,255,0.82), blur(14px)), 16px border-radius
- Labels: 11px/800, 0.06em letter-spacing, muted
- Values: 24px/800, -0.02em letter-spacing
- Content panels: glassmorphism with 18px padding, 16px border-radius
- Approve button: greenLight background, green text, 10px border-radius, 5px 12px padding
- Reject button: redLight background, red text
