# Loyalty Redemption Marketplace
> References: shared/architecture.md, shared/data-model.md

## Overview

The loyalty redemption marketplace allows any merchant to list products for point redemption. Posterita takes a 10% commission on every redemption. Points are burned (destroyed) on redemption, reducing Posterita's liability. Customers can browse and redeem via WhatsApp. This creates a network effect — more redemption options make the loyalty program more valuable.

## Relevant Tables

`redemption_catalog_item`, `redemption_transaction`, `loyalty_wallet`, `loyalty_transaction`, `customer`

## API Routes

- `POST /v1/redemption/catalog` — Create catalog item
- `GET /v1/redemption/catalog` — List catalog (filters: brand, category, points range)
- `GET /v1/redemption/catalog/{id}` — Catalog item detail
- `PUT /v1/redemption/catalog/{id}` — Update catalog item
- `POST /v1/redemption/redeem` — Redeem points for catalog item
- `GET /v1/redemption/transactions` — List redemption transactions
- `GET /v1/redemption/transactions/{id}` — Transaction detail
- `POST /v1/redemption/transactions/{id}/fulfill` — Mark as fulfilled

## Business Rules

### The Model

1. Any merchant can list products in the redemption catalog with a point price
2. Posterita takes a 10% commission on every redemption
3. Customer redeems 1,000 points -> merchant receives 900 points' worth ($9.00)
4. Posterita retains 100 points' worth ($1.00) as commission
5. Points are burned (destroyed) on redemption — reducing liability

### Commission Structure

| Tier | Commission | Criteria |
|---|---|---|
| Standard | 10% | Default for all merchants |
| Volume | 8% | >500 redemptions/month |
| Premium Placement | 15% | Featured position in catalog |

### Key Accounting Rule

When a redemption occurs:
- Customer's wallet: -1,000 points (debit via `loyalty_transaction`)
- Posterita's liability: -$10.00 (1,000 points destroyed)
- Merchant receives: $9.00 equivalent value (credit to settlement account)
- Posterita's revenue: $1.00 commission

The points are burned, not transferred.

### Schema

```sql
CREATE TABLE redemption_catalog_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organization(id),
    brand_id            UUID NOT NULL REFERENCES brand(id),
    product_id          UUID REFERENCES product(id),
    title               TEXT NOT NULL,
    description         TEXT,
    image_url           TEXT,
    points_price        INTEGER NOT NULL,
    retail_value         NUMERIC(12,2),
    commission_rate     NUMERIC(4,3) NOT NULL DEFAULT 0.100,
    max_redemptions     INTEGER,
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    available_from      TIMESTAMPTZ,
    available_until     TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'exhausted', 'expired')),
    featured            BOOLEAN NOT NULL DEFAULT false,
    created_by          UUID NOT NULL REFERENCES "user"(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE redemption_transaction (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id     UUID NOT NULL REFERENCES redemption_catalog_item(id),
    customer_id         UUID NOT NULL REFERENCES customer(id),
    wallet_id           UUID NOT NULL REFERENCES loyalty_wallet(id),
    points_spent        INTEGER NOT NULL,
    commission_points   INTEGER NOT NULL,
    merchant_points     INTEGER NOT NULL,
    commission_rate     NUMERIC(4,3) NOT NULL,
    points_spent_usd    NUMERIC(12,2) NOT NULL,
    commission_usd      NUMERIC(12,2) NOT NULL,
    merchant_payout_usd NUMERIC(12,2) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'fulfilled',
                                          'cancelled', 'refunded')),
    fulfilled_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### WhatsApp Integration

- "REDEEM" trigger -> shows top catalog items as button list
- Customer selects item -> confirmation with points balance and cost
- Customer confirms -> points deducted, merchant notified, fulfillment tracked

All messages sent from Posterita Loyalty's WhatsApp number on behalf of the merchant's brand.

## Dependencies

- Loyalty module (wallet, points deduction)
- WhatsApp module (browse and redeem flow)

## Implementation Notes

- **Post-MVP / Phase 3:** Loyalty redemption marketplace
- Open item 11: Commission rate finalization (default 10%, tiered structure designed)
- Decision 41: Any merchant can list, 10% commission, points burned on redemption
