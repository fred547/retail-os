# Barcode My Store
> References: shared/architecture.md, shared/data-model.md

## Overview

"Barcode My Store" is a guided workflow that turns an unbarcoded store into a fully barcoded one, shelf by shelf, using only a phone camera. Staff photographs products on each shelf, AI identifies them, the owner reviews and approves, products are created with auto-generated barcodes, and labels print in shelf walking order. This eliminates the adoption barrier of manual product entry.

## Relevant Tables

`barcode_session`, `barcode_capture`, `shelf`, `product`, `product_enrichment`, `product_media`

## API Routes

- `POST /v1/barcode-my-store/sessions` — Start a barcoding session
- `POST /v1/barcode-my-store/sessions/{id}/shelves/{shelf_id}/capture` — Capture product photo on shelf
- `POST /v1/barcode-my-store/sessions/{id}/ai-process` — Trigger AI identification for all captures
- `GET /v1/barcode-my-store/sessions/{id}/review` — Get captures with AI suggestions for review
- `POST /v1/barcode-my-store/captures/{id}/accept` — Accept AI suggestion -> create product
- `POST /v1/barcode-my-store/captures/{id}/edit` — Edit and accept -> create product
- `POST /v1/barcode-my-store/captures/{id}/skip` — Skip this capture
- `POST /v1/barcode-my-store/captures/{id}/duplicate` — Mark as duplicate of another product
- `POST /v1/barcode-my-store/sessions/{id}/print-labels` — Generate labels in shelf walking order
- `GET /v1/barcode-my-store/sessions/{id}/progress` — Session progress dashboard

## Business Rules

### The Flow

1. **Prep:** Group similar items on each shelf. One product type per group.
2. **Scan shelf** (or create one if no labels yet)
3. **How many different products** on this shelf? (1-8+)
4. **Photograph each product** — show front label or brand name clearly
5. **Enter quantity** for each product, optional price
6. **Shelf complete** — proceed to next shelf or done for now

### After Capture: AI Product Identification

1. AI examines each photo — identifies product name, brand, category, color, size
2. AI suggests a product name and description
3. AI groups potential duplicates — "This looks like the same sandal you photographed on shelf 2"
4. Owner reviews suggestions one by one — same Accept/Edit/Skip UI as onboarding

### What Happens After Approval

1. Product created in master `product` table with auto-generated SKU
2. Barcode assigned — system generates EAN-13 or internal format
3. Product linked to shelf
4. Initial stock set from capture quantity
5. Product image stored in Cloudinary

### Label Printing Phase

Labels print in **shelf sequence order** (zone -> shelf number -> position -> alphabetical by product name within shelf). The person sticking labels walks through the store in a natural path.

Each label includes: product barcode, product name, price, shelf location, small QR code linking to product details.

### Integration with Existing Systems

- **Shelf register:** Uses same `shelf` table. Creates shelves on the fly if they don't exist.
- **Product enrichment:** Accepted products optionally sent to AI enrichment pipeline for richer descriptions.
- **Inventory count:** After barcoding, opening stock quantities become the baseline — first "count" is done.
- **POS:** Products appear in POS grid immediately after acceptance.

### Schema

```sql
CREATE TABLE barcode_session (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES store(id),
    started_by      UUID NOT NULL REFERENCES "user"(id),
    status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'photos_complete', 'ai_processing',
                                      'review', 'labels_printed', 'completed')),
    shelves_total   INTEGER NOT NULL DEFAULT 0,
    shelves_done    INTEGER NOT NULL DEFAULT 0,
    products_found  INTEGER NOT NULL DEFAULT 0,
    products_approved INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE barcode_capture (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES barcode_session(id),
    shelf_id        UUID NOT NULL REFERENCES shelf(id),
    position_on_shelf INTEGER NOT NULL,
    photo_url       TEXT NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    price           NUMERIC(12,2),
    ai_suggested_name TEXT,
    ai_suggested_category TEXT,
    ai_confidence   NUMERIC(3,2),
    ai_duplicate_of UUID REFERENCES barcode_capture(id),
    status          TEXT NOT NULL DEFAULT 'captured'
                    CHECK (status IN ('captured', 'ai_processed', 'accepted',
                                      'edited', 'skipped', 'duplicate')),
    product_id      UUID REFERENCES product(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Dependencies

- AI Catalogue module (enrichment pipeline, Claude API)
- Inventory module (shelf register)
- Printer module (label generation)
- Cloudinary (photo storage)

## Implementation Notes

- **Phase 3:** Full "Barcode My Store" feature
- Android module: `:feature:barcode-my-store`
- Decision 33: Guided shelf-by-shelf workflow with AI product ID
- Decision 34: AI product identification from photos uses same Claude pipeline
