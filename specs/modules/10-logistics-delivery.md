# Logistics and Delivery
> References: shared/architecture.md, shared/data-model.md

## Overview

The logistics module manages goods movement between warehouses, stores, and customers using template-based delivery workflows. Different delivery types (standard parcel, motorcycle handover, inter-store transfer) have radically different step sequences. The module also handles cash-on-delivery collection, store daily cash collection, package labeling with QR codes, and driver reconciliation.

## Relevant Tables

`delivery_template`, `delivery_template_step`, `shipment`, `shipment_package`, `shipment_package_line`, `shipment_step_completion`, `cod_payment`, `cash_collection`

## API Routes

### Logistics

- `POST /v1/logistics/shipments` — Create shipment
- `GET /v1/logistics/shipments` — List shipments (filtered by status, driver, store)
- `GET /v1/logistics/shipments/{id}` — Shipment detail with packages and step progress
- `POST /v1/logistics/shipments/{id}/assign` — Assign driver
- `POST /v1/logistics/shipments/{id}/pickup` — Driver confirms pickup
- `POST /v1/logistics/shipments/{id}/deliver` — Driver confirms delivery complete
- `POST /v1/logistics/packages` — Create package within shipment
- `POST /v1/logistics/packages/{id}/label` — Generate package label (QR)
- `POST /v1/logistics/packages/{id}/scan` — Record package scan event
- `POST /v1/logistics/packages/{id}/receive` — Recipient confirms package received
- `POST /v1/logistics/shipments/{id}/steps/{step_id}/complete` — Complete a delivery template step
- `GET /v1/logistics/templates` — List delivery templates
- `POST /v1/logistics/templates` — Create delivery template
- `POST /v1/logistics/pickup-requests` — Store requests driver pickup
- `POST /v1/logistics/shipments/{id}/cod/collect` — Driver records COD payment
- `GET /v1/logistics/cod/pending` — List undeposited COD cash per driver
- `POST /v1/logistics/cod/{payment_id}/deposit` — Driver records cash deposit
- `POST /v1/logistics/cod/{payment_id}/reconcile` — Manager confirms reconciliation
- `GET /v1/logistics/cod/report?driver_id=&period=` — COD collection summary report

### Cash Collection

- `POST /v1/cash-collection/declare` — Store declares cash ready for collection
- `POST /v1/cash-collection/{id}/collect` — Driver scans QR, confirms collection, dual signature
- `POST /v1/cash-collection/{id}/deposit` — Driver records bank deposit
- `POST /v1/cash-collection/{id}/reconcile` — Manager reconciles
- `GET /v1/cash-collection/in-transit` — Cash currently being transported
- `GET /v1/cash-collection/report?period=` — Collection reconciliation report

## Business Rules

### Default Delivery Templates

**Template 1: Standard Parcel**
1. `scan_package` — Scan each package QR (required)
2. `photo_capture` — Photo at pickup (optional)
3. `photo_capture` — Photo at delivery (required)
4. `collect_payment` — If COD: collect cash, enter amount, photo evidence (if COD)
5. `signature` — Recipient signs on phone (required)
6. `confirmation` — Confirm delivery complete (required)

**Template 2: Motorcycle Handover**
1. `scan_package` — Scan vehicle QR (required)
2. `photo_capture` — 4-angle condition photos (required)
3. `text_input` — Record VIN/chassis number (required)
4. `key_handover` — Key set count + serial (required)
5. `checklist` — Brakes, lights, horn, battery, tires, mirrors (required)
6. `warranty_explain` — Confirm warranty explained (required)
7. `text_input` — Customer questions/notes (optional)
8. `collect_payment` — If COD balance due (if COD)
9. `signature` — Customer signs acceptance (required)
10. `photo_capture` — Customer with vehicle (optional)
11. `confirmation` — Handover complete (required)

**Template 3: Inter-Store Transfer**
1. `scan_package` — Scan at origin (required)
2. `scan_package` — Scan at destination (required)
3. `signature` — Receiving staff signs (required)
4. `confirmation` — Transfer complete (required)

**Template 4: Pickup Request**
1. `confirmation` — Driver confirms pickup location (required)
2. `scan_package` — Scan packages at pickup (required)
3. `photo_capture` — Photo of loaded packages (optional)
4. `confirmation` — Pickup complete, in transit (required)

### Package Labels

Every package gets a QR label printed before shipment.
QR encoding: `{"t":"pkg","id":"PKG-20260319-001-01","s":"SHP-20260319-001"}`

### Cash on Delivery (COD)

- Shipment marked as COD with `cod_required=true` and `cod_amount`
- Driver enters amount received, payment method, takes evidence photo
- Change auto-calculated
- End of shift: driver sees total collected, must deposit all cash
- Cannot complete shift with undeposited cash (alert to supervisor if > 24 hours)

### Store Cash Collection (Daily Sales Cash)

```
End of day -> store closes till -> reconciliation done
-> Manager seals cash, enters amount, takes photo, generates Collection QR
-> Driver scans QR, verifies amount, both sign on phone, photo taken
-> Driver may visit multiple stores
-> At bank: driver deposits, enters slip number, photos deposit slip
-> Manager reviews three-way match: declared vs collected vs deposited
-> Any discrepancy flagged for investigation
```

### Mandatory QR Label Printer Per Store

Every store MUST have a QR label printer. It prints: product labels, shelf labels, package labels, inventory count zone cards, asset tags, return labels.

**Store setup checklist:**
- POS terminal (Android device)
- Receipt printer (Epson ePOS)
- **QR label printer (Zebra or equivalent) — MANDATORY**
- Barcode scanner
- Cash drawer
- Attendance QR stations

## Dependencies

- Platform Bootstrap (device enrollment, auth)
- Inventory module (stock adjustments on store-to-store transfer)
- POS module (till session linking for cash collection)

## Implementation Notes

- **Phase 2:** Basic logistics — shipments, packages, labels, standard parcel template, package scanning
- **Phase 3:** Full delivery templates, motorcycle handover, inter-store transfers, driver assignment, COD, store cash collection
- Decision 26: Template-based delivery workflow
- Decision 29: COD tracked per shipment with driver reconciliation
- Decision 30: Zebra label printer mandatory per store
- Decision 32: Store cash collection with three-way reconciliation
