# Implementation Sequence

> Extracted from Posterita Master Plan v3.9 — Section 21

---

## 21. Implementation Sequence

### Phase 0: Foundations (Weeks 1-3)

- [ ] Create backend repo (NestJS) and web repo (Next.js)
- [ ] Stand up Supabase project: full schema including customer, loyalty, inventory, shifts
- [ ] Confirm Supabase Pro plan with daily backups
- [ ] Stand up Render services: API, worker, cron, Redis
- [ ] Stand up Cloudinary
- [ ] Implement: auth, device, capability, audit, file upload, notification modules
- [ ] Implement: accounts module — owner signup, account creation, organization/brand/store CRUD
- [ ] Implement: AI product generation for onboarding (Claude API -> product_enrichment pipeline)
- [ ] Implement: sync module — ingest pipeline, pull delta, transformers
- [ ] Implement: customer module (phone normalization, dedup)
- [ ] Implement: product and category CRUD
- [ ] Create shelf table and bulk creation endpoint
- [ ] Create loyalty schema (wallet, transaction, consent, voucher, campaign)
- [ ] Create shift planning schema + seed Mauritius 2026 holidays
- [ ] Create reports module skeleton with daily sales summary materialized view
- [ ] Deploy monitoring: Sentry, health checks, UptimeRobot
- [ ] Test Supabase backup restore on staging

### Phase 1: Android Shell + POS Foundation (Weeks 3-6)

- [ ] **Evaluate playground codebase:** review existing Android POS code, identify reusable components (layouts, Blink wiring, scanner handling, navigation patterns)
- [ ] **Decision gate:** for each existing component, decide: adopt as-is, adapt, or rebuild
- [ ] Apply for Meta WhatsApp Flows access (long lead time — start now)
- [ ] Build: `:app` shell, `:core:designsystem` (brand tokens), `:core:auth`, `:core:device`
- [ ] Build: `:core:printer` (Epson ePOS + Zebra ZPL abstraction, receipts + labels)
- [ ] Build: `:core:scanner` (camera + Bluetooth HID, configurable modes)
- [ ] Build: `:core:sync` (outbox push + server pull + Room strategy)
- [ ] Build: `:core:network` (API client, connectivity observer)
- [ ] Build: `:feature:onboarding` — multi-step owner signup (phone -> OTP -> name -> brand -> location -> category -> AI products -> review -> PIN)
- [ ] Build: `:feature:home` (role-first, capability-driven tile visibility, brand switcher for owners)
- [ ] Build: `:feature:pos` — product grid, cart, checkout, payment (adopt from playground where good)
- [ ] Build: receipt printing with **mandatory QR code** on every receipt (ESC/POS `addSymbol()`, min 25mm, QRCODE_MODEL_2)
- [ ] Implement: receipt QR format — `wa.me/{number}?text=RECEIPT%20{ORDER_REF}` encoded as QR on receipt footer
- [ ] Implement: auth flow — owner login (PIN/biometric, 30-day refresh) AND staff login (staff picker -> PIN, 7-day refresh)
- [ ] Implement: device enrollment (QR scan)
- [ ] Implement: Blink payment integration (adopt from playground if compatible)

### Phase 2: Loyalty + Inventory + WhatsApp + QR + AI Chat (Weeks 6-11)

- [ ] Implement: loyalty engine (award, balance, redeem — preserving Flask API contract from §36)
- [ ] Implement: customer registration from POS (thin client) and WhatsApp
- [ ] Implement: WhatsApp module — thin Zobot relay + backend inbound handler
- [ ] Implement: Universal QR deep router (`:core:navigation` — parse payload, route to correct screen)
- [ ] Implement: QR code generation endpoints (product, store, receipt, shelf, package, attendance, bulk)
- [ ] Implement: WhatsApp inbound trigger routing (DETAILS, WELCOME, JOIN, RECEIPT, HI)
- [ ] Implement: RECEIPT trigger — retroactive point award for unlinked orders
- [ ] Implement: customer lookup-or-create pipeline (phone normalization -> lookup -> create -> registration Flow)
- [ ] Implement: QR scan event logging + showroom funnel analytics
- [ ] Implement: WhatsApp Flows (registration + consent) — **if Meta approved; button fallback otherwise**
- [ ] Implement: CRM connector (one-way push for support visibility)
- [ ] Implement: inventory count full protocol (session, device registration, dual-scan, match, dispute)
- [ ] Implement: spot check mode (single-scan, shelf accuracy KPI)
- [ ] Implement: shelf label printing (Zebra ZPL + Epson ESC/POS + PDF)
- [ ] Implement: `:feature:catalogue` (reuse POS grid -> PDF catalogue, barcode labels)
- [ ] Implement: AI enrichment engine (Claude API integration, product_enrichment table, batch queue)
- [ ] Implement: enrichment review UI in web console (per-field accept/reject/edit, confidence display)
- [ ] Implement: **AI assistant chat** (`:feature:chat` MVP — Claude API with tool-use against existing backend endpoints, scoped to user permissions)
- [ ] Implement: **operational supplies** — add `product_class` field, operational supply categories, reorder alerts
- [ ] Implement: **basic logistics** — shipments, packages, labels, standard parcel template, package scanning
- [ ] Implement: reconciliation workflow
- [ ] Implement: request engine
- [ ] Wire sync engine end-to-end
- [ ] Web console: dashboard, devices, users, stores, products (with operational supplies filter), reconciliation, inventory count live dashboard, customer/loyalty management, AI chat

### Phase 3: Staff + Shifts + Reports + Campaigns + Full Logistics + Chat (Weeks 11-15)

- [ ] Implement: workforce module (attendance, leave, tasks, expenses)
- [ ] Implement: shift planning (templates, selections, approval, attendance QR)
- [ ] Implement: attendance QR stations — QR at store entrance, auto-submit on scan
- [ ] Implement: campaign engine (create, activate, audience, dispatch)
- [ ] Implement: voucher management (issue, redeem, expiry cron)
- [ ] Implement: reports (MVP set: daily sales, discrepancy, device health, count results, enrollment funnel, showroom funnel)
- [ ] Implement: catalogue PDF generation (templates: credit card, A5, compact, flyer)
- [ ] Implement: **direct + group chat** (`:feature:chat` expansion — threads, members, unread badges)
- [ ] Implement: **full delivery templates** (motorcycle handover, inter-store transfer, pickup request)
- [ ] Implement: **driver assignment workflow** — assign driver to shipment, driver sees assigned jobs
- [ ] Implement: **store-to-store transfer** — request -> approve -> driver picks up -> recipient scans to receive -> inventory adjusts
- [ ] Implement: **warehouse dispatch** for operational supplies — request -> pick -> ship -> receive
- [ ] Implement: **container receiving** — container record, document vault, inspection workflow, photo capture
- [ ] Implement: **flexible release-to-store** — inspect box -> create/link products (selling price now) -> release via logistics -> cost later
- [ ] Implement: **cost allocation engine** — landed cost calculation, proportional allocation, PO generation, reconciliation check
- [ ] Implement: **claims workflow** — create claim, link evidence, track resolution
- [ ] Implement: **"Barcode My Store"** — guided shelf-by-shelf capture + AI product ID + label printing in shelf order
- [ ] Build: Android `:feature:staff-ops`, `:feature:supervisor`, `:feature:logistics`, `:feature:warehouse`, `:feature:barcode-my-store`
- [ ] Web console: staff ops, shifts, campaigns, reports, audit trail, compliance, AI task center, logistics dashboard, containers, purchase orders, claims
- [ ] Real-time inventory count dashboard (Supabase Realtime)

### Phase 4: Testing + Hardening (Weeks 15-17)

- [ ] GitHub Actions CI pipeline
- [ ] Firebase Test Lab integration
- [ ] Maestro flows for critical paths
- [ ] Full E2E test suite including dual-scan inventory, WhatsApp Flows, CRM sync
- [ ] Manual UAT on device matrix
- [ ] Performance testing
- [ ] Report accuracy validation
- [ ] Backup restore drill

### Phase 5: Launch (Weeks 17-20)

- [ ] Seed production reference data (products, stores, staff, shelves, holidays)
- [ ] Staff training (focus: new home screen, same POS flow, inventory count protocol, shift selection)
- [ ] Print and deploy shelf labels to first store
- [ ] Staged rollout: one store first, then expand
- [ ] Monitor for 1 week post-rollout
- [ ] Evaluate PITR upgrade based on transaction volume

### Post-MVP

- [ ] Dynamic feature module split (on-demand delivery)
- [ ] Replace `:feature:pos-legacy` screens incrementally; extract Blink into `:core:payments`
- [ ] Spot check mode for inventory (single-scan, lightweight)
- [ ] Restaurant suite
- [ ] Advanced reporting and analytics (trend charts, forecasting)
- [ ] Full HR rules engine
- [ ] Marketing campaigns via WhatsApp
- [ ] Customer-facing loyalty web portal
- [ ] Paddle billing integration (if multi-brand SaaS)
- [ ] Driver route optimization, live GPS tracking, ETA
- [ ] Supplier management and purchase orders
- [ ] Cost allocation of operational supplies to stores
- [ ] AI chat: proactive alerts ("Heads up — Grand Baie is running low on receipt rolls")
