# Operational Supplies
> References: shared/architecture.md, shared/data-model.md

## Overview

Operational supplies are non-resale items that stores need (receipt rolls, shopping bags, cleaning supplies, uniforms, stationery, etc.). They reuse the product infrastructure (same scanning, inventory count, logistics) but are strictly separated from resale products via a `product_class` field. They never appear in the POS sales screen.

## Relevant Tables

`product` (with `product_class = 'operational'`), `category`, `shipment`, `shipment_package`, `shipment_package_line`

## API Routes

Uses existing product, inventory, and logistics routes with `product_class` filter. No dedicated API routes — the separation is enforced by the `product_class` field.

## Business Rules

### Design: Same Tables, Strict Separation

```sql
ALTER TABLE product ADD COLUMN product_class TEXT NOT NULL DEFAULT 'resale'
    CHECK (product_class IN ('resale', 'operational'));
```

### Product Cost Fields (v3.8 dual-track)

```sql
-- System-computed cost (from container/PO cost allocation)
ALTER TABLE product ADD COLUMN system_cost_price NUMERIC(12,4);
ALTER TABLE product ADD COLUMN system_cost_updated_at TIMESTAMPTZ;
ALTER TABLE product ADD COLUMN system_cost_source_id UUID;

-- User-managed manual cost
ALTER TABLE product ADD COLUMN manual_cost_price NUMERIC(12,4);
ALTER TABLE product ADD COLUMN manual_cost_updated_at TIMESTAMPTZ;

-- Which one wins
ALTER TABLE product ADD COLUMN cost_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (cost_source IN ('system', 'manual'));

-- Effective cost (generated column)
ALTER TABLE product ADD COLUMN effective_cost_price NUMERIC(12,4) GENERATED ALWAYS AS (
    CASE
        WHEN cost_source = 'manual' THEN manual_cost_price
        WHEN cost_source = 'system' THEN system_cost_price
        ELSE NULL
    END
) STORED;
```

### Enforcement Rules

- POS product grid ONLY shows `product_class = 'resale'`
- Inventory count can count both classes but reports them separately
- Catalogue PDF generation only includes `resale` products
- Logistics shipments can contain both classes
- Warehouse dashboard shows both with clear visual separation
- Stock alerts work for both classes independently
- AI enrichment only runs on `resale` products

### Pre-built Operational Supply Categories

| Category | Example Items |
|---|---|
| POS Consumables | Receipt rolls, barcode label rolls, printer ribbons, shopping bags |
| Cleaning | Brooms, mops, bins, cleaning sprays, garbage bags |
| Uniforms | Staff shirts, aprons, name tags, lanyards |
| Stationery | Pens, notebooks, cash count sheets, filing folders |
| Store Fixtures | Hangers, price tag guns, sign holders, shelf dividers |
| Packaging | Carton boxes, bubble wrap, tape, gift bags |
| Safety | First aid kit, fire extinguisher, safety signs |

### Warehouse Dispatch Flow

```
STORE requests operational supplies
  -> Request goes to warehouse queue
  -> WAREHOUSE STAFF picks items -> creates shipment -> prints package labels
  -> DRIVER delivers to store (standard parcel template)
  -> STORE scans package QR -> confirms receipt -> stock levels update
```

### Reorder Alerts

```sql
ALTER TABLE product ADD COLUMN min_stock_threshold INTEGER;
ALTER TABLE product ADD COLUMN reorder_quantity INTEGER;
```

When stock falls below `min_stock_threshold`:
1. Alert in web console dashboard
2. Optionally auto-create supply request to warehouse
3. Notification to store supervisor

### Not Yet Covered

- Purchase orders to external suppliers for operational supplies
- Supplier management for operational items
- Cost allocation of operational supplies to stores
- Depreciation of store fixtures

## Dependencies

- Logistics module (warehouse dispatch, package delivery)
- Inventory module (stock counting, shelf register)
- Reports module (separate operational vs resale reporting)

## Implementation Notes

- **Phase 2:** Add `product_class` field, operational supply categories, reorder alerts
- Decision 28: Same `product` table, `product_class='operational'`, never shown in POS
