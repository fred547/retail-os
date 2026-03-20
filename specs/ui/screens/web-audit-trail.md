# Screen: Web Console — Audit Trail
> Module: modules/14-audit-and-compliance.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Immutable chronological log of all system actions across all stores for compliance and investigation.

## Layout
- Title: "Audit Trail" at 20px/800
- Audit table (Glass container):
  - Column headers: TIME, USER, ACTION, DETAIL, STORE
  - Per-event rows: timestamp, user name (800 weight), action badge (color-coded), detail text, store name

## Key Components Used
- WebShell (sidebar navigation)
- Glass (table container)
- Badge (action type badges, color-coded)

## Data Requirements
- Audit events: timestamp, user, action type, detail, store
- Filterable by time range, user, action type, store

## User Actions
- Scroll through chronological audit log
- Identify actions by color-coded badges

## Design Notes
- Table grid: "50px 1fr 120px 2fr 100px"
- Header: bg background, 10px/800 muted, 0.04em letter-spacing
- Data rows: 12px font, 8px 14px padding, line border-bottom
- Timestamp: muted/700 weight
- User: 800 weight (bold identifier)
- Action badges: blue for create actions, green for approvals, amber for refunds/updates, red for system alerts
- Action types: order.create, order.refund, leave.approve, device.stale, till.open, attendance.in
