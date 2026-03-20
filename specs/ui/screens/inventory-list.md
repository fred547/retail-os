# Screen: Inventory — Main
> Module: modules/06-inventory-and-count.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Inventory.tsx (partial)

## Purpose
Inventory hub showing quick actions (count, barcode request, name item, stock levels) and active count sessions.

## Layout
- Back button to home
- Title: "Inventory" at 18px/800
- Subtitle: "Stock counts and requests" at 12px muted
- 2x2 grid of action tiles:
  - Count (blue): full inventory count
  - Barcode (amber): request barcode for items
  - Name Item (purple): add new item with photo
  - Stock (green): view levels and alerts
- Active counts section:
  - In-progress count card with amberLight background showing section name, items counted/total, time since last update

## Key Components Used
- PF (Phone Frame, active="tasks")
- BackBtn
- Card (action tiles)
- Section (titled "ACTIVE COUNTS")
- Badge (status indicator)

## Data Requirements
- Active count sessions: section name, items scanned/total, last update time
- Inventory action availability

## User Actions
- Tap Count to start a full inventory count
- Tap Barcode to request barcode printing
- Tap Name Item to add a new product via photo
- Tap Stock to view stock levels and alerts
- Resume an active count session

## Design Notes
- Action tiles: 2-column grid, 8px gap, 14px padding
- Each tile has a 36x36 icon container with colored tint background (15% opacity), 10px border-radius
- Tile label: 13px/800; description: 10px muted
- Active count card: amberLight background, 12px border-radius, 12-14px padding
