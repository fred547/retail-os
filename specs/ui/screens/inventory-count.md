# Screen: Inventory — Count (Dual-Scan)
> Module: modules/06-inventory-and-count.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Barcode-scanning inventory count using the dual-scan method: every shelf requires two independent scans that must match. No manual entry allowed.

## Layout

### Start Phase
- TopBar: "Inventory Count" + "Grand Baie" subtitle
- Warning card (amberLight): "DUAL-SCAN REQUIRED" explaining the two-scan rule
- Two CTA buttons: "Start Full Count" (primary with barcode icon) | "Spot Check" (ghost)
- Shelf list: cards showing shelf name, expected item count, and status pill (Pending/Complete)

### Scanning Phase
- TopBar: "Scanning -- Shelf A1" + "Scan 1 of 2 - Footwear" subtitle
- Scan target area: centered, 24px padding, dashed blue border (2px), barcode icon
- "Scan product barcode" instruction and hint text
- Scanned items list: product name + quantity per item
- "Simulate Scan" button (for demo/testing)
- "Complete Scan 1" success button (appears after items scanned)

## Key Components Used
- TopBar (sticky header with back button and subtitle)
- Card (shelf items, warning)
- StatusPill (shelf status)
- Btn (primary, ghost, secondary, success variants)
- Icon (barcode, camera)
- ProgressBar (not used in App.jsx but present in v3.8.1 scanning)

## Data Requirements
- Shelf/zone list with expected counts
- Scanned item accumulator (product name, quantity)
- Dual-scan comparison results
- Count session state (which scan pass)

## User Actions
- Start full count or spot check
- Scan items by pointing camera at barcode
- Review scanned items list
- Complete scan pass
- Move to second scan pass for verification

## Design Notes
- Scan area: white background, 24px border-radius, dashed blue 2px border
- Barcode icon at 48px size, blue color
- Instruction: 14px/700 blue, hint: 11px muted
- Shelf cards: 24px border-radius, flex space-between with status pill
- The dual-scan concept is unique to Posterita: prevents inventory fraud by requiring two independent counts
