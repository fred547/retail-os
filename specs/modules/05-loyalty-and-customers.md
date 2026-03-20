# Loyalty and Customers
> References: shared/architecture.md, shared/data-model.md

## Overview

The loyalty and customer module manages the complete customer lifecycle: registration (from POS, WhatsApp, or QR scan), loyalty wallets, point earning/redemption, consent management (Meta-compliant, dual-scope, append-only), vouchers, and campaigns. The module preserves the exact behavioral contract from the existing Flask loyalty API while expanding capabilities.

## Relevant Tables

`customer`, `loyalty_wallet`, `loyalty_transaction`, `loyalty_issuance_pending`, `consent_record`, `voucher`, `campaign`, `organization_loyalty_config`, `qr_scan_event`

## API Routes

### Customers

- `POST /v1/customers` — Create customer (phone normalization, dedup check)
- `GET /v1/customers/lookup?phone={phone}` — Lookup by phone (used by POS and WhatsApp)
- `GET /v1/customers/{id}` — Customer detail with wallet and consent
- `PUT /v1/customers/{id}` — Update customer profile
- `DELETE /v1/customers/{id}` — Soft delete (DPA right to erasure)

### Loyalty

- `GET /v1/loyalty/wallets/{phone}` — Look up wallet by phone
- `GET /v1/loyalty/wallets/{id}/transactions` — Transaction history
- `POST /v1/loyalty/award` — Award points (idempotent by order UUID)
- `POST /v1/loyalty/redeem` — Redeem points
- `POST /v1/loyalty/issuance` — Staff creates pending issuance
- `POST /v1/loyalty/issuance/{id}/claim` — Customer claims pending issuance
- `POST /v1/loyalty/consent` — Record/update consent (append-only audit)
- `GET /v1/loyalty/consent/{customer_id}` — Current consent state
- `POST /v1/loyalty/vouchers` — Issue voucher
- `POST /v1/loyalty/vouchers/validate` — Check voucher validity
- `POST /v1/loyalty/vouchers/redeem` — Redeem voucher (atomic validate + deduct)
- `POST /v1/loyalty/campaigns` — Create campaign
- `PUT /v1/loyalty/campaigns/{id}` — Update campaign
- `POST /v1/loyalty/campaigns/{id}/activate` — Activate campaign
- `GET /v1/loyalty/campaigns/{id}/reach` — Estimate audience reach

## Business Rules

### Loyalty API Contract (from Flask code review — Section 36)

The Flask loyalty API defines the POS<->loyalty integration contract. The unified backend MUST preserve these behaviors:

#### Award Points (`POST /api/v1/award`)
- Input: `phone`, `orderUuid`, `orderTotal`, `currency`, `storeId`, `terminalId`
- **Idempotent on `orderUuid`** — duplicate awards return the original result, never double-award
- Idempotency key format: `POS::{orderUuid}`
- Points calculated: `floor(orderTotal / points_per_currency_unit)`, minimum 1 point per transaction
- Creates: claim record + transaction ledger entry + updates wallet balance
- Auto-creates wallet if customer doesn't have one yet

#### Check Balance (`GET /api/v1/balance/{phone}`)
- Returns: `points`, `tier` (future), `activeVouchers[]`
- Each voucher includes: `voucherId`, `code`, `discountType` (FIXED/PERCENTAGE), `discountValue`, `expiryDate`, `isUsed`
- Filters out expired vouchers automatically
- Phone normalization: strip spaces/dashes, ensure starts with `+`

#### Record Consent (`POST /api/v1/consent`)
- Input: `phone`, `consentGranted`, `consentSource`, `brandName`, `storeId`, `terminalId`, `userId`, `consentTimestamp`
- **Consent is independent of wallet** — wallet is created even if consent is denied
- Dual-scope: writes to both brand-level and product-level consent
- Consent source tracked: "POS", "WhatsApp Bot", etc.

#### Validate Voucher (`POST /api/v1/voucher/validate`)
- Checks: voucher exists, belongs to customer, status is "issued", not expired

#### Redeem Voucher (`POST /api/v1/voucher/redeem`)
- **Atomic:** validate + mark redeemed + log redemption in one transaction

#### Phone Normalization
```
Strip: spaces, dashes, parentheses
If not starting with "+", prepend "+"
Result: E.164 format, e.g. "+23054239978"
```

### Points Configuration

Points earning rate is configurable per organization/brand via `organization_loyalty_config`:
- `points_per_currency_unit` (default 0.01 = 1pt per Rs100)
- `min_points_per_txn` (default 1)
- `signup_bonus` (default 100)
- `survey_reward` (default 20)
- `enable_expiry` and `expiry_months`

### Consent Rules

- Dual-scope: brand-level AND product-level
- Separate promo/news flags per Meta requirements
- Append-only — every state change creates a new row
- Annual re-confirmation via WhatsApp template
- "STOP" keyword triggers immediate withdrawal

## Dependencies

- WhatsApp module (registration flows, template messages)
- POS module (point award at checkout)
- CRM connector (one-way push on customer/loyalty events)

## Implementation Notes

- **Phase 0:** Loyalty schema creation
- **Phase 2:** Full loyalty engine, customer registration, consent
- Decision 8: Points rate configurable per brand
- Decision 12: DPA 2017, consent append-only, dual-scope
- Decision 13: Supabase only source of truth for loyalty
