# Backend Platform
> References: shared/architecture.md, shared/data-model.md

## Overview

The backend is a NestJS modular monolith hosted on Render, serving business APIs, sync orchestration, loyalty engine, reconciliation, WhatsApp logic, CRM push, and reports. It runs as three Render services: API, Worker (BullMQ), and Cron.

## Relevant Tables

All tables — the backend is the sole interface between clients and Supabase Postgres.

## API Routes

All routes defined across the API Route Catalog (Section 12). See individual module specs for route details.

## Business Rules

### Module Map (34 modules)

| Module | Responsibility | Status |
|---|---|---|
| `accounts` | Owner signup, account creation, billing plan, multi-brand management | New module |
| `auth` | Phone OTP, JWT issuance/refresh, session management, owner vs staff login, PIN | From v2 + owner auth |
| `users` | Staff profiles, emergency contacts | From v2 |
| `roles` | Role definitions, hierarchy | From v2 |
| `capabilities` | Capability profiles, assignment to users/devices | From v2 |
| `devices` | Enrollment, heartbeat, revocation, command inbox | From v2 |
| `stores` | Store config, terminals, printers | From v2 |
| `pos` | Orders, payments, refunds, holds, cart rules, receipt QR generation (mandatory on every receipt) | From v2 + receipt QR |
| `tills` | Open/close, session tracking | From v2 |
| `reconciliation` | Discrepancy workflow, evidence, resolution | From v2 |
| `inventory` | Shelf register, bulk shelf creation, count sessions, device registration, dual-scan protocol, match comparison, dispute handling, label PDF generation | Major expansion |
| `requests` | Stationery, pickups, customer items — generic request engine | From v2 |
| `workforce` | Attendance, leave, tasks, expenses, asset acceptance, maintenance | From v2 |
| `shifts` | Shift templates, selections, approval, public holiday calendar, attendance QR stations | New module |
| `loyalty` | Wallets, transactions, issuance-pending, points rules, consent, vouchers, campaigns | Major expansion |
| `customers` | Customer profiles, phone normalization (E.164), dedup, registration from POS and WhatsApp | New module |
| `whatsapp` | Inbound message handler, WhatsApp Flow triggers, template dispatch, thin SalesIQ relay protocol | Rewritten |
| `crm-connector` | One-way push to Zoho CRM on customer/loyalty events for support visibility | New module |
| `catalogue` | AI enrichment engine (Claude API), product enrichment queue, review workflow, PDF generation | New module |
| `reports` | Parameterized SQL views, materialized views, CSV/PDF export, scheduled summaries | New module |
| `files` | Upload orchestration to Cloudinary, metadata in Postgres | From v2 |
| `notifications` | Push (FCM), in-app, WhatsApp dispatch | From v2 |
| `audit` | Immutable audit event log | From v2 |
| `sync` | Ingest pipeline, transformers, pull delta | From v2 |
| `compliance` | Data deletion, consent audit, DPA 2017 reporting | From v2 |
| `agent-control` | Agent tasks, commands, approval gates | From v2 |
| `jobs` | BullMQ job definitions, scheduling, retry policies | From v2 |
| `chat` | Chat threads (direct/group/AI), message storage, AI assistant with tool-use | New module |
| `logistics` | Shipments, packages, delivery templates, driver assignment, package label generation | New module |
| `operational-supplies` | Non-resale inventory management, reorder alerts, warehouse dispatch | New module |
| `qr-router` | QR payload generation + deep link registry | New module |
| `warehouse` | Container receiving, document vault, inspection workflow, cost allocation, purchase orders, claims | New module |
| `procurement` | Sourcing requirements, RFQ lifecycle, PO creation/approval, vendor management, inbound email processing | New module |
| `otb-planning` | Selling periods, OTB budget CRUD, stock cover materialized views, PO period tagging, revised OTB | New module |
| `augmentation` | AI data enrichment for customers, vendors, and products | New module |
| `exchange-rate` | Multi-currency rate management, rate locking on POs | New module |
| `inbound-email` | Parse and route inbound procurement/shipping emails from SendGrid/Postmark webhooks | New module |
| `redemption` | Loyalty marketplace catalog, redemption transactions, commission calculation | New module |

### Module Count Concern

34 modules is a lot for a modular monolith. Risk of over-engineering the boundaries early.

**Recommendation:** Start with logical groupings. `customers` + `loyalty` + `whatsapp` could be one `customer-engagement` module initially. `shifts` could live inside `workforce`. Split when the code gets unwieldy, not before.

*NestJS directory structure unchanged from v2 §8 — just add the new module directories.*

## Dependencies

- Supabase Postgres (database)
- Redis / Upstash (BullMQ queues, rate limiting, session cache)
- Cloudinary (media storage)
- Anthropic API (AI enrichment, chat assistant)
- Zoho SalesIQ (WhatsApp middleware)
- Zoho CRM (one-way push)
- SendGrid/Postmark (transactional email, inbound email processing)

## Implementation Notes

- **Phase 0:** Core modules (auth, device, capability, audit, file, notification, sync, accounts, customer, product, shelf, loyalty schema, shifts schema, reports skeleton)
- **Phase 1:** Blink payment integration evaluation
- **Phase 2:** Loyalty engine, WhatsApp, CRM connector, inventory, catalogue, AI chat, logistics basic, reconciliation, operational supplies
- **Phase 3:** Workforce, shifts, campaigns, reports, full logistics, warehouse, barcode-my-store, procurement
