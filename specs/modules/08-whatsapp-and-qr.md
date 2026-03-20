# WhatsApp and QR
> References: shared/architecture.md, shared/data-model.md

## Overview

WhatsApp is the primary customer-facing channel and the QR code is the primary customer acquisition mechanism. Every QR in the physical environment (products, shelves, catalogues, receipts, storefronts) funnels into WhatsApp, which captures the customer's phone number and starts the loyalty onboarding pipeline. The backend handles all bot logic; SalesIQ is middleware only; Zobot is a thin ~50-line relay.

## Relevant Tables

`customer`, `loyalty_wallet`, `consent_record`, `qr_scan_event`, `campaign`, `voucher`

## API Routes

### WhatsApp

- `POST /v1/whatsapp/inbound` — Receive message from SalesIQ relay
- `POST /v1/whatsapp/flows/registration` — Trigger registration WhatsApp Flow
- `POST /v1/whatsapp/flows/survey` — Trigger survey WhatsApp Flow
- `POST /v1/whatsapp/templates/send` — Send approved template message
- `GET /v1/whatsapp/templates` — List approved Meta templates

### QR Generation

- `POST /v1/qr/product/{sku}` — Generate product QR (WhatsApp deep link)
- `POST /v1/qr/store/{store_code}` — Generate store welcome QR
- `POST /v1/qr/receipt/{order_ref}` — Generate receipt QR
- `POST /v1/qr/package/{package_id}` — Generate package QR (in-app deep link)
- `POST /v1/qr/attendance/{store_code}/{direction}` — Generate attendance station QR
- `POST /v1/qr/bulk` — Batch generate QR codes
- `GET /v1/analytics/showroom-funnel?store_id=&period=` — Showroom funnel report data

### CRM Connector (internal, event-triggered via BullMQ)

- On customer create/update -> upsert Zoho CRM Contact
- On loyalty enrollment -> set `Posterita_Loyalty_Enrolled = true`
- On consent change -> set `WhatsApp_Marketing_Consent` + timestamp
- On balance change -> update `Loyalty_Points` field
- On voucher redemption -> add CRM Note

## Business Rules

### Architecture

```
Customer (WhatsApp)
    |
Meta Cloud API
    |
Zoho SalesIQ (WhatsApp middleware)
    | webhook to backend
NestJS WhatsApp module
    |
Supabase (customer, wallet, consent)
    | async BullMQ job
Zoho CRM (one-way push for support)
```

### SalesIQ Zobot — Thin Relay (~50 lines Deluge)

Forwards everything to the backend, returns backend response to customer.

### WhatsApp Flows

**Flow 1: Registration + Consent (QR scan in showroom)**
- Screen 1: Welcome + name/phone pre-filled
- Screen 2: Optional email input
- Screen 3: Consent checkboxes (promos + news, separately)
- Screen 4: Confirmation with bonus points

**Flow 2: Survey (earn bonus points)**
- Screen 1: 3 quick questions
- Screen 2: Points awarded confirmation

### Outbound Templates (require Meta approval)

| Template | Trigger | Variables |
|---|---|---|
| `loyalty_welcome` | Registration | name, points |
| `points_earned` | POS purchase | name, points, store, balance |
| `voucher_issued` | Campaign/reward | name, desc, code, expiry |
| `voucher_expiring` | 3 days before expiry (cron) | name, desc, code, days_left |
| `digital_receipt` | Sale + customer linked | name, order_ref, total, store |
| `survey_invite` | Campaign trigger | name, survey_name, points_reward |
| `consent_renewal` | Annual re-confirmation | name |

### QR-First Customer Acquisition Funnel (Section 26)

**QR Touchpoint Map:**

| QR Location | Trigger Message | Backend Action |
|---|---|---|
| Product label | `DETAILS {SKU}` | Product lookup -> send info card -> check enrollment -> prompt registration if not |
| Catalogue card | `DETAILS {SKU}` | Same as product label |
| Storefront poster | `WELCOME` | Welcome message -> registration Flow -> signup bonus |
| Receipt (every sale) | `RECEIPT {ORDER_REF}` | Award points if enrolled -> digital receipt -> prompt registration if not |
| Table tent / counter | `JOIN` | Directly start registration Flow |
| Business card / flyer | `HI` | Welcome menu -> store details, catalogue, loyalty |

### The Acquisition Pipeline

Every QR scan enters the same pipeline:

1. Customer scans QR -> WhatsApp opens -> message auto-sent -> SalesIQ relay -> Backend
2. Backend extracts phone number (always available from WhatsApp)
3. Backend: customer = lookup_by_phone(phone)
4. **FOUND (returning):** Handle trigger context with personalized greeting and points balance
5. **NOT FOUND (new):** Create customer record -> send registration Flow -> on completion: update record, record consent, create wallet, award signup bonus, push to CRM -> THEN handle original trigger

### Receipt QR — Retroactive Point Award

When a customer scans a receipt QR for an order they weren't linked to:
1. Backend verifies: order exists, no customer linked, order < 72 hours old
2. Links customer to order (update `order.customer_id`)
3. Awards points (idempotent on order UUID)
4. Sends confirmation with points earned and new balance
5. One-time per order — subsequent scans show regular response

### Universal QR Deep Routing (Section 32)

Every QR code encodes a type field for routing:

| QR Type | Payload | Who Scans |
|---|---|---|
| `shelf` | `{"t":"shelf","s":"GB","z":"003","n":"012","p":"B"}` | Staff during inventory |
| `pkg` | `{"t":"pkg","id":"PKG-001","s":"SHP-001"}` | Driver, receiving staff |
| `product` | `{"t":"product","sku":"YDMUSTART01"}` | Staff, customers |
| `receipt` | `wa.me/{num}?text=RECEIPT%20{ref}` | Customer |
| `attendance_in` | `{"t":"att","dir":"in","store":"GB","hash":"..."}` | Staff at shift start |
| `attendance_out` | `{"t":"att","dir":"out","store":"GB","hash":"..."}` | Staff at shift end |
| `customer_reg` | `wa.me/{num}?text=JOIN` | Customer in store |
| `device_enroll` | `{"t":"enroll","token":"...","store":"..."}` | Admin setting up device |
| `shipment` | `{"t":"ship","id":"SHP-001"}` | Driver, receiving staff |

**WhatsApp QR codes** use `wa.me` URL format (for customers). **Internal QR codes** use JSON payloads (for staff).

### Showrooming Analytics

| Metric | How Measured |
|---|---|
| QR scans per day | Count of inbound WhatsApp messages matching trigger patterns |
| Scan-to-enrollment conversion | New customers created within 5 minutes of a product trigger |
| Most-scanned products | Rank products by DETAILS message frequency |
| Scan-to-purchase conversion | Customer scans product QR -> purchases same product within 24h |
| Receipt QR scan rate | Receipts scanned vs total receipts printed |

### QR Scan Event Schema

```sql
CREATE TABLE qr_scan_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT NOT NULL,
    customer_id     UUID REFERENCES customer(id),
    trigger_type    TEXT NOT NULL,
    trigger_ref     TEXT,
    store_id        UUID REFERENCES store(id),
    is_new_customer BOOLEAN NOT NULL DEFAULT false,
    enrolled_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### CRM Connector Detail

| Event | CRM Action | Retry Policy |
|---|---|---|
| Customer created/updated | Upsert Contact | 5 retries, exponential backoff |
| Loyalty enrolled | Set Posterita_Loyalty_Enrolled | 5 retries |
| Consent changed | Set WhatsApp_Marketing_Consent + timestamp + source | 5 retries |
| Balance changed | Update Loyalty_Points field | 5 retries |
| Voucher redeemed | Add CRM Note | 3 retries |

Dead letter queue after max retries. CRM is non-critical.

## Dependencies

- Loyalty module (wallet, points, consent)
- POS module (receipt QR, order linking)
- Zoho SalesIQ (WhatsApp middleware)
- Meta Cloud API (WhatsApp Flows, templates)

## Implementation Notes

- **Phase 1:** Apply for Meta WhatsApp Flows access (long lead time)
- **Phase 2:** WhatsApp module, QR generation, inbound routing, CRM connector, customer pipeline, showroom analytics
- Decision 17: Bot logic in backend, SalesIQ is middleware only
- Decision 18: WhatsApp Flows for registration, button fallback
- Decision 19: CRM is one-way push target only
- Decision 27: Universal QR deep routing with type field
