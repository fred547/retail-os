# Inventory and Count
> References: shared/architecture.md, shared/data-model.md

## Overview

The inventory module manages shelf registers, dual-scan inventory counting protocol, spot checks, shelf label printing across multiple printer types, and barcode format support. Full counts require two independent scans per shelf that must match; disputes are resolved by a third scan or supervisor override. Spot checks are single-scan for continuous monitoring.

## Relevant Tables

`shelf`, `inventory_count_session`, `inventory_count_device`, `inventory_shelf_count`, `inventory_shelf_count_line`, `inventory_shelf_match`, `product`, `barcode`, `stock_event`

## API Routes

### Inventory

- `POST /v1/inventory/shelves/bulk` — Bulk create shelf records (zone range, shelf range, positions)
- `POST /v1/inventory/shelves/labels` — Generate label PDF for shelf IDs
- `GET /v1/inventory/shelves` — List shelves for store (filterable by zone)
- `POST /v1/inventory/count-sessions` — Create count session
- `POST /v1/inventory/count-sessions/{id}/start` — Start session (move to active)
- `POST /v1/inventory/count-sessions/{id}/devices` — Register device to session
- `POST /v1/inventory/count-sessions/{id}/complete` — Complete session (requires all shelves dual-verified)
- `POST /v1/inventory/shelf-counts/open` — Scan shelf to open count
- `POST /v1/inventory/shelf-counts/{id}/lines` — Add product line to open shelf count
- `POST /v1/inventory/shelf-counts/{id}/close` — Scan shelf to close count
- `GET /v1/inventory/count-sessions/{id}/progress` — Session progress (per zone, per device)
- `GET /v1/inventory/count-sessions/{id}/matches` — Match results and disputes
- `POST /v1/inventory/shelf-matches/{id}/assign-tiebreak` — Assign 3rd device for disputed shelf
- `POST /v1/inventory/shelf-matches/{id}/resolve` — Manager manual resolution

## Business Rules

### Inventory Count Protocol

**Shelf addressing:** `{STORE_CODE}-{ZONE}-{SHELF}{POSITION}` e.g. `GB-003-012B`

**Barcode encoding:** Code 128: `SHELF|GB|003|012|B` or QR with JSON: `{"t":"shelf","s":"GB","z":"003","n":"012","p":"B"}`

**Counting flow:**
1. Scan shelf barcode -> server opens `inventory_shelf_count` (scan_number=1)
2. Scan product barcodes -> create count lines (qty increments on duplicate scan)
3. Scan shelf barcode again -> server closes the shelf count
4. Different device scans same shelf -> server opens scan_number=2
5. After both scans close -> server compares per-product quantities
6. All match -> `matched`. Any mismatch -> `disputed` -> supervisor assigns 3rd device -> majority wins

**Enforcement rules (full count):**
- At least 1 barcode scan per shelf (reject close if zero lines)
- At least 2 closed scans per shelf before session can complete
- Shelf must be closed before opening next (device-enforced)
- Cannot scan a shelf already open by another device

### Spot Check Mode

- Any authorized staff can initiate (no session creation, no device registration)
- Single scan only — no dual verification required
- Staff scans a shelf -> scans products -> closes shelf
- Result is NOT compared against expected stock
- Feeds **Shelf Accuracy KPI:** compare spot check qty vs last full count qty
- If variance exceeds threshold (>15% on 3+ shelves in a zone), flag zone for full count

### Shelf Label Barcode Formats

| Format | Encoding | Best For | Label Size |
|---|---|---|---|
| Code 128 | `SHELF\|GB\|003\|012\|B` | Epson receipt printers, fast linear scan | 80mm x 30mm |
| QR Code | `{"t":"shelf","s":"GB","z":"003","n":"012","p":"B"}` | Camera scanning, more data capacity | 40mm x 40mm |
| Code 39 | `GB003012B` | Zebra label printers, wide compatibility | 100mm x 30mm |
| DataMatrix | Compact binary encoding | Small labels, high density | 20mm x 20mm |

**Recommendation:** Start with QR Code (maximum flexibility).

### Shelf Label Printing

Endpoint `POST /v1/inventory/shelves/labels` accepts: array of shelf IDs + format (qr/code128/code39) + printer_type (zebra/epson/pdf). Returns ZPL commands, ESC/POS commands, or PDF respectively.

**Bulk shelf creation:** `POST /v1/inventory/shelves/bulk` — accepts store, zone range, shelf range, positions -> creates all shelf records.

## Dependencies

- Platform Bootstrap (device enrollment, authentication)
- Android app (`:feature:inventory-count`, `:core:scanner`, `:core:printer`)

## Implementation Notes

- **Phase 0:** Shelf table and bulk creation endpoint
- **Phase 2:** Full inventory count protocol, spot check mode, shelf label printing
- Decision 5: Spot check in MVP, single-scan, KPI-only
- Decision 6: Multiple barcode formats supported, QR default
- Decision 7: Zebra + Epson + PDF printer support
- Decision 15: Dual-scan mandatory on full counts
- Performance target: shelf scan to open < 500ms, product scan < 200ms
