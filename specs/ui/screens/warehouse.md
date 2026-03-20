# Screen: Warehouse — Container Receiving
> Module: modules/17-warehouse.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Warehouse container receiving workflow: list pending/completed containers, manage shipping documents, inspect goods against PO, calculate landed costs, and release stock to stores.

## Layout (4-step flow)

### Step 1: Container List
- TopBar: "Warehouse" + "Container receiving" subtitle
- Container cards: ID, vendor, item count, arrival date, status pill (Pending/Complete)

### Step 2: Document Vault
- TopBar: container ID + "Document vault" subtitle
- Document cards: Bill of Lading, Packing List, Commercial Invoice
  - Each shows: document icon, name, type, status checkmark or spinner
- "Upload Document" button (camera icon)
- "Start Inspection" CTA

### Step 3: Inspection
- TopBar: "Inspection" + container ID
- Per-item cards: product name, expected vs received quantities
  - Status: Accept (green) or Claim (red)
  - Shortages: red text showing short quantity with "file claim with vendor" note
- "Complete Inspection" CTA

### Step 4: Release to Stores
- TopBar: "Release to Stores" + container ID
- Allocation card: per-store item allocation
- Landed cost card (amberLight):
  - FOB, Freight, Duty %, Total landed cost
- "Release Stock" success button

## Key Components Used
- TopBar
- Card (container items, documents, inspection items, allocation)
- StatusPill (container status, item accept/claim)
- Icon (doc, camera)
- Btn (upload, inspect, complete, release)

## Data Requirements
- Container list: ID, vendor, items, arrival date, status
- Shipping documents: type, upload status
- PO items: product, expected qty, received qty
- Landed cost calculation: FOB, freight, duty rate
- Store allocation plan

## User Actions
- Select container for processing
- Upload/view shipping documents
- Inspect items against PO (accept or file claim)
- Review landed cost breakdown
- Release stock to stores

## Design Notes
- Container cards: 24px border-radius, flex space-between, status pill right-aligned
- Completed containers: opacity 0.6 to visually de-emphasize
- Document cards: flex layout with doc icon (18px, blue), name, and status indicator
- Inspection items: standard Card, flex space-between, shortage text in red 11px
- Landed cost card: amberLight background, amber 33% border, stacked rows
- Total landed: separated by top border with amber 44% opacity, 13px/700 weight
