# Design Decisions

> Extracted from Posterita Master Plan v3.9 — Sections 22, 23, 37, 38

---

## 22. Assumptions

- Supabase is the sole system of record. No data in Zoho Creator or CRM needs migration.
- Zoho CRM receives one-way pushes for support visibility only. CRM data is never read by the platform.
- Zoho Creator data is test/playground only and will be retired.
- The brand portal (loyalty.posterita.com) is a prototype that informed the design. It will be retired when the web console absorbs its functionality.
- Vercel hosts the web console. The loyalty Flask API on Vercel is retired.
- WhatsApp Flows require Meta approval which may take 1-3 weeks.
- Epson ePOS SDK supports shelf label printing (receipt-width barcode labels).
- A user works in exactly one store per day.
- Blink payment integration must be preserved.
- Mauritius DPA 2017 compliance required for customer data and consent.
- Inventory count dual-scan protocol applies to full counts. Spot checks (single scan, KPI-only) included in MVP.
- Customer-facing loyalty is WhatsApp-first during MVP. Web portal deferred.

---

## 23. Resolved Design Decisions (all concerns incorporated)

| # | Question | Decision |
|---|---|---|
| 1 | POS codebase approach (C1) | Evaluate playground code for reuse. Architecture wins over preservation. Build `:feature:pos` fresh, adopt good patterns. No `:feature:pos-legacy` wrapper needed. |
| 2 | Barcode scanners (C2) | Both camera and Bluetooth HID supported. Configurable modes: auto-scan, scan-confirm, continuous batch. |
| 3 | Product catalogue (C3) | Reuse POS product selection screen for catalogue generation. Same grid, different output mode (PDF catalogue, barcode labels, shelf labels). `:feature:catalogue` module. |
| 4 | Customer volume (C4) | Expect ~10,000 customers/year. WhatsApp conversation costs manageable (~$50-100/mo at this volume). |
| 5 | Spot check (C5) | Yes, in MVP. Single-scan, no dual verification. Generates Shelf Accuracy KPI that indicates when full count is needed. Spot checks are reporting/early-warning, not authoritative inventory. |
| 6 | Barcode formats (C6) | Multiple supported: QR Code (recommended default), Code 128, Code 39, DataMatrix. Configurable per store. |
| 7 | Label printers (C7) | Zebra (enterprise labels), Epson (receipt labels), generic printers (PDF). `:core:printer` abstracts all three via `PrinterService` interface. |
| 8 | Points per rupee (C8) | Configurable per brand/organization via `organization_loyalty_config` table. |
| 9 | Multi-store | One store per user per day, no switching |
| 10 | Product catalog source | Supabase, created via backend API |
| 11 | Master data from Android | Thin client — direct API call, then pull caches |
| 12 | Data protection | DPA 2017, consent append-only, dual-scope, Meta-compliant |
| 13 | Loyalty source of truth | Supabase only. CRM is a push target for support. |
| 14 | Zoho Creator fate | Retired. All data modeled fresh in Supabase. |
| 15 | Inventory full count | Dual-scan mandatory on full counts. 3rd device tiebreak on dispute. |
| 16 | Shelf addressing | STORE-ZONE-SHELF-POSITION, QR Code default format |
| 17 | WhatsApp bot | Logic in backend. SalesIQ stays as middleware. Zobot -> thin relay. |
| 18 | WhatsApp consent | WhatsApp Flows for registration (Meta approval needed), button fallback. |
| 19 | CRM role | One-way push target only, never read from. Support visibility only. |
| 20 | Reports | Backend-generated, served to web console, CSV/PDF export |
| 21 | Owner signup (v3.3) | Multi-step on Android + web. Single-field steps, keyboard never hides input. AI generates starter products. Business name not required. |
| 22 | Entity hierarchy (v3.3) | Owner -> Account -> Brand (1..n) -> Store (1..n) -> Terminal (1..n) -> Device. Owner can have multiple brands. |
| 23 | AI product onboarding (v3.3) | AI generates 20-30 starter products during signup. Same enrichment pipeline as §29. Owner reviews 1-by-1 before master. |
| 24 | Owner vs staff login (v3.3) | Owner: PIN/biometric with 30-day refresh. Staff: staff picker on enrolled device + PIN with 7-day refresh. |
| 25 | In-app chat (v3.4) | AI assistant chat in MVP (highest ROI). Direct + group chat in Phase 3. AI uses same API endpoints as UI, scoped to user permissions. |
| 26 | Logistics (v3.4) | Template-based delivery workflow. Standard parcel (MVP), motorcycle handover + inter-store transfer (Phase 3). QR on every package. |
| 27 | QR deep routing (v3.4) | Every QR encodes a type field. App QR router parses payload -> opens exact correct screen. Two classes: WhatsApp QR (customers) and internal QR (staff). |
| 28 | Operational supplies (v3.4) | Same `product` table, `product_class='operational'`. Never shown in POS. Separate stock alerts and warehouse dispatch. |
| 29 | Cash on delivery (v3.5) | COD tracked per shipment. Driver collects payment -> records amount + evidence -> deposits at store/office -> manager reconciles. Cannot end shift with undeposited cash. |
| 30 | Label printer (v3.5) | QR label printer (Zebra or equivalent) is mandatory equipment per store. Fallback to receipt printer or PDF, but stores must budget for dedicated printer. |
| 31 | Android dynamic features (v3.6) | Play Feature Delivery (SplitInstallManager). Core always installed (~8MB). Feature modules download on first tap. Cashier never downloads logistics module. |
| 32 | Store cash collection (v3.6) | Daily sales cash: store manager declares -> generates collection QR -> driver scans + dual signature -> transport -> bank deposit with slip photo -> three-way reconciliation (declared vs collected vs deposited). |
| 33 | Barcode My Store (v3.6) | Guided shelf-by-shelf workflow: scan shelf -> count distinct products -> photo each -> enter qty -> AI identifies -> owner reviews 1-by-1 -> products created with auto-barcode -> labels print in shelf walking order. |
| 34 | AI product ID from photos (v3.6) | Same Claude API pipeline as catalogue enrichment. Photo -> AI suggests name/category/brand. Owner must accept/edit/skip. AI also flags potential duplicates across shelves. |
| 35 | Container/Import receiving (v3.7) | Full lifecycle: arrive -> document vault -> inspect per package -> process products -> release to store flexibly -> cost allocation -> PO reconciliation -> close. Sell now, cost later. |
| 36 | Merchandiser role (v3.7) | New role: manages product pipeline from container to shelf. Has access to container receiving, inspection, cost allocation, product management, AI enrichment, stock release. |
| 37 | Claims workflow (v3.7) | Damage/shortage/wrong-item claims against supplier, freight, or insurance. Photo evidence from inspection. Tracked through resolution (credit note, replacement, payout, write-off). |
| 38 | Sell now, cost later (v3.7) | Products can be created with selling price and released to stores before container costing is complete. Cost price backfilled when overhead allocation runs. Margin reports flag "cost pending." |
| 39 | AI Data Augmentation (v3.8) | Automated enrichment of customers (social), vendors (government registries), products (competitor/manufacturer). Augmentation side panel on entity detail screens. Auto-confirmed for authoritative government sources, manual review for others. |
| 40 | Procurement & Purchasing (v3.8) | End-to-end pipeline: sourcing requirement -> AI vendor suggestion -> RFQ via email -> vendor reply capture -> quote comparison -> PO creation -> approval -> freight forwarder integration. Dedicated inbound emails per org. |
| 41 | Loyalty Redemption Marketplace (v3.8) | Any merchant can list products for point redemption. 10% commission to Posterita. Points burned on redemption (reduces liability). WhatsApp browse + redeem flow. |
| 42 | OTB & Stock Cover Planning (v3.9) | Selling periods (month/quarter/season/custom), OTB budget per category/period with classic formula, PO period tagging, stock cover (months of supply) per store and warehouse, OTB burn-down charts, arrival timeline Gantt, revised OTB weekly in-season recalculation, must-order-by lead time alerts. |

---

## 37. Concerns Resolution Log

All 14 concerns from the initial review have been resolved:

| # | Concern | Resolution | Plan Impact |
|---|---|---|---|
| C1 | POS codebase status | **Early-stage playground** — no production data, no historical data to preserve. Evaluate for reuse, architecture wins over preservation. | Removed `:feature:pos-legacy`. Build `:feature:pos` fresh. No data migration. |
| C2 | Scanner hardware | **Both camera + Bluetooth HID.** Configurable modes: auto-scan, scan-confirm, continuous batch. | `:core:scanner` designed for both. Scan modes configurable per feature context. |
| C3 | Product catalogue | **Reuse POS product grid.** Same screen, different output mode (PDF catalogue, barcode labels, shelf labels). | Added `:feature:catalogue` module. POS screen is dual-purpose. |
| C4 | Customer volume | **~10,000/year.** WhatsApp costs ~$50-100/mo at this scale. | No budget concern. Standard Meta pricing applies. |
| C5 | Spot check | **Yes in MVP.** Single-scan, reporting/KPI only. Generates Shelf Accuracy KPI to trigger full counts. | Added spot check mode to `inventory_count_session` (session_type field). Spot check report added. |
| C6 | Barcode formats | **Multiple supported:** QR Code (default), Code 128, Code 39, DataMatrix. Configurable per store. | `:core:scanner` decodes all. `:core:printer` generates all. |
| C7 | Label printers | **Zebra (enterprise) + Epson (receipt) + generic (PDF).** `PrinterService` abstracts all. | Added Zebra Link-OS/ZPL support to `:core:printer`. |
| C8 | Points rate | **Configurable per brand.** `organization_loyalty_config` table with `points_per_currency_unit`. | Added config table to schema. Award logic reads config. |
| C9 | Web console scope | Not explicitly answered — **recommendation: phased** (see §13). | Phase 2-3 MVP set identified. |
| C10 | Play Store listing | **Unknown** — Fred will determine. | Remains a Phase 1 blocker. |
| C11 | Blink SDK version | **Unknown** — needs investigation from playground codebase. | Remains a Phase 1 item. Check playground code. |
| C12 | WhatsApp Flows | **Not applied for yet.** | Build button-based fallback first. Apply to Meta in Phase 1. |
| C13 | Flask API routes | **Uploaded and reviewed.** Full contract documented in §36. | Loyalty module preserves exact award/balance/consent/voucher semantics. |
| C14 | Android POS code | **Playground exists.** Not yet uploaded to this conversation. | Will evaluate when uploaded. Plan accounts for both reuse and rebuild paths. |

---

## 38. Remaining Open Items

| # | Item | Needed By | Status |
|---|---|---|---|
| 1 | Play Store listing details (package name, signing key) | Phase 1 start | Unknown — Fred to determine |
| 2 | Blink SDK version (check playground codebase) | Phase 1 start | Can be determined from existing playground code |
| 3 | Apply for Meta WhatsApp Flows access | Phase 1 | Not yet started — button fallback is ready |
| 4 | Submit 7 WhatsApp template messages for Meta approval | Phase 2 | Templates defined in §25, need submission |
| 5 | Upload Android POS playground code for evaluation | Anytime | Fred to upload zip — will inform reuse decisions |
| 6 | PITR upgrade trigger threshold | Post-launch | Low priority |
| 7 | Set up inbound email domain (mail.posterita.com) with SendGrid/Postmark | Phase 3 start | Not started |
| 8 | Configure MX records for procurement-* and shipping-* mailboxes | Phase 3 start | Not started |
| 9 | Identify government business registry APIs per country (Mauritius, China, India) | Phase 3 | Research needed |
| 10 | Define PO auto-approval threshold per organization | Phase 3 | Default $5,000, configurable |
| 11 | Loyalty redemption marketplace commission rate finalization | Phase 3 | Default 10%, tiered structure designed |
| 12 | Define default selling period type per org (month vs quarter vs season) | Phase 3 | Decision needed — recommend month for most retailers |
| 13 | Stock cover basis: cost price vs retail price | Phase 3 | Recommend cost (aligns with OTB at cost), confirm with accountant |
| 14 | Must-order-by alert lead times (days before deadline for warning vs critical) | Phase 3 | Suggest 14 days warning, 7 days critical |
| 15 | OTB over-budget override policy (who can override, at what threshold) | Phase 3 | Suggest Owner for >20% over, Admin for <20% |
| 16 | Historical data seeding for OTB — how to bootstrap with no sales history | Phase 3 | Manual estimate + industry benchmarks for first 2 periods |
