# Screen: POS — Product Detail
> Module: modules/04-pos-and-transactions.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Detailed view of a single product showing image, pricing, stock levels, barcode, and quick-action buttons.

## Layout
- Back button to products
- Full-width product image (180px height, 14px border-radius)
- Product name at 20px/800
- SKU and category info at 13px muted
- Price at 24px/800 blue
- Two metric cards in 2-column grid (Glass component):
  - IN STOCK: count at 18px/800
  - SOLD TODAY: count at 18px/800
- Barcode field (read-only)
- VAT rate field (read-only)
- Two action buttons side by side: "ADD TO CART" (secondary) | "QUICK SALE" (primary)

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Glass (metric cards)
- Field (barcode, VAT rate display)
- Btn48 (add to cart, quick sale)

## Data Requirements
- Product: name, SKU, category, price, image, barcode, VAT rate
- Stock level for current store
- Sales count for today

## User Actions
- Tap "ADD TO CART" to add product and return to POS
- Tap "QUICK SALE" for immediate single-item sale
- Tap Back to return to products

## Design Notes
- Image: full-width, 180px height, object-fit cover, 14px border-radius
- Metric cards: Glass component, 12px padding, 12px border-radius
- Metric labels: 11px/800 muted; values: 18px/800
