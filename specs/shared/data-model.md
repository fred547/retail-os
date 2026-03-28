# Data Model

> Extracted from Posterita Master Plan v3.9 — Section 9 (Source-of-Truth Data Model)
>
> **NOTE:** This file contains the ASPIRATIONAL data model from the master plan.
> For the ACTUAL production schema, see `specs/shared/current-state.md` which
> lists all 45+ tables with their real column names and types.
> Key differences: actual uses TEXT account_id (not UUID), SERIAL PKs (not UUIDv7),
> no billing tables, no consent records. Migrations are in `supabase/migrations/00001-00049`.

---

## 9. Source-of-Truth Data Model

### Core Entities (v2 + expanded)

**Organization & Structure:**
`Organization`, `Brand`, `Store`, `Terminal`, `Printer`, `Shelf`

**Identity & Access:**
`User`, `Role`, `CapabilityProfile`, `Device`, `DeviceAssignment`, `DeviceHeartbeat`, `RevocationVersion`, `CapabilitySnapshot`

**POS & Transactions:**
`Order`, `OrderLine`, `Payment`, `TillSession`, `TillReconciliation`, `ReconciliationEvidence`

**Customer & Loyalty:**
`Customer`, `LoyaltyWallet`, `LoyaltyTransaction`, `LoyaltyIssuancePending`, `ConsentRecord`, `Voucher`, `Campaign`

**Inventory:**
`Product`, `Category`, `Barcode`, `InventoryCountSession`, `InventoryCountDevice`, `InventoryShelfCount`, `InventoryShelfCountLine`, `InventoryShelfMatch`, `StockEvent`

**Requests & Workflow:**
`Request`, `Task`, `Approval`, `ApprovalRequest`

**Workforce:**
`LeaveRequest`, `AttendanceEvent`, `ExpenseClaim`, `Asset`, `MaintenanceTicket`

**Shifts:**
`ShiftTemplate`, `PublicHoliday`, `ShiftSelection`, `AttendanceLog`

**Compliance:**
`DataDeletionRequest`

**Files & Audit:**
`Attachment`, `AuditEvent`

**Agent:**
`AgentTask`, `AgentCommand`

**Vendor & Procurement:**
`Vendor`, `VendorAugmentation`, `SourcingRequirement`, `Rfq`, `RfqAttachment`, `ProcurementEmail`, `ExchangeRate`

**AI Augmentation:**
`CustomerAugmentation`, `VendorAugmentation`, `ProductAugmentation`

**Loyalty Marketplace:**
`RedemptionCatalogItem`, `RedemptionTransaction`

**OTB & Stock Cover Planning:**
`SellingPeriod`, `OtbPlan`

### Key Schema Design Decisions

1. **UUIDs everywhere.** All primary keys are UUIDv7 (time-sortable). No auto-increment integers exposed externally.
2. **Soft deletes on business entities.** `deleted_at` timestamp, never hard delete in application code.
3. **Immutable orders.** Once `completed`, only refundable via a linked refund order.
4. **Temporal columns on all tables:** `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`.
5. **`idempotency_key` on all mutation-accepting tables** to support offline push replay.
6. **RLS policies** enforce tenant isolation at the Supabase level.
7. **Sync direction is configuration, not code.**
8. **`store_id` on all store-scoped entities.**
9. **DPA compliance built in.** Consent records are append-only with full audit trail.
10. **Wallet balance is denormalized.** `loyalty_wallet.balance` = `SUM(points_change)` from transactions. Nightly reconciliation job verifies.
11. **Consent is dual-scope.** Brand-level AND product-level, with separate promo/news flags per Meta requirements.
12. **Inventory count is dual-verified.** Every shelf requires 2 independent scans that must match.

---

### Account Schema

```sql
-- ═══════════ OWNER ═══════════
CREATE TABLE owner (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    email           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ ACCOUNT (billing entity) ═══════════
CREATE TABLE account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES owner(id),
    plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    billing_status  TEXT NOT NULL DEFAULT 'active'
                    CHECK (billing_status IN ('active', 'trial', 'past_due', 'cancelled')),
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization already exists in the schema; add account reference:
ALTER TABLE organization ADD COLUMN account_id UUID REFERENCES account(id);
ALTER TABLE organization ADD COLUMN owner_id UUID REFERENCES owner(id);
```

---

### Customer & Loyalty Schema

```sql
-- ═══════════ CUSTOMER ═══════════
CREATE TABLE customer (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT NOT NULL UNIQUE,       -- E.164: +23054239978
    phone_plain     TEXT GENERATED ALWAYS AS (regexp_replace(phone, '^\+', '')) STORED,
    name            TEXT NOT NULL DEFAULT 'Customer',
    email           TEXT,
    whatsapp_name   TEXT,
    source          TEXT NOT NULL DEFAULT 'pos'
                    CHECK (source IN ('pos', 'whatsapp', 'web', 'qr_scan', 'import')),
    store_id        UUID REFERENCES store(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES "user"(id)
);

-- ═══════════ LOYALTY WALLET ═══════════
CREATE TABLE loyalty_wallet (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customer(id),
    organization_id     UUID NOT NULL REFERENCES organization(id),
    balance             INTEGER NOT NULL DEFAULT 0,
    lifetime_earned     INTEGER NOT NULL DEFAULT 0,
    lifetime_redeemed   INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'closed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_id, organization_id)
);

-- ═══════════ LOYALTY TRANSACTION LEDGER ═══════════
CREATE TABLE loyalty_transaction (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id           UUID NOT NULL REFERENCES loyalty_wallet(id),
    customer_id         UUID NOT NULL REFERENCES customer(id),
    transaction_type    TEXT NOT NULL
                        CHECK (transaction_type IN (
                            'order_earn', 'redeem', 'survey', 'staff_issuance',
                            'campaign_award', 'voucher_redeem', 'adjustment', 'expiry'
                        )),
    points_change       INTEGER NOT NULL,       -- positive = earn, negative = spend
    reference_code      TEXT NOT NULL,           -- SO-2026-000985, RED-2026-000030, etc.
    order_id            UUID REFERENCES "order"(id),
    store_id            UUID REFERENCES store(id),
    channel             TEXT NOT NULL DEFAULT 'pos'
                        CHECK (channel IN ('pos', 'whatsapp', 'web', 'system')),
    description         TEXT,
    idempotency_key     UUID UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES "user"(id)
);

-- ═══════════ ISSUANCE PENDING (staff → customer claim) ═══════════
CREATE TABLE loyalty_issuance_pending (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID NOT NULL REFERENCES loyalty_wallet(id),
    customer_id     UUID NOT NULL REFERENCES customer(id),
    points          INTEGER NOT NULL CHECK (points > 0),
    issued_by       UUID NOT NULL REFERENCES "user"(id),
    store_id        UUID NOT NULL REFERENCES store(id),
    claim_token     TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'claimed', 'expired', 'cancelled')),
    expires_at      TIMESTAMPTZ NOT NULL,
    claimed_at      TIMESTAMPTZ,
    transaction_id  UUID REFERENCES loyalty_transaction(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ CONSENT (Meta-compliant, dual-scope, append-only) ═══════════
CREATE TABLE consent_record (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id),
    scope           TEXT NOT NULL DEFAULT 'brand'
                    CHECK (scope IN ('brand', 'product')),
    scope_ref       TEXT,                       -- NULL for brand, product_code for product
    promo_consent   BOOLEAN NOT NULL DEFAULT false,
    news_consent    BOOLEAN NOT NULL DEFAULT false,
    consent_status  TEXT NOT NULL DEFAULT 'none'
                    CHECK (consent_status IN ('none', 'subscribed', 'unsubscribed')),
    source          TEXT NOT NULL,
    granted_at      TIMESTAMPTZ,
    withdrawn_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ VOUCHER ═══════════
CREATE TABLE voucher (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    customer_id     UUID REFERENCES customer(id),
    campaign_id     UUID REFERENCES campaign(id),
    code            TEXT NOT NULL UNIQUE,
    voucher_type    TEXT NOT NULL
                    CHECK (voucher_type IN ('fixed_discount', 'percent_discount', 'free_item', 'points_multiplier')),
    value           NUMERIC(12,2) NOT NULL,
    min_spend       NUMERIC(12,2) DEFAULT 0,
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until     TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    redeemed_at     TIMESTAMPTZ,
    redeemed_order_id UUID REFERENCES "order"(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ CAMPAIGN ═══════════
CREATE TABLE campaign (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    campaign_type   TEXT NOT NULL
                    CHECK (campaign_type IN ('voucher', 'survey', 'points_bonus', 'announcement')),
    reward_type     TEXT CHECK (reward_type IN ('fixed_discount', 'percent_discount', 'points', 'free_item', NULL)),
    reward_value    NUMERIC(12,2),
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    audience_scope  TEXT NOT NULL DEFAULT 'brand'
                    CHECK (audience_scope IN ('brand', 'promo_consented', 'product_consented', 'all_customers')),
    estimated_reach INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Loyalty Points Rules (configurable per brand)

Points earning rate is configured per organization/brand, stored in an `organization_loyalty_config` table:

```sql
CREATE TABLE organization_loyalty_config (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organization(id) UNIQUE,
    points_per_currency_unit NUMERIC(8,4) NOT NULL DEFAULT 0.01,  -- e.g. 0.01 = 1pt per Rs100
    currency            TEXT NOT NULL DEFAULT 'MUR',
    min_points_per_txn  INTEGER NOT NULL DEFAULT 1,              -- never award 0
    signup_bonus        INTEGER NOT NULL DEFAULT 100,
    survey_reward       INTEGER NOT NULL DEFAULT 20,
    enable_expiry       BOOLEAN NOT NULL DEFAULT false,
    expiry_months       INTEGER DEFAULT 12,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Event | Points | Reference Format | Channel |
|---|---|---|---|
| Purchase at POS | `floor(order_total * points_per_currency_unit)`, min `min_points_per_txn` | `SO-{year}-{seq6}` | pos |
| Signup bonus | Per org config (default 100) | `SIGNUP-{year}-{seq4}` | pos/whatsapp |
| WhatsApp survey | Per org config (default 20) | `SURVEY-{year}-{seq4}` | whatsapp |
| Staff manual issuance | Variable | `ISS-{code}` | pos |
| Campaign award | Per campaign config | `CAMP-{code}-{seq}` | system |
| Redemption | Negative | `RED-{year}-{seq6}` | pos/whatsapp |

---

### Inventory Count Schema

```sql
-- ═══════════ SHELF REGISTER ═══════════
CREATE TABLE shelf (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES store(id),
    zone_code       TEXT NOT NULL,              -- '001' to '999'
    shelf_number    TEXT NOT NULL,              -- '001' to '999'
    position        TEXT NOT NULL DEFAULT '',   -- '', 'A', 'B', 'C', etc.
    barcode_data    TEXT NOT NULL UNIQUE,       -- 'SHELF|GB|003|012|B'
    label_printed   BOOLEAN NOT NULL DEFAULT false,
    display_name    TEXT,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, zone_code, shelf_number, position)
);

-- ═══════════ COUNT SESSION ═══════════
CREATE TABLE inventory_count_session (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES store(id),
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning', 'active', 'review', 'completed', 'cancelled')),
    session_type    TEXT NOT NULL DEFAULT 'full_count'
                    CHECK (session_type IN ('full_count', 'spot_check')),
    initiated_by    UUID NOT NULL REFERENCES "user"(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ DEVICE REGISTRATION PER SESSION ═══════════
CREATE TABLE inventory_count_device (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES inventory_count_session(id),
    device_id       UUID NOT NULL REFERENCES device(id),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    status          TEXT NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'counting', 'done')),
    zones_assigned  TEXT[],
    shelves_completed INTEGER NOT NULL DEFAULT 0,
    shelves_total    INTEGER NOT NULL DEFAULT 0,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ SHELF COUNT (one per shelf per scan) ═══════════
CREATE TABLE inventory_shelf_count (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES inventory_count_session(id),
    shelf_id        UUID NOT NULL REFERENCES shelf(id),
    device_id       UUID NOT NULL REFERENCES device(id),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    scan_number     INTEGER NOT NULL DEFAULT 1,   -- 1=first, 2=second, 3=tiebreak
    status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed', 'disputed')),
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    idempotency_key UUID UNIQUE,
    UNIQUE(session_id, shelf_id, scan_number)
);

-- ═══════════ COUNT LINE (products on shelf) ═══════════
CREATE TABLE inventory_shelf_count_line (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_count_id  UUID NOT NULL REFERENCES inventory_shelf_count(id),
    product_id      UUID NOT NULL REFERENCES product(id),
    barcode_scanned TEXT NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    scan_method     TEXT NOT NULL DEFAULT 'barcode'
                    CHECK (scan_method IN ('barcode', 'qr', 'manual_qty')),
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ SHELF MATCH RESULT ═══════════
CREATE TABLE inventory_shelf_match (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES inventory_count_session(id),
    shelf_id        UUID NOT NULL REFERENCES shelf(id),
    scan_1_id       UUID NOT NULL REFERENCES inventory_shelf_count(id),
    scan_2_id       UUID NOT NULL REFERENCES inventory_shelf_count(id),
    scan_3_id       UUID REFERENCES inventory_shelf_count(id),
    match_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (match_status IN ('pending', 'matched', 'disputed', 'resolved')),
    mismatched_products JSONB,
    resolved_by     UUID REFERENCES "user"(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

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

Spot checks are a lighter-weight continuous inventory control mechanism. They don't replace full counts — they generate KPIs that tell you WHEN a full count is needed.

- Any authorized staff can initiate a spot check (no session creation, no device registration)
- Single scan only — no dual verification required
- Staff scans a shelf -> scans products -> closes shelf
- Result is recorded but NOT compared against expected stock
- Spot check data feeds a **Shelf Accuracy KPI**

### Shelf Label Barcode Format Options

| Format | Encoding | Best For | Label Size |
|---|---|---|---|
| Code 128 | `SHELF\|GB\|003\|012\|B` | Epson receipt printers, fast linear scan | 80mm x 30mm |
| QR Code | `{"t":"shelf","s":"GB","z":"003","n":"012","p":"B"}` | Camera scanning, more data capacity | 40mm x 40mm |
| Code 39 | `GB003012B` | Zebra label printers, wide compatibility | 100mm x 30mm |
| DataMatrix | Compact binary encoding | Small labels, high density | 20mm x 20mm |

---

### Shift Planning Schema

```sql
CREATE TABLE shift_template (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES store(id),
    shift_code      TEXT NOT NULL UNIQUE,
    shift_name      TEXT NOT NULL,
    shift_number    INTEGER NOT NULL,
    role_code       TEXT NOT NULL,
    day_type        TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'public_holiday')),
    applies_on      TEXT NOT NULL DEFAULT 'all',
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    max_staff_count INTEGER NOT NULL DEFAULT 1,
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public_holiday (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country         TEXT NOT NULL DEFAULT 'Mauritius',
    holiday_code    TEXT NOT NULL UNIQUE,
    holiday_name    TEXT NOT NULL,
    holiday_date    DATE NOT NULL,
    date_status     TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (date_status IN ('confirmed', 'subject_to_confirmation')),
    notes           TEXT,
    active          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE shift_selection (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_template_id   UUID NOT NULL REFERENCES shift_template(id),
    user_id             UUID NOT NULL REFERENCES "user"(id),
    shift_date          DATE NOT NULL,
    plan_week_start     DATE NOT NULL,
    selection_code      TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at         TIMESTAMPTZ,
    approved_by         UUID REFERENCES "user"(id),
    manager_note        TEXT,
    holiday_name        TEXT
);

CREATE TABLE attendance_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_selection_id  UUID REFERENCES shift_selection(id),
    user_id             UUID NOT NULL REFERENCES "user"(id),
    store_id            UUID NOT NULL REFERENCES store(id),
    scan_direction      TEXT NOT NULL CHECK (scan_direction IN ('time_in', 'time_out')),
    scan_timestamp      TIMESTAMPTZ NOT NULL,
    scan_source         TEXT NOT NULL DEFAULT 'qr'
                        CHECK (scan_source IN ('qr', 'manual', 'gps', 'nfc')),
    qr_token            TEXT,
    attendance_code     TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'captured',
    idempotency_key     UUID UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

*v2 schema design decisions, data storage rules, and all other §9 content remain in effect.*
