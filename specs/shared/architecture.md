# Architecture

> Extracted from Posterita Master Plan v3.9 — Sections 1, 3, 4, 5
>
> **NOTE:** This file contains the ORIGINAL architecture vision.
> For the ACTUAL current state, see `specs/shared/current-state.md`.

---

## 1. Executive Summary

Build one unified Posterita Retail OS comprising:

- **One Android shell app** for all internal store operations (POS, staff ops, supervisor, inventory count, loyalty)
- **One web control console** for device management, approvals, reconciliation, reports, campaigns, and operations oversight
- **One backend platform** serving both surfaces plus AI agent integration and WhatsApp customer messaging
- **One WhatsApp integration** for customer-facing loyalty, consent capture, and digital receipts

The current `Posterita Brand Portal` (loyalty.posterita.com) provides the operational model for loyalty, shifts, campaigns, attendance, and consent. The loyalty Flask API provides the POS integration contract (award, balance, consent, voucher validate/redeem). Both are absorbed into the unified platform. An early-stage Android POS codebase exists as a playground — it will be evaluated for reusable patterns and code, but architecture and long-term goals take precedence over preserving playground code. Zoho Creator is retired; Supabase Postgres is the sole source of truth.

### Design Principles

1. **Offline-first** — every store-floor operation must work without connectivity and reconcile cleanly when connectivity returns.
2. **Capability-driven** — what a user sees and can do is a function of their role, their device assignment, and the store context. No hardcoded screen lists.
3. **Auditable by default** — every mutation of business consequence produces an audit event. No silent writes.
4. **AI-operable** — the system exposes CLI, API, MCP, and queue-based interfaces so agents can participate in operations without touching device UI.
5. **Architecture-first** — the existing playground codebase is evaluated for reuse, but long-term architecture always wins over preserving short-term work.
6. **Scan-only inventory** — inventory count is performed entirely by scanning. No manual data entry. Dual-device verification on every full count shelf.
7. **Catalogue-as-product** — the POS product selection screen doubles as the source for printed catalogue PDFs, barcode labels, and showroom materials.
8. **QR-first customer acquisition** — every QR code in the physical environment (on products, shelves, catalogues, receipts, storefronts) funnels into WhatsApp, which captures the customer's phone number and starts the loyalty onboarding pipeline. The QR code is the primary customer acquisition mechanism for the entire Retail OS.
9. **Super app architecture** — the Android app is a shell that hosts multiple modules (POS, Loyalty, Inventory, Staff, Shifts, Catalogue, Chat, Logistics, Procurement). Users see a home grid of app tiles filtered by their role. POS is the first module; others are added incrementally.

### UI Development Process

When building any UI screen:
1. **Always check the Manus prototypes first** — `manus-retail-os-prototype/client/src/pages/` has 19 screens with role-based navigation, KPI cards, mock data patterns. `manus-retail-os/client/src/pages/` has 17 production-ready pages with full component library.
2. **Check the JSX prototypes** — `posterita-prototype/src/App.jsx` has the latest mobile-first screen designs. `downloads-archive/posterita-prototype-v3_8_1.jsx` has 19 screens with extended color palette.
3. **Take inspiration from both**, adapt to Android/Kotlin patterns, and ensure the result is consistent with the overall app's brand guidelines (`specs/ui/design-system.md`) and existing screen conventions.
4. **After building, update the spec** — if the implementation adds or changes screens, update the relevant `specs/modules/` and `specs/ui/screens/` files so the master plan stays coherent with what was actually built.

### MVP Scope Boundary

**In scope:** Retail POS, Staff Ops, Supervisor, Multi-device Inventory Count with dual-scan verification, Loyalty (wallets, points, vouchers, campaigns, consent), Reconciliation, Device/Capability management, Shift planning with attendance QR, WhatsApp customer messaging with Flows, Reports (daily sales, discrepancies, device health, count results, enrollment), Shelf label printing, CRM read-only sync for support, AI-assisted product catalogue + onboarding, In-app AI assistant chat, Basic logistics (package labeling + standard delivery), Operational supplies (non-resale inventory), Universal QR deep routing.

**Phase 3 additions:** Direct + group chat, full delivery templates (motorcycle handover, inter-store transfer), driver assignment, container/import receiving with document vault + inspection + claims + cost allocation, "Barcode My Store" guided workflow, purchase orders, procurement & sourcing (RFQ → PO → receive), AI data augmentation (customer, vendor, product), loyalty redemption marketplace, OTB planning with stock cover dashboards and arrival timeline.

**Explicitly deferred:** Restaurant suite, queue management, bookings, order-ahead, marketing email campaigns, support/social inbox, Deliveroo integration, full HR engine, payroll deductions, utility bills, full AI copilot, customer-facing loyalty web portal, Paddle billing, driver route optimization.

---

## 3. Final Stack and Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| Android | Kotlin, Gradle, multi-module, Play App Bundle | Store-floor operations, offline-first, capability-driven UI |
| Web Console | Next.js on Vercel | Device/capability management, approvals, reconciliation, reports, campaigns, operations oversight |
| Backend API | NestJS modular monolith on Render | Business APIs, sync orchestration, loyalty engine, reconciliation, WhatsApp logic, CRM push, reports |
| Background Workers | NestJS workers on Render | Push ingest, loyalty jobs, WhatsApp dispatch, file processing, notifications, campaign delivery |
| Cron | Render cron service | Scheduled reconciliation, heartbeat stale-check, report generation, voucher expiry, consent renewal |
| Database | Supabase Postgres | Sole operational source of truth |
| Auth | Supabase Auth + backend-managed device/app sessions | Phone OTP, JWT, device enrollment tokens, session revocation |
| Realtime | Supabase Realtime | Dashboard live updates, device command inbox, approval status push, inventory count live dashboard |
| Cache/Queue | Redis (Render-hosted or Upstash) | Job queues (BullMQ), rate limiting, session cache, idempotency key store |
| Media | Cloudinary | Product images, reconciliation evidence, signatures, documents, catalogue assets |
| WhatsApp | Meta Cloud API via SalesIQ middleware | Outbound customer comms, loyalty notifications, WhatsApp Flows for registration |
| CRM Sync | NestJS `crm-connector` module | One-way push to Zoho CRM on customer/loyalty events for support visibility |
| Source Control | GitHub | Monorepo or multi-repo, PR-based workflow |
| Android CI/CD | GitHub Actions | Lint, test, build, sign, artifact publish |
| Android Cloud Testing | Firebase Test Lab | Instrumentation tests on real devices/emulators |
| Android UI Automation | Maestro | Business-flow end-to-end tests |
| Monitoring | Sentry (errors), Render metrics, Supabase dashboard, UptimeRobot | See §16 |
| Receipt/Label Printing | Epson ePOS SDK for Android | Bluetooth, WiFi, USB Epson printers — receipts and shelf labels |
| Card Payments | Blink SDK (existing integration preserved) | Card/tap payments at POS, requires connectivity |

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE                                 │
│  Users · Devices · Capabilities · Stores · Terminals · Shelves       │
│  Approvals · Audit · Agent Tasks · Shift Planning                    │
└──────────────┬───────────────────────────────┬───────────────────────┘
               │                               │
    ┌──────────▼──────────┐         ┌─────────▼────────────────────┐
    │   ANDROID SHELL     │         │   WEB CONSOLE                │
    │   (Store Floor)     │         │   (Back Office)              │
    │                     │         │                              │
    │  Base Runtime        │         │  Device Allocation           │
    │  Capability Loader   │         │  Capability Mgmt             │
    │  Offline-First DB    │         │  Approval Dashboards         │
    │  Sync Engine         │         │  Reconciliation Review       │
    │  POS + Blink         │         │  Inventory Count Dashboard   │
    │  Inventory Count     │         │  Reports & Analytics         │
    │  Loyalty at POS      │         │  Campaigns & Vouchers        │
    │  Staff Ops           │         │  Loyalty & Consent Mgmt      │
    │  Shelf Label Print   │         │  Shift Planning              │
    └──────────┬──────────┘         │  Audit Trail                 │
               │                     │  AI Task Center              │
               │                     └─────────┬──────────────────┘
               │                               │
    ┌──────────▼───────────────────────────────▼────────────────────┐
    │                  BACKEND PLATFORM (Render)                     │
    │                                                                │
    │  API Service        Worker Service         Cron Service        │
    │  ─────────          ──────────────         ────────────        │
    │  Business APIs      Sync ingest            Stale checks        │
    │  Auth/sessions      Loyalty jobs           Report gen          │
    │  Sync orch.         Campaign delivery      Voucher expiry      │
    │  Loyalty engine     File processing        Consent renewal     │
    │  WhatsApp logic     CRM sync push          Wallet reconcile    │
    │  Inv. count logic   Notifications                              │
    │  Agent-control      Shelf match compute                        │
    │  Reports engine     Label PDF gen                              │
    └──────────┬───────────────────┬───────────────────┬───────────┘
               │                   │                   │
    ┌──────────▼─────────┐  ┌─────▼──────┐  ┌───────▼──────────┐
    │  Supabase Postgres  │  │   Redis     │  │  Cloudinary      │
    │  (source of truth)  │  │ (queue/cache)│  │  (media)         │
    │  Auth · RLS · RT    │  └────────────┘  └──────────────────┘
    └─────────┬──────────┘
              │ one-way push
    ┌─────────▼──────────┐       ┌──────────────────────────────┐
    │  Zoho CRM           │       │  WhatsApp (via SalesIQ)      │
    │  (read-only mirror) │       │  Meta Cloud API              │
    │  Support visibility │       │  WhatsApp Flows              │
    └────────────────────┘       └──────────────────────────────┘
```

### Key Boundaries

- **Android never talks to Supabase directly** — all data flows through the backend API.
- **Web console mutations go through the backend API** — Supabase Realtime is for live updates only.
- **AI agents use CLI/MCP/API/queues** — never Android UI automation.
- **One store per user per day** — JWT carries `store_id` claim. No store switching.
- **WhatsApp bot logic lives in the backend** — SalesIQ is middleware only; Zobot is a thin relay.
- **Zoho CRM is write-only from our perspective** — backend pushes; never reads from CRM.
- **Inventory count is scan-only** — no manual data entry during counting.

---

## 5. Offline-First Architecture — One-Way Sync

*Unchanged from v2. See v2 §5 for full detail on:*
- Sync direction registry (device-owned vs server-owned entities)
- Server-side ingest pipeline (authenticate → dedup → detect version → transform → validate → import)
- Outbox queue design
- Transformer pattern
- Idempotency handling
- Room database strategy (destructive migration with `onCreate` callback)

**Addition to sync direction registry:**

| Entity | Direction | Write Owner |
|---|---|---|
| InventoryShelfCount | Device → Server | Device |
| InventoryShelfCountLine | Device → Server | Device |
| Shelf | Server → Device | Server |
| Customer | Server → Device | Server (created via API, cached on device) |
| LoyaltyWallet | Server → Device | Server (read-only cache for POS lookup) |
| ShiftTemplate | Server → Device | Server |
| ShiftSelection | Device → Server | Device |
| AttendanceLog | Device → Server | Device |
