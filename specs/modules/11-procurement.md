# Procurement
> References: shared/architecture.md, shared/data-model.md

## Overview

The procurement module provides an end-to-end purchasing pipeline from sourcing requirements through RFQ via email to purchase order creation, approval, and freight forwarder integration. It includes AI vendor suggestions, inbound email processing for vendor replies, multi-currency support with exchange rate locking, and connects downstream to the container receiving module.

## Relevant Tables

`sourcing_requirement`, `rfq`, `rfq_attachment`, `vendor`, `vendor_augmentation`, `purchase_order`, `purchase_order_line`, `procurement_email`, `exchange_rate`, `selling_period`

## API Routes

### Sourcing
- `POST /v1/sourcing` — Create sourcing requirement
- `GET /v1/sourcing` — List sourcing requirements
- `GET /v1/sourcing/{id}` — Detail with RFQs and AI suggestions
- `PUT /v1/sourcing/{id}` — Update
- `POST /v1/sourcing/{id}/suggest-vendors` — Trigger AI vendor suggestion
- `POST /v1/sourcing/{id}/rfqs` — Create RFQ(s) for this requirement

### RFQ
- `GET /v1/rfqs` — List all RFQs
- `GET /v1/rfqs/{id}` — RFQ detail with attachments
- `PUT /v1/rfqs/{id}` — Update draft RFQ
- `POST /v1/rfqs/{id}/send` — Send RFQ email to vendor
- `POST /v1/rfqs/{id}/accept` — Accept quote -> creates PO
- `POST /v1/rfqs/{id}/reject` — Reject quote

### Purchase Orders
- `POST /v1/purchase-orders` — Create PO (from RFQ or manual)
- `GET /v1/purchase-orders` — List POs
- `GET /v1/purchase-orders/{id}` — PO detail with lines, docs, emails
- `PUT /v1/purchase-orders/{id}` — Update PO
- `POST /v1/purchase-orders/{id}/submit` — Submit for approval
- `POST /v1/purchase-orders/{id}/approve` — Approve PO
- `POST /v1/purchase-orders/{id}/reject` — Reject PO
- `POST /v1/purchase-orders/{id}/send` — Send approved PO to vendor
- `POST /v1/purchase-orders/{id}/receive` — Create container from PO

### Vendors
- `POST /v1/vendors` — Create vendor
- `GET /v1/vendors` — List vendors
- `GET /v1/vendors/{id}` — Vendor detail with augmentation
- `PUT /v1/vendors/{id}` — Update vendor

### Exchange Rates
- `POST /v1/exchange-rates` — Set exchange rate
- `GET /v1/exchange-rates` — List rates
- `GET /v1/exchange-rates/latest` — Get latest rate for currency pair

### Inbound Email (webhook)
- `POST /v1/webhooks/inbound-email` — Receive inbound email from SendGrid/Postmark

## Business Rules

### The Full Procurement Pipeline

```
OTB PLAN      SOURCING         QUOTING          ORDERING         RECEIVING
(§42)         REQUIREMENT ->   RFQ         ->   PURCHASE    ->   CONTAINER
                                                ORDER              (§35)
Budget says   "Need 500       AI proposes      Accepted quote    Goods arrive,
"Rs 340K       sandals for    3 vendors.       becomes PO.       inspection,
 left for      summer"        Purchaser sends  Manager approves.  costing,
 footwear/     (tagged to     RFQ emails.      PO tagged to       release.
 August"        period)       Vendors reply     selling period.
                               to our inbox.    OTB burns down.
```

### Sourcing Requirements

Starting point — "I need something." Includes title, description, category, selling period tag, quantity, target unit price, target currency, deadline, AI suggested vendors.

### AI Vendor Proposal

When a sourcing requirement is created:
1. AI analyzes the requirement
2. Searches existing vendor database for matches
3. If needed, searches web for new potential vendors
4. Returns ranked suggestions with reasoning (existing vendor history, MOQ, price range)

### RFQ Email Flow

Each organization gets: `procurement-{org_slug}@mail.posterita.com`

1. Purchaser creates RFQ -> system generates email from template
2. Purchaser reviews and sends
3. Vendor replies -> inbound email parsed -> RFQ ref extracted -> attachments uploaded -> AI parses quoted prices/lead times -> status: 'responded'
4. Purchaser reviews, compares across RFQs, scores, accepts -> creates PO

### Quote Acceptance -> Purchase Order

When quote accepted, auto-creates PO linked to RFQ and sourcing requirement. PO inherits vendor, items, pricing, currency.

**Approval Rules:**
- POs below configurable threshold (default $5,000) are auto-approved
- POs above threshold require Owner or Admin approval
- Rejected POs go back to Purchaser with reason
- Approved POs can be sent to vendor as formatted PDF

### Freight Forwarder Integration

Each organization also gets: `shipping-{org_slug}@mail.posterita.com`

Freight forwarder emails with shipping documents are auto-captured, matched to PO via reference, attachments auto-classified by AI (B/L, packing list, customs declaration), and attached to the PO/container record.

### Multi-Currency Support

- POs and vendor quotes can be in any currency
- Exchange rates maintained per organization
- Rate locked on PO at creation time (not floating)
- Container costing uses PO's locked rate
- Reports show costs in both supplier and local currency

### Backend Module Structure

```
procurement/
  sourcing/
  rfq/
    rfq-email.service.ts
  purchase-order/
    po-approval.service.ts
    po-pdf.service.ts
  vendor/
  email/
    inbound-email.service.ts
    email-classifier.service.ts
    email-attachment.service.ts
  exchange-rate/
```

## Dependencies

- Container/Warehouse module (PO -> container receiving)
- OTB Planning module (period tagging, budget validation)
- AI Augmentation module (vendor verification)
- SendGrid/Postmark (inbound/outbound email)

## Implementation Notes

- **Phase 3:** Full procurement pipeline
- Open item 7: Set up inbound email domain
- Open item 8: Configure MX records for procurement/shipping mailboxes
- Open item 10: Define PO auto-approval threshold (default $5,000)
- Decision 40: End-to-end procurement in Retail OS
