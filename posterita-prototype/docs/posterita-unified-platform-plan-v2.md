# Posterita Unified Platform Plan — v2

---

## 1. Executive Summary

Build one unified Posterita platform comprising:

- **One Android shell app** for all internal store operations (POS, staff ops, supervisor, inventory)
- **One web control console** for device management, approvals, reconciliation, and operations oversight
- **One backend platform** serving both surfaces plus AI agent integration

The current `Posterita Android` repo provides the behavioral foundation for POS, till, printing, sync, Blink, and offline patterns. The local `Posterita Loyalty` repo serves only as a loyalty-contract reference — it will not remain a separate long-running backend.

### Design Principles

1. **Offline-first** — every store-floor operation must work without connectivity and reconcile cleanly when connectivity returns.
2. **Capability-driven** — what a user sees and can do is a function of their role, their device assignment, and the store context. No hardcoded screen lists.
3. **Auditable by default** — every mutation of business consequence produces an audit event. No silent writes.
4. **AI-operable** — the system exposes CLI, API, MCP, and queue-based interfaces so agents can participate in operations without touching device UI.
5. **Migration-safe** — the current app stays compilable and shippable at every step. No big-bang cutover.

### MVP Scope Boundary

**In scope:** Retail POS, Staff Ops, Supervisor, Inventory Basic, Loyalty at POS, Reconciliation, Device/Capability management.

**Explicitly deferred:** Restaurant suite, queue management, bookings, order-ahead, marketing campaigns, support/social inbox, Deliveroo, ABSA, SalesIQ, full HR engine, payroll deductions, advanced costing/freight/duty, utility bills, full AI copilot.

---

## 2. Current State and Migration Context

### What Exists Today

| System | Role Today | Fate |
|---|---|---|
| Posterita Android app | Live POS in stores, staff features, Blink integration | Becomes the shell app via incremental refactor |
| Posterita Loyalty (Flask) | Loyalty backend, voucher engine, consent | Behavior extracted into unified backend; Flask instance retired |
| Zoho Creator | Some operational data storage, WhatsApp flows | Data storage removed; WhatsApp adapter role retained |
| Zoho CRM | Customer and contact data | Remains as CRM; sync adapter built if needed post-MVP |
| Xero | Accounting system of record | No change; reconciliation exports built as needed |
| Room (Android local DB) | Offline cache, pending mutations | Retained and improved with proper migrations |

### Migration Constraints

- **Stores are live.** The current Android app is running in production. There is no maintenance window long enough for a big-bang migration. Every refactoring step must keep the current app shippable.
- **Data must move.** Operational data currently scattered across Zoho Creator, the Flask loyalty DB, and Android local storage must migrate to Supabase Postgres. This requires a data migration plan with validation gates (see §10).
- **Staff must not retrain twice.** The new app should feel familiar to cashiers. UX changes should be evolutionary, not revolutionary, in the first release.

---

## 3. Final Stack and Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| Android | Kotlin, Gradle, multi-module, Play App Bundle | Store-floor operations, offline-first, capability-driven UI |
| Web Console | Next.js on Vercel | Device/capability/approval management, reconciliation, ops control |
| Backend API | NestJS modular monolith on Render | Business APIs, one-way sync orchestration, loyalty engine, reconciliation, agent-control |
| Background Workers | NestJS workers on Render | Push ingest processing, loyalty jobs, WhatsApp dispatch, file processing, notifications |
| Cron | Render cron service | Scheduled reconciliation, heartbeat stale-check, report generation |
| Database | Supabase Postgres | Sole operational source of truth |
| Auth | Supabase Auth + backend-managed device/app sessions | Phone OTP, JWT, device enrollment tokens, session revocation |
| Realtime | Supabase Realtime | Dashboard live updates, device command inbox, approval status push |
| Cache/Queue | Redis (Render-hosted or Upstash) | Job queues (BullMQ), rate limiting, session cache, idempotency key store |
| Media | Cloudinary | Product images, reconciliation evidence, signatures, documents, audio |
| WhatsApp | Zoho (adapter only) | Outbound customer comms, loyalty notifications — no business data stored |
| Source Control | GitHub | Monorepo or multi-repo, PR-based workflow |
| Android CI/CD | GitHub Actions | Lint, test, build, sign, artifact publish |
| Android Cloud Testing | Firebase Test Lab | Instrumentation tests on real devices/emulators |
| Android UI Automation | Maestro | Business-flow end-to-end tests |
| Monitoring | Sentry (errors), Render metrics, Supabase dashboard, UptimeRobot | See §12 |
| Receipt Printing | Epson ePOS SDK for Android | Bluetooth, WiFi, USB Epson printers |
| Card Payments | Blink SDK (existing integration preserved) | Card/tap payments at POS, requires connectivity |

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CONTROL PLANE                         │
│  Users · Devices · Capabilities · Stores · Terminals    │
│  Approvals · Audit · Agent Tasks                        │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌───────▼────────────────┐
    │   ANDROID SHELL     │  │   WEB CONSOLE          │
    │   (Store Floor)     │  │   (Back Office)        │
    │                     │  │                        │
    │  Base Runtime       │  │  Device Allocation     │
    │  Capability Loader  │  │  Capability Mgmt       │
    │  Offline-First DB   │  │  Approval Dashboards   │
    │  Sync Engine        │  │  Reconciliation Review │
    │  Feature Modules    │  │  Ops Control           │
    │  App Switcher       │  │  AI Task Center        │
    └──────────┬──────────┘  └───────┬────────────────┘
               │                      │
    ┌──────────▼──────────────────────▼───────────────┐
    │              BACKEND PLATFORM (Render)           │
    │                                                  │
    │  API Service    Worker Service    Cron Service   │
    │  ──────────     ──────────────    ────────────   │
    │  Business APIs  Sync ingest    Stale checks   │
    │  Auth/sessions  Loyalty jobs     Report gen     │
    │  Sync orch.     File processing  Cleanup        │
    │  Agent-control  Notifications                   │
    │  Loyalty engine WhatsApp dispatch               │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────┐
    │              DATA LAYER                          │
    │                                                  │
    │  Supabase Postgres    Redis         Cloudinary   │
    │  (source of truth)    (queue/cache) (media)      │
    │  Auth · RLS · RT                                 │
    └─────────────────────────────────────────────────┘
```

### Key Boundaries

- **Android never talks to Supabase directly.** All data flows through the backend API. Supabase Realtime is used only for the web console and for device-command push via backend-controlled channels.
- **Android creates master data (products, categories, users) by calling the backend API directly** — same endpoints as the web console. The device acts as a thin client for these operations (requires connectivity). The response is cached locally in Room.
- **Web console can use Supabase Realtime** for live dashboard updates, but all mutations go through the backend API.
- **AI agents interact through** backend API, CLI, MCP, and Redis queues — never through Android UI automation.
- **A user works in one store per day.** No multi-store session switching. Device enrollment binds to a store.

---

## 5. Offline-First Architecture — One-Way Sync

### Core Principle: No Conflicts by Design

Sync is always a **one-way street**. Every entity type has exactly one configured owner — either the server or the device. The owner is the only side that can create or mutate that entity. The other side receives updates as a read-only consumer. Because there is only one writer per entity, conflicts are structurally impossible.

This is the single most important architectural decision in the system. It eliminates an entire class of bugs (merge conflicts, last-write-wins races, split-brain state) and makes the sync engine dramatically simpler to build, test, and reason about.

### Sync Direction Configuration

Every entity type is registered in a **Sync Direction Registry** that declares who owns writes:

| Entity Type | Write Owner | Direction | Android Role | Server Role |
|---|---|---|---|---|
| `Order` | Device | Device → Server | Creates & mutates | Receives & stores |
| `OrderLine` | Device | Device → Server | Creates & mutates | Receives & stores |
| `Payment` | Device | Device → Server | Creates & mutates | Receives & stores |
| `TillSession` | Device | Device → Server | Opens & closes | Receives & stores |
| `TillReconciliation` | Device | Device → Server | Creates with evidence | Receives & stores |
| `AttendanceEvent` | Device | Device → Server | Check-in/check-out | Receives & stores |
| `LeaveRequest` | Device | Device → Server | Submits | Receives & stores |
| `ExpenseClaim` | Device | Device → Server | Submits | Receives & stores |
| `MaintenanceTicket` | Device | Device → Server | Creates with photo | Receives & stores |
| `Request` (stationery, pickup, etc.) | Device | Device → Server | Submits | Receives & stores |
| `InventoryCountSession` | Device | Device → Server | Creates & submits | Receives & stores |
| `LoyaltyAward` | Device | Device → Server | Queues award | Receives, validates, applies |
| `Product` | Server | Server → Device | Read-only cache | Creates & mutates |
| `Category` | Server | Server → Device | Read-only cache | Creates & mutates |
| `Barcode` | Server | Server → Device | Read-only cache | Creates & mutates |
| `LoyaltyWallet` | Server | Server → Device | Read-only cache | Mutates (balance changes) |
| `LoyaltyVoucher` | Server | Server → Device | Read-only cache | Creates & mutates |
| `CapabilityProfile` | Server | Server → Device | Read-only, drives UI | Creates & mutates |
| `DeviceAssignment` | Server | Server → Device | Read-only | Creates & mutates |
| `RevocationVersion` | Server | Server → Device | Read-only, triggers lockout | Mutates |
| `User` (profile) | Server | Server → Device | Read-only cache | Creates & mutates |
| `Role` | Server | Server → Device | Read-only cache | Creates & mutates |
| `Store` | Server | Server → Device | Read-only cache | Creates & mutates |
| `Terminal` | Server | Server → Device | Read-only cache | Creates & mutates |
| `Approval` (decision) | Server | Server → Device | Read-only (sees result) | Supervisor decides via web |
| `Task` (assignment) | Server | Server → Device | Read-only (sees assignment) | Supervisor assigns via web |

This registry is the source of truth for what the sync engine does. Adding a new entity type to the system means adding one row here.

### The Sync Flows

There are exactly two sync operations, and they never overlap for the same entity:

```
DEVICE-OWNED ENTITIES (e.g., Orders, Attendance, Requests)
═══════════════════════════════════════════════════════════

  Android (Room)                        Backend (Postgres)
  ─────────────                         ──────────────────
  Outbox Queue       ────PUSH────►      Ingest Endpoint
  (pending mutations)                   ├─ Validate
                                        ├─ Apply (insert/update)
                                        ├─ Mark as received
                                        └─ Return receipt + server timestamp

  Device NEVER pulls these entities back. Server is the downstream consumer.


SERVER-OWNED ENTITIES (e.g., Products, Categories, Capabilities)
════════════════════════════════════════════════════════════════

  Android (Room)                        Backend (Postgres)
  ─────────────                         ──────────────────
  Local read-only    ◄────PULL────      Delta Endpoint
  cache                                 ├─ Changes since device's last cursor
                                        ├─ Tombstones for deletes
                                        └─ New cursor for next pull

  Device NEVER pushes mutations for these entities. Server is the sole writer.
```

### Master Data Creation from Android (Thin Client Pattern)

**Question:** Products, categories, users, and other server-owned entities live in Supabase and are created via backend API. But what if a supervisor wants to create a product from their Android device?

**Answer: The device acts exactly like the web console — it calls the same backend API directly. No local-first creation, no outbox, no sync. Just a straight API call.**

```
1. Supervisor taps "New Product" on Android
2. Android shows the creation form
3. Supervisor fills in details (name, price, category, photo)
4. Android calls POST /v1/products with the full payload
   ├─ Requires connectivity — if offline, show "Requires connection" 
   ├─ Server validates, creates in Supabase, returns the new product with server-issued ID
   └─ This is the SAME endpoint the web console uses
5. Android receives the response and inserts the product into its local Room cache
6. Other devices pick it up on their next pull cycle
```

**Why this is better than ID pre-allocation:**

- **One API call instead of two** (no reserve step, no skeleton rows, no draft cleanup cron)
- **Identical behavior to web console** — the Android form and the web form call the same endpoint
- **No orphaned drafts** — if the user abandons the form, nothing happened server-side
- **Simple mental model** — "creating master data needs connectivity" is easy to explain to staff
- **The device already has pull sync** — so it gets the data into its local cache naturally

**The tradeoff is acceptable:** creating products/categories/users is a supervisor activity, not something a cashier does during a checkout rush. Requiring connectivity for this is fine.

**Entities that follow this pattern (server-owned, direct API call from device):**

| Entity | Endpoint | Who Creates |
|---|---|---|
| `Product` | `POST /v1/products` | Supervisor |
| `Category` | `POST /v1/categories` | Supervisor |
| `Barcode` | `POST /v1/barcodes` | Supervisor |
| `User` | `POST /v1/auth/invite-by-phone` | Manager |
| `Asset` | `POST /v1/assets` | Supervisor |
| `Task` | `POST /v1/workforce/tasks` | Supervisor |

**Entities that follow the outbox pattern (device-owned, works offline):**

- `Order`, `Payment`, `TillSession`, `AttendanceEvent`, `LeaveRequest`, `ExpenseClaim`, `Request`, `InventoryCountSession`, `MaintenanceTicket` — device generates UUIDs locally, queues in outbox, pushes when connected.
- `LoyaltyAward` — device generates a UUID and pushes; server validates idempotency by order UUID.

### Thin Client UX on Android (Master Data Creation)

When a supervisor creates server-owned data from Android, the UX must handle connectivity gracefully:

**Before the form opens:**
- Check connectivity. If offline, show a clear message: "Creating [products/categories] requires an internet connection." Do not show the form.
- If on a weak connection, warn: "Your connection is slow — saving may take a moment."

**While filling the form:**
- The form is local — no API calls while the user is typing. Photos/media are captured locally and held in memory.
- Do not auto-save drafts to the server. The user explicitly taps "Save" when ready.

**On save:**
- Show a loading indicator. Call the backend API (`POST /v1/products`, etc.).
- **Success:** insert the returned entity into Room cache, navigate to the entity detail screen, show confirmation.
- **Network error:** show "Could not save. Check your connection and try again." Keep the form populated so the user doesn't lose their work.
- **Validation error:** show the specific field errors inline. The user corrects and retries.
- **Server error (5xx):** show "Something went wrong. Please try again." Allow retry.

**Key rule:** the form contents are never persisted locally as a "pending draft." If the app is killed before save, the form data is lost. This is acceptable — creating a product takes 30 seconds, not 30 minutes. The simplicity of "it either saved to the server or it didn't" is worth the tradeoff.

### Outbox Queue (Device → Server)

For device-owned entities, every operation goes into a local **Outbox** in Room. The device's only job is to serialize what happened and push it. The server handles the rest.

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Local mutation ID (also used as `Idempotency-Key` header) |
| `entity_type` | String | e.g., `order`, `attendance_event`, `loyalty_award` |
| `payload` | JSON | Full entity payload — whatever format the app version produces |
| `app_version` | String | App version that created this mutation (helps server pick the right transformer) |
| `created_at` | Timestamp | Local wall-clock time |
| `device_monotonic_seq` | Long | Monotonically increasing per-device sequence |
| `status` | Enum | `pending`, `syncing`, `synced` |
| `retry_count` | Int | Number of push attempts |

Note: there is no `failed` or `conflict` status in normal operation. The server accepts everything. The only scenario where a push doesn't eventually succeed is a permanent auth failure (revoked device) — and that triggers a lockout, not an outbox status change.

### Pull Cursor (Server → Device)

For server-owned entities, the device maintains a **pull cursor** per entity type:

| Field | Type | Purpose |
|---|---|---|
| `entity_type` | String | e.g., `product`, `category`, `capability_profile` |
| `last_cursor` | String | Opaque cursor from server (encodes last `updated_at` + `id`) |
| `last_pulled_at` | Timestamp | When the device last successfully pulled |

Pull is simple: `GET /v1/sync/pull?entity_type=product&cursor=abc123` → server returns changes since that cursor + new cursor. Device overwrites its local cache. No merge logic — the server version is always correct.

### Sync Retry and Scheduling

**Push (device-owned):**
- Triggered on: mutation created, connectivity restored, periodic timer (60s)
- Retry: exponential backoff with jitter — 2s → 4s → 8s → 16s → 30s cap
- **No max retry limit.** The server always accepts, so a push only fails due to network issues or server downtime. The device keeps retrying until it gets through.
- Ordering: mutations for the same entity pushed in `device_monotonic_seq` order; cross-entity mutations can push in parallel
- Connectivity-aware: sync engine observes `ConnectivityManager`, only attempts when network is available

**Pull (server-owned):**
- Triggered on: app foreground, periodic timer (5 min for catalog, 30s for capabilities/commands), manual refresh
- Pull frequency is configurable per entity type (products change rarely; approval decisions change often)
- Battery-aware: bulk catalog pull deferred when battery < 15% unless user-initiated
- Stale threshold: if `last_pulled_at` for a critical entity (capabilities, revocation) is older than 10 minutes and device is online, force pull before allowing operations

### Server-Side Sync Ingest — The Universal Receiver

**The core rule: the server never rejects a POS push because of format.** The device sends its JSON. The server's job is to accept it, figure out what it is, normalize it, and get it into the database. Period.

This is the most important design principle in the sync layer. It means:

- An old app version sends JSON in an old format → the server transforms it to the current schema and imports it.
- A new app version sends JSON in the new format → the server imports it directly.
- A device sends a field the server doesn't recognize → the server ignores the unknown field and imports what it understands.
- A device omits a field that was added in a newer schema → the server fills in a sensible default and imports it.
- A device sends a duplicate (same idempotency key) → the server returns success without re-importing.

**The ingest pipeline:**

```
Device pushes JSON
       │
       ▼
┌─────────────────────┐
│ 1. AUTHENTICATE     │  Verify device token + user JWT
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. DEDUP            │  Check idempotency key in Redis
│                     │  If seen → return original response, done
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. DETECT VERSION   │  Look at payload shape, app_version header,
│                     │  or explicit schema_version field to determine
│                     │  which format the device is sending
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. TRANSFORM        │  Run the appropriate transformer to normalize
│                     │  the payload to the current DB schema:
│                     │  - Add missing fields with defaults
│                     │  - Rename old field names to new ones
│                     │  - Convert old enums/types to current ones
│                     │  - Strip unknown fields
│                     │  - Fix phone number formats, etc.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. VALIDATE         │  Validate the normalized payload against
│                     │  current business rules (not format rules)
│                     │  This should almost never fail.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. IMPORT           │  Insert/update into Supabase Postgres
│                     │  Record idempotency key in Redis (24h TTL)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 7. ACK              │  Return success to device
│                     │  Device marks outbox item as synced
└─────────────────────┘
```

**Why this matters:**

- **App updates don't break sync.** When you ship a new app version that changes the JSON shape, old devices that haven't updated yet keep working. Their old-format JSON still syncs. No forced updates, no sync failures, no data loss.
- **The device stays dumb.** The POS app doesn't need to know about schema evolution. It just serializes what happened and pushes. All the intelligence is server-side.
- **Data loss only happens if there's no internet.** As long as the device can reach the server, its data gets in. The only loss scenario is: device wipes (app update, destructive migration) before pushing, AND the device had no connectivity since the last push. With daily sync that's a very small window.

**Format version management:**

The server maintains a registry of known payload formats per entity type:

```typescript
// sync/transformers/order.transformer.ts

const ORDER_TRANSFORMERS = {
  // Version detection: if payload has 'payment_data' as a JSON blob, it's v1
  // If payload has 'payments' as an array, it's v2
  
  v1: (payload: any) => ({
    ...payload,
    // v1 had payment data as a JSON blob, normalize to structured array
    payments: parsePaymentBlob(payload.payment_data),
    // v1 didn't have store_id, infer from device registration
    store_id: payload.store_id || inferStoreFromDevice(payload.device_id),
    // v1 used camelCase for some fields
    order_lines: payload.orderLines || payload.order_lines,
    // Strip the old blob field
    payment_data: undefined,
  }),
  
  v2: (payload: any) => ({
    ...payload,
    // v2 is the current format — minimal transformation
    // Just ensure defaults for any newly added optional fields
    loyalty_awarded: payload.loyalty_awarded ?? false,
  }),
};

function transformOrder(payload: any, appVersion: string): NormalizedOrder {
  const version = detectOrderVersion(payload);
  const transformer = ORDER_TRANSFORMERS[version];
  return transformer(payload);
}
```

**Adding a new field to the schema:**

1. Add the field to the DB table (with a default value)
2. Add a transformer that fills in the default when old-format payloads don't include it
3. Update the new app version to send the field
4. Old app versions keep working — the transformer fills in the default

**Changing a field name or type:**

1. Add the transformer that maps old name/type → new name/type
2. Update the new app version to send the new format
3. Old app versions keep working — the transformer handles the mapping

**The only things the server rejects:**

| Scenario | Why It's Rejected | Device Behavior |
|---|---|---|
| Invalid authentication (bad token, revoked device) | Security — not a format issue | Trigger re-auth or lockout |
| Completely unrecognizable payload (not JSON, no entity type) | Corruption — something went very wrong | Mark `failed`, log to Sentry for investigation |
| Rate limited | Traffic control | Retry with backoff |
| Server error (5xx) | Server bug or downtime | Retry with backoff |

Note what's **not** in that list: validation errors, missing fields, wrong format, stale references, business rule violations. The server handles all of those by transforming, defaulting, or logging for review — not by rejecting the push. The POS data gets in.

### Idempotency (Safe Retries)

If a device pushes and the network drops before it receives the acknowledgment, it will retry. The server handles this gracefully:

- Every push includes an `Idempotency-Key` header (the outbox mutation's UUID)
- If the server has already processed that key, it returns the original success response — no duplicate write
- Idempotency keys stored in Redis with 24h TTL
- This is not conflict resolution — it's retry safety for the one-way push

### Offline-Capable Operations (MVP)

| Operation | Works Offline? | Notes |
|---|---|---|
| Create order | Yes | Device-owned, queued in outbox |
| Process payment (cash) | Yes | Device-owned, queued in outbox |
| Process payment (card/Blink) | No | Requires live payment gateway |
| Award loyalty points | Yes | Device-owned push, server validates on receipt |
| Redeem voucher | No | Requires server to validate voucher state in real-time |
| Open till | Yes | Device-owned, queued in outbox |
| Close till | Yes | Device-owned, evidence uploaded when connected |
| Attendance check-in/out | Yes | Device-owned, queued in outbox |
| Submit leave request | Yes | Device-owned, queued in outbox |
| Submit stationery request | Yes | Device-owned, queued in outbox |
| Barcode scan/lookup | Partial | Product catalog cached from last pull; new products need connectivity |
| Create new product | No | Server-owned — calls backend API directly like web console, then pull caches it |
| Create new category | No | Server-owned — calls backend API directly like web console, then pull caches it |
| Create new user | No | Server-owned — calls backend API directly |
| View approval decisions | Partial | Cached from last pull; fresh decisions need connectivity |

---

## 6. Authentication and Session Model

### Auth Flows

**Staff Onboarding:**
1. Supervisor invites staff by phone number via web console → `POST /v1/auth/invite-by-phone`
2. Staff receives WhatsApp OTP
3. Staff enters OTP on Android device → `POST /v1/auth/verify-otp`
4. Backend creates Supabase Auth user + returns initial JWT pair
5. Staff completes profile setup on device

**Device Enrollment:**
1. Supervisor creates device enrollment QR in web console
2. QR contains: `{ enrollment_token, store_id, capability_profile_id }`
3. Android app scans QR → `POST /v1/devices/enroll`
4. Backend validates enrollment token, registers device, returns device session
5. Device downloads capability snapshot + initial data sync

**Daily Login:**
1. Staff opens app → enters PIN or biometric
2. App sends `POST /v1/auth/login` with device token + user credential
3. Backend returns JWT pair (access: 15min, refresh: 7 days)
4. Access token attached to all API calls; refresh token used silently

**Single-Store Binding:**
A user works in exactly one store per day. The store context is established at device enrollment (the QR code carries `store_id`). The JWT access token includes `store_id` as a claim — every API call is scoped to that store. There is no store-switching flow. If a user moves to a different store, the device must be re-enrolled.

### Token Lifecycle

| Token | Lifetime | Storage | Revocation |
|---|---|---|---|
| Access JWT | 15 minutes | Android Keystore (encrypted) | Short-lived, natural expiry |
| Refresh JWT | 7 days | Android Keystore (encrypted) | Server-side revocation list in Redis |
| Device Token | Until revoked | Android Keystore | `RevocationVersion` broadcast |
| Enrollment Token | 24 hours, single-use | Backend only | Consumed on use |

### Device Revocation

When a device is revoked via the web console:

1. Backend increments `RevocationVersion` for the device
2. Supabase Realtime pushes new version to device command channel
3. On next API call or heartbeat, device receives `403 Device Revoked`
4. Android app triggers: token wipe → sensitive local data wipe → hard lock screen → uninstall prompt
5. If device is offline during revocation, lockout triggers on next connectivity

---

## 7. Android App Strategy

### Single App, Capability-Driven

Ship one installed Android app. Every phone or tablet is a `Device`. A POS terminal is a capability assigned to a device, not a separate app.

### Module Structure

```
:app                          ← Shell, app switcher, DI root
:core:designsystem            ← Theme, components, tokens
:core:auth                    ← Login, PIN, biometric, token management
:core:device                  ← Enrollment, heartbeat, revocation
:core:data                    ← Room DB, DAOs, sync engine, offline queue
:core:navigation              ← Shared nav graph, deep links
:core:sync                    ← Outbox push (serialize + send), server pull (receive + cache), retry engine
:core:network                 ← API client, interceptors, connectivity observer
:core:printer                 ← Epson ePOS SDK wrapper, printer discovery, receipt formatting
:core:media                   ← Cloudinary upload, camera, signature capture
:feature:home                 ← Role-first home screen, app switcher
:feature:pos-legacy           ← Current POS screens (wrapped, not rewritten)
:feature:reconciliation       ← Close till, evidence upload, discrepancy flow
:feature:inventory-basic      ← Counts, barcode request, naming request
:feature:loyalty              ← Earn/redeem/consent at POS
:feature:staff-ops            ← Attendance, leave, tasks, expenses, assets
:feature:supervisor           ← Approvals, checklists, shift mgmt, warnings
```

### Install-Time vs On-Demand

**Install-time (base APK):**
- All `:core:*` modules
- `:feature:home`
- `:feature:pos-legacy`
- `:feature:reconciliation`
- `:feature:loyalty`
- `:feature:inventory-basic`

**On-demand (dynamic feature modules):**
- `:feature:staff-ops`
- `:feature:supervisor`

Keep on-demand groups to a maximum of 4 for the first release. Restaurant and Marketing/Support are future on-demand groups.

### Migration Approach

1. **Do not rewrite.** Wrap the existing POS code into `:feature:pos-legacy` without changing its behavior.
2. **Build the shell around it.** Add `:app`, `:core:*`, and `:feature:home` as new code.
3. **Keep `:app` green at every commit.** The Gradle build must pass after every refactoring step.
4. **Replace incrementally.** Individual screens within `:feature:pos-legacy` can be replaced one at a time in later iterations.
5. **Split dynamic features only after the shell is stable.** Premature modularization is worse than a slightly fat APK.

### Blink Payment Integration

Blink is the card/tap payment SDK used at POS. During migration:

- **Do not refactor Blink integration code.** It lives inside `:feature:pos-legacy` and moves with it as-is.
- Blink calls are inherently online-only — they require a live connection to the payment gateway.
- The current Blink SDK version must be verified at the start of Phase 1 (check for deprecation notices or required updates).
- If the Blink SDK requires updates, do them in a standalone PR against `:feature:pos-legacy` before any shell refactoring begins.
- Blink payment results flow into the `Payment` entity in the outbox like any other payment — the difference is that the Blink call itself must succeed online before the payment record is created.
- Long-term: when `:feature:pos-legacy` is eventually replaced screen-by-screen, the Blink integration layer should be extracted into a `:core:payments` module that `:feature:pos` depends on.

### Epson Printer Module (`:core:printer`)

Receipt printing uses Epson ePOS SDK. The module provides:

- **Printer discovery:** scan for Epson printers over Bluetooth, WiFi, and USB.
- **Connection management:** connect/disconnect, handle connection drops gracefully, auto-reconnect.
- **Receipt formatting:** a receipt builder API that accepts order data and produces ESC/POS commands. Centralizes receipt layout so it's consistent across all modules that print.
- **Print queue:** if the printer is busy or temporarily disconnected, queue the job and retry. Surface failure to the user after 3 attempts.
- **Abstraction layer:** the rest of the app talks to a `PrinterService` interface, not the Epson SDK directly. This lets us add support for other printer brands later without touching business code.
- **No-printer fallback:** if no printer is configured or connected, POS operations still work. The receipt is stored digitally and can be reprinted later or sent via WhatsApp.

### Room Database Strategy

**Keep it simple:** the local database is a cache and an outbox, not the source of truth. If it gets wiped, the device re-pulls from the server and life goes on. The only real risk is losing unpushed outbox items — and since orders sync at least daily, the exposure window is small.

**Approach: Keep destructive migration, but make it graceful.**

```kotlin
Room.databaseBuilder(context, PosteritaDatabase::class.java, "posterita.db")
    .fallbackToDestructiveMigration() // keep this — it's fine for a cache/outbox DB
    .addCallback(object : RoomDatabase.Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            // Database was just created (fresh install or post-wipe)
            // Flag the device to do a full pull from server
            db.execSQL(
                "INSERT INTO sync_meta (key, value) VALUES ('needs_full_pull', 'true')"
            )
        }
    })
    .build()
```

**What happens on a schema change (app update):**

1. Room sees version mismatch → drops and recreates the database (destructive migration fires)
2. `onCreate` callback runs → sets `needs_full_pull = true`
3. Sync engine sees the flag on next run → does a full pull of all server-owned entities (products, categories, capabilities, etc.)
4. Device is back to normal within seconds/minutes depending on catalog size

**What you lose on a wipe:**

| Data | Lost? | Impact | Mitigation |
|---|---|---|---|
| Cached products, categories, capabilities | Rebuilt on pull | Seconds of delay | Automatic — pull engine handles it |
| Outbox items not yet pushed (orders, attendance, etc.) | Yes, lost | Low — orders sync at least daily | Push frequently when online; accept the small risk window |
| Pull cursors | Reset | Full pull instead of delta pull, slightly slower | Self-healing, no action needed |
| User session tokens | Lost | User has to log in again | Minor inconvenience after an app update |

**The tradeoff:** You skip writing and testing explicit migration code for every schema change. In exchange, you accept that app updates wipe the local DB and trigger a re-pull. For a cache/outbox database backed by a server source of truth, this is a reasonable tradeoff.

**One improvement over today:** Add the `onCreate` callback so the app knows it was wiped and proactively re-pulls, instead of the user seeing empty screens and wondering what happened.

**When to reconsider:** If in the future the local database starts holding data that takes a long time to rebuild (e.g., thousands of products with images, or a large offline transaction history), then invest in proper migrations. For MVP with a manageable catalog and daily sync, keep it simple.

### Remote Device Revocation Behavior

1. Token invalidation (access + refresh + device)
2. Sensitive local data wipe (orders with customer data, loyalty data, cached credentials)
3. Hard lock screen overlay — app is unusable
4. Uninstall prompt displayed
5. Do **not** attempt silent uninstall — standard Android does not support it reliably

---

## 8. Backend Platform

### Module Map

| Module | Responsibility |
|---|---|
| `auth` | Phone OTP, JWT issuance/refresh, session management |
| `users` | Staff profiles, emergency contacts |
| `roles` | Role definitions, hierarchy |
| `capabilities` | Capability profiles, assignment to users/devices |
| `devices` | Enrollment, heartbeat, revocation, command inbox |
| `stores` | Store config, terminals, printers |
| `pos` | Orders, payments, refunds, holds, cart rules |
| `tills` | Open/close, session tracking |
| `reconciliation` | Discrepancy workflow, evidence, resolution |
| `inventory` | Counts, barcode requests, naming requests, stock events |
| `requests` | Stationery, pickups, customer items — generic request engine |
| `workforce` | Attendance, leave, tasks, expenses, asset acceptance, maintenance |
| `loyalty` | Wallets, awards, vouchers, consent — ported from Flask reference |
| `files` | Upload orchestration to Cloudinary, metadata in Postgres |
| `notifications` | Push (FCM), in-app, WhatsApp dispatch |
| `whatsapp-integration` | Zoho adapter for WhatsApp Business API |
| `audit` | Immutable audit event log |
| `sync` | Ingest pipeline (dedup → detect version → transform → import), pull delta endpoint, format transformers per entity type |
| `compliance` | Data deletion requests, consent audit, DPA 2017 reporting |
| `agent-control` | Agent tasks, commands, approval gates |
| `jobs` | BullMQ job definitions, scheduling, retry policies |

### NestJS Structure

```
src/
├── main.ts
├── app.module.ts
├── common/                    ← Guards, interceptors, filters, decorators
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── device-auth.guard.ts
│   │   ├── capability.guard.ts
│   │   └── role.guard.ts
│   ├── interceptors/
│   │   ├── audit.interceptor.ts
│   │   └── idempotency.interceptor.ts
│   ├── filters/
│   │   └── business-exception.filter.ts
│   └── decorators/
│       ├── requires-capability.ts
│       └── idempotent.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── devices/
│   ├── capabilities/
│   ├── stores/
│   ├── pos/
│   ├── tills/
│   ├── reconciliation/
│   ├── inventory/
│   ├── requests/
│   ├── workforce/
│   ├── loyalty/
│   ├── files/
│   ├── notifications/
│   ├── whatsapp/
│   ├── audit/
│   ├── compliance/
│   ├── sync/
│   │   ├── sync.controller.ts          ← push + pull endpoints
│   │   ├── sync.service.ts             ← ingest pipeline orchestration
│   │   ├── sync-direction.config.ts    ← entity ownership registry
│   │   └── transformers/               ← one file per entity type
│   │       ├── order.transformer.ts
│   │       ├── payment.transformer.ts
│   │       ├── attendance.transformer.ts
│   │       ├── leave-request.transformer.ts
│   │       └── ...                     ← add one per syncable entity
│   ├── agent-control/
│   └── jobs/
└── workers/
    ├── sync-ingest.processor.ts
    ├── loyalty.processor.ts
    ├── notification.processor.ts
    ├── file-processing.processor.ts
    └── reconciliation.processor.ts
```

---

## 9. Source-of-Truth Data Model

### Core Entities

**Organization & Structure:**
`Organization`, `Brand`, `Store`, `Terminal`, `Printer`

**Identity & Access:**
`User`, `Role`, `CapabilityProfile`, `Device`, `DeviceAssignment`, `DeviceHeartbeat`, `RevocationVersion`, `CapabilitySnapshot`

**POS & Transactions:**
`Order`, `OrderLine`, `Payment`, `TillSession`, `TillReconciliation`, `ReconciliationEvidence`

**Inventory:**
`Product`, `Category`, `Barcode`, `InventoryCountSession`, `InventoryCountLine`, `StockEvent`

**Requests & Workflow:**
`Request`, `Task`, `Approval`, `ApprovalRequest`

**Workforce:**
`LeaveRequest`, `AttendanceEvent`, `ExpenseClaim`, `Asset`, `MaintenanceTicket`

**Loyalty & Compliance:**
`LoyaltyWallet`, `LoyaltyVoucher`, `ConsentRecord`, `DataDeletionRequest`

**Files & Audit:**
`Attachment`, `AuditEvent`

**Agent:**
`AgentTask`, `AgentCommand`

### Key Schema Design Decisions

1. **UUIDs everywhere.** All primary keys are UUIDv7 (time-sortable). No auto-increment integers exposed externally.
2. **Soft deletes on business entities.** `deleted_at` timestamp, never hard delete in application code. Hard deletes only via maintenance jobs with audit.
3. **Immutable orders.** Once an order reaches `completed` status, it cannot be mutated — only refunded via a linked refund order.
4. **Temporal columns on all tables:** `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`.
5. **`idempotency_key` on all mutation-accepting tables** to support offline push replay.
6. **RLS policies** enforce tenant isolation at the Supabase level. Backend service role bypasses RLS; direct Supabase access (web console realtime) uses RLS.
7. **Sync direction is configuration, not code.** A `sync_direction_config` table (or application config) declares write owner per entity type. The sync engine reads this config — adding a new syncable entity means adding a config row, not changing sync code.
8. **`store_id` on all store-scoped entities.** Every order, product, attendance event, etc. is scoped to a store. Combined with the JWT `store_id` claim, this enforces single-store isolation at the data level.
9. **DPA compliance built in.** `ConsentRecord` is immutable and timestamped (what, why, when, who). `DataDeletionRequest` tracks right-to-erasure requests with status, requested_at, completed_at, and the list of tables purged. Customer PII can be anonymized on request while preserving aggregate transaction history.

### Data Storage Rules

- **Supabase Postgres** is the only operational source of truth.
- **Cloudinary** stores binaries; Postgres stores references (Cloudinary public ID, URL, metadata).
- **Zoho Creator** is no longer used for app data storage.
- **Zoho** remains an outbound connector for WhatsApp communication only.
- **Android Room** remains the offline-first local store: outbox for device-owned mutations, read-only cache for server-owned entities.
- **Redis** holds job queues, rate limit counters, and session cache — never business truth.

---

## 10. Data Migration Strategy

### Migration Phases

**Phase 1: Schema + Reference Data**
- Deploy Supabase schema (empty)
- Migrate reference data: organizations, brands, stores, terminals, products, categories
- Validate: row counts, FK integrity, spot-check samples

**Phase 2: Transactional History**
- Migrate historical orders, payments, till sessions from current sources
- Migrate loyalty wallets and vouchers from Flask DB
- Migrate attendance and leave records from Zoho Creator
- Validate: reconcile totals (order count, payment sums, wallet balances)

**Phase 3: Dual-Write Period**
- New backend writes to Supabase
- Sync adapter mirrors critical writes to legacy systems during transition
- Duration: 2–4 weeks minimum
- Validation: daily reconciliation reports comparing old and new

**Phase 4: Cutover**
- Disable legacy system writes
- Final delta migration
- Flip Android app to new backend endpoints
- Monitor for 48 hours before decommissioning old paths

### Migration Validation Gates

Each phase requires sign-off before proceeding:

| Gate | Criteria |
|---|---|
| Row count match | Source and target row counts match within tolerance (≤0.1% variance explained) |
| Financial reconciliation | Sum of payments, loyalty balances, till sessions match exactly |
| FK integrity | Zero orphaned foreign keys in target |
| Smoke test | 10 representative end-to-end scenarios pass against new data |
| Rollback tested | Rollback procedure documented and dry-run completed |

---

## 11. API Conventions

### Wire Format

- **`snake_case`** for all JSON field names (consistency with existing mobile sync patterns)
- **Version prefix:** all new routes under `/v1/`
- **Content-Type:** `application/json` for all request/response bodies

### Standard Response Envelope

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-07-15T10:30:00Z"
  }
}
```

**Success (list):**
```json
{
  "data": [ ... ],
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-07-15T10:30:00Z"
  },
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "has_more": true,
    "limit": 50
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "till_already_closed",
    "message": "This till session was already closed at 2025-07-15T09:00:00Z.",
    "details": { "closed_by": "user_xyz", "closed_at": "2025-07-15T09:00:00Z" }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-07-15T10:30:00Z"
  }
}
```

### Error Code Convention

- Machine-readable `code` in `snake_case` (e.g., `insufficient_points`, `device_revoked`, `voucher_expired`)
- Human-readable `message` for debugging
- `details` object for structured context
- HTTP status codes used correctly: 400 validation, 401 auth, 403 authorization/capability, 404 not found, 409 conflict/state, 422 business rule violation, 429 rate limit, 500 server error

### Pagination

- **Cursor-based** for all list endpoints (no offset pagination — it breaks under concurrent writes)
- Default limit: 50, max limit: 200
- Cursor is an opaque base64 string encoding the last seen `id` + `created_at`

### Idempotency

- All `POST` endpoints that create resources accept an `Idempotency-Key` header
- If the key has been seen within 24 hours, return the original response
- Idempotency keys stored in Redis with 24h TTL
- Critical for the one-way push path — the Android outbox attaches each mutation's UUID as the idempotency key, ensuring safe retries without duplicates

### Rate Limiting

- Per-device: 100 requests/minute for normal endpoints
- Per-device: 10 requests/minute for auth endpoints
- Per-store: 1000 requests/minute aggregate
- Rate limit info returned in headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 12. API Route Catalog

### Auth
- `POST /v1/auth/invite-by-phone` — Invite staff member by phone
- `POST /v1/auth/verify-otp` — Verify OTP and establish session
- `POST /v1/auth/login` — Device + user login
- `POST /v1/auth/refresh` — Refresh access token
- `POST /v1/auth/logout` — Invalidate session

### Devices
- `POST /v1/devices/enroll` — Enroll device via QR token
- `POST /v1/devices/reassign` — Reassign device to different user/store
- `POST /v1/devices/revoke` — Revoke device access
- `POST /v1/devices/heartbeat` — Device health check-in
- `GET /v1/devices/me` — Current device info + commands

### Capabilities
- `GET /v1/capabilities/me` — Current user+device capabilities
- `PUT /v1/capabilities/device/{id}` — Update device capability profile
- `PUT /v1/capabilities/user/{id}` — Update user capability profile

### POS
- `POST /v1/pos/orders` — Create order
- `POST /v1/pos/refunds` — Process refund
- `POST /v1/pos/holds` — Hold order
- `POST /v1/pos/payments` — Record payment
- `GET /v1/pos/orders` — Order history (cursor-paginated)
- `GET /v1/pos/orders/{id}` — Order detail

### Tills
- `POST /v1/pos/tills/open` — Open till session
- `POST /v1/pos/tills/close` — Close till session

### Products (server-owned master data — same endpoints used by web console and Android)
- `POST /v1/products` — Create product
- `GET /v1/products` — List products (cursor-paginated, filterable by category/store)
- `GET /v1/products/{id}` — Product detail
- `PUT /v1/products/{id}` — Update product
- `DELETE /v1/products/{id}` — Soft-delete product

### Categories (server-owned master data)
- `POST /v1/categories` — Create category
- `GET /v1/categories` — List categories
- `PUT /v1/categories/{id}` — Update category
- `DELETE /v1/categories/{id}` — Soft-delete category

### Barcodes
- `POST /v1/barcodes` — Create/link barcode to product
- `GET /v1/barcodes/{code}` — Look up product by barcode

### Reconciliation
- `POST /v1/reconciliation` — Submit reconciliation
- `POST /v1/reconciliation/{id}/attachments` — Upload evidence
- `POST /v1/reconciliation/{id}/resolve` — Manager resolution
- `GET /v1/reconciliation` — List reconciliations (filtered, paginated)

### Inventory
- `POST /v1/inventory/counts` — Start inventory count session
- `POST /v1/inventory/counts/{id}/submit` — Submit count
- `POST /v1/inventory/barcode-requests` — Request barcode for item
- `POST /v1/inventory/item-requests` — Request new item with photo

### Requests
- `POST /v1/requests/stationery` — Stationery request
- `POST /v1/requests/pickups` — Pickup request
- `POST /v1/requests/customer-items` — Customer item request
- `GET /v1/requests` — List requests (filtered by type, status)

### Workforce
- `POST /v1/workforce/attendance/check-in` — Clock in
- `POST /v1/workforce/attendance/check-out` — Clock out
- `POST /v1/workforce/leaves` — Submit leave request
- `POST /v1/workforce/tasks` — Create/update task
- `POST /v1/workforce/expenses` — Submit expense claim
- `POST /v1/workforce/assets/acceptance` — Accept asset with signature
- `POST /v1/workforce/maintenance` — Submit maintenance ticket

### Loyalty
- `GET /v1/loyalty/wallets/{phone}` — Look up wallet by phone
- `POST /v1/loyalty/award` — Award points (idempotent by order UUID)
- `POST /v1/loyalty/vouchers/validate` — Check voucher validity
- `POST /v1/loyalty/vouchers/redeem` — Redeem voucher
- `POST /v1/loyalty/consent` — Record consent (independent of wallet existence)

### Files
- `POST /v1/files` — Upload file (routes to Cloudinary)
- `POST /v1/signatures` — Upload signature capture
- `POST /v1/audio` — Upload audio file
- `POST /v1/photos` — Upload photo

### Agent Control
- `POST /v1/agent/tasks` — Create agent task
- `POST /v1/agent/commands` — Submit agent command
- `POST /v1/agent/commands/{id}/approve` — Approve command
- `POST /v1/agent/commands/{id}/reject` — Reject command

### Sync
- `POST /v1/sync/push` — Push device-owned mutations (outbox drain)
- `GET /v1/sync/pull` — Pull server-owned entity deltas by type and cursor
- `GET /v1/sync/status` — Sync health check (last push/pull times, queue depth)

Note: Master data creation from Android (products, categories, users, assets, tasks) uses the same `POST` endpoints listed under their respective sections above — no separate sync or reserve endpoints needed. The device calls the API directly like the web console does.

### Compliance (Mauritius DPA 2017)
- `POST /v1/compliance/data-deletion-requests` — Submit customer data deletion request
- `GET /v1/compliance/data-deletion-requests` — List deletion requests (status, audit trail)
- `POST /v1/compliance/data-deletion-requests/{id}/execute` — Execute deletion (anonymize PII, preserve aggregates)
- `GET /v1/compliance/consent-audit/{phone}` — Full consent history for a customer

### Loyalty Contract Preservation

The unified backend must preserve these behaviors from the Flask reference:
- Phone normalization (strip spaces, ensure country code)
- Idempotent award by order UUID — same order ID never awards twice
- Voucher validation returns remaining value, expiry, and applicable rules
- Voucher redemption is atomic — validate + deduct in one transaction
- Consent is independent of wallet existence — consent can exist before first purchase
- Offline award/consent replay compatibility — mutations arriving out of order must resolve correctly

---

## 13. Web Control Console

### Architecture

- **Next.js 14+ App Router** on Vercel
- **Server Components** for data-fetching pages
- **Client Components** for interactive dashboards
- **Supabase Realtime** subscriptions for live updates (approval queue, device status, reconciliation alerts)
- **All mutations through backend API** — the web console never writes to Supabase directly

### Sections

| Section | Primary Users | Key Functions |
|---|---|---|
| Dashboard | Supervisors, Managers | KPIs, alerts, pending approvals count |
| Devices | IT Admin, Supervisors | Assign, revoke, monitor heartbeat, push commands |
| Users & Roles | Managers | Invite, assign roles, manage profiles |
| Capabilities | Managers | Create/edit capability profiles, assign to users/devices |
| Stores & Terminals | Managers | Store config, terminal setup, printer assignment |
| Reconciliations | Supervisors | Review discrepancies, view evidence, resolve |
| Requests | Supervisors | Stationery, pickup, customer item approvals |
| Staff Ops | Supervisors | Attendance review, leave approval, expense approval |
| Supervisor Approvals | Managers | Cross-store approvals, escalations |
| Assets & Maintenance | Managers | Asset registry, maintenance tickets |
| Loyalty & Consent | Managers | Wallet lookup, voucher management, consent audit |
| Audit Trail | Managers, Compliance | Searchable audit log with filters |
| Data Compliance | Managers | Customer data deletion requests, consent audit, DPA reporting |
| AI Task Center | Managers | Agent task queue, command approvals, execution log |

### The Web Console is the Sole Control Surface For:

- Device assignment and revocation
- Capability profile allocation
- Supervisor approvals (leave, expense, reconciliation resolution)
- Reconciliation resolution decisions
- Agent command approvals
- Bulk operations (mass device update, bulk user invite)

---

## 14. UI and UX Direction

### Android Home Screen

Replace the current screen-first drawer with a **role-first home screen**:

| Tile | Who Sees It |
|---|---|
| POS | Cashiers, Supervisors |
| Staff Ops | All staff |
| Supervisor | Supervisors only |
| Inventory | Designated inventory staff, Supervisors |
| Settings | All users |

Only modules allowed by the current device + user capability profile are visible. The home screen is the capability model made tangible.

### UX Principles

- **POS stays fast, touch-first, cashier-oriented.** Checkout latency budget: <200ms per interaction. No unnecessary confirmation dialogs in the happy path.
- **Staff Ops feels like a daily assistant,** not an ERP menu. Card-based layout, clear status indicators, minimal text entry.
- **Supervisor feels like an approval cockpit.** Queue-based, badge counts, one-tap approve/reject with optional note.
- **Close Till is a guided reconciliation flow:** expected totals → counted totals → discrepancy reason → evidence upload → manager decision. Not a form dump.
- **Loyalty is lightweight** in checkout (show points, one-tap earn) and post-sale (voucher scan).

### Explicitly Not In MVP

- Internal staff chat
- Staff location tracking/maps
- Full restaurant ordering UI
- Customer-facing kiosk mode

---

## 15. Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Android cold start | < 3 seconds | Time from tap to home screen on mid-range device |
| POS item scan to cart | < 200ms | Time from barcode scan event to item appearing in cart |
| Checkout completion | < 500ms | Time from "Pay" tap to receipt ready (cash payment) |
| Sync push (single mutation) | < 1 second | Time from push trigger to server acknowledgment |
| Sync pull (delta, <100 changes) | < 2 seconds | Time from pull request to local cache updated |
| Outbox drain (100 mutations) | < 30 seconds | Time to push all pending mutations after reconnect |
| Master data creation from device | < 1 second | Time from form submit to server confirmation (e.g., new product) |
| API response (p95) | < 300ms | Backend response time for standard CRUD endpoints |
| API response (p99) | < 1 second | Backend response time including complex queries |
| Web console page load | < 2 seconds | Time to interactive for dashboard pages |
| Dynamic feature module install | < 15 seconds | Time to download and install on-demand module on 4G |

---

## 16. Observability and Monitoring

### Error Tracking

- **Sentry** on both Android and backend
- Source maps uploaded for backend; ProGuard mappings uploaded for Android
- Alert on: new error types, error rate spike >2x baseline, any 5xx in auth or payment flows

### Application Metrics

- **Render native metrics** for backend: CPU, memory, request count, response time
- **Custom business metrics** pushed to a lightweight dashboard (can start with Supabase + a Metabase instance or a simple Next.js dashboard page):
  - Orders per hour per store
  - Sync queue depth per device
  - Reconciliation discrepancy rate
  - Failed sync mutations count
  - Device heartbeat staleness

### Uptime Monitoring

- **UptimeRobot** (or similar) hitting:
  - `GET /v1/health` on the backend (checks DB + Redis connectivity)
  - Web console URL
  - Supabase status
- Alert via WhatsApp (through Zoho adapter) and email

### Logging

- **Structured JSON logs** from NestJS (use `nestjs-pino`)
- Log levels: `error`, `warn`, `info`, `debug`
- Every log line includes: `request_id`, `user_id`, `device_id`, `store_id` where available
- Render log aggregation for search; consider Logtail/Better Stack if volume grows

### Android-Specific

- **Firebase Crashlytics** for crash reporting
- Custom events for: sync failures, offline queue overflow, capability load failures, token refresh failures
- Device health telemetry via heartbeat: battery level, storage remaining, app version, last sync time

---

## 17. Hosting, Cost, and Resource Planning

### Render Services

| Service | Type | Estimated Plan | Purpose |
|---|---|---|---|
| `posterita-api` | Web Service | Starter ($7/mo) → Standard ($25/mo) at scale | Main API |
| `posterita-worker` | Background Worker | Starter ($7/mo) | Async job processing |
| `posterita-cron` | Cron Job | Free tier or Starter | Scheduled tasks |
| Redis | Managed Redis | Free (25MB) → Starter ($10/mo) | Queues + cache |

### Supabase

| Tier | When | Key Limits |
|---|---|---|
| Free | Development | 500MB DB, 1GB storage, 50k auth users |
| Pro ($25/mo) | Production launch | 8GB DB, 100GB storage, daily backups |
| Team ($599/mo) | If >10GB DB or need SOC2 | Priority support, compliance features |

### Cloudinary

| Tier | When | Key Limits |
|---|---|---|
| Free | Development | 25 credits/mo, 25GB storage |
| Plus ($89/mo) | Production launch | 225 credits/mo, 75GB storage |
| Advanced ($224/mo) | If media volume grows significantly | 600 credits/mo, 225GB storage |

### Vercel

| Tier | When |
|---|---|
| Hobby (Free) | Development |
| Pro ($20/mo) | Production — needed for team features + custom domain |

### Monthly Cost Estimate (Production MVP)

| Service | Estimate |
|---|---|
| Render (API + Worker + Redis) | $40–60 |
| Supabase Pro | $25 |
| Cloudinary Plus | $89 |
| Vercel Pro | $20 |
| Sentry (free tier) | $0 |
| UptimeRobot (free tier) | $0 |
| Firebase (free tier, Spark) | $0 |
| GitHub (free for private repos) | $0 |
| **Total** | **~$175–195/month** |

This scales. The architecture doesn't require re-platforming as load grows — you just bump Render/Supabase tiers.

---

## 18. Security and Compliance

### Access Control

- Every API endpoint is protected by at least one guard: `JwtAuthGuard` (user identity) + `DeviceAuthGuard` (device identity) + `CapabilityGuard` (permission check)
- RLS on Supabase enforces tenant isolation even if a backend bug leaks queries
- All privileged actions (revoke device, resolve reconciliation, approve leave) require explicit capability + role check

### Audit Trail

- Every sensitive action produces an `AuditEvent`:
  - `actor_user_id`, `actor_device_id`
  - `action` (e.g., `device.revoke`, `reconciliation.resolve`, `order.refund`)
  - `target_entity_type`, `target_entity_id`
  - `before_state`, `after_state` (JSON snapshots)
  - `timestamp`, `ip_address`
- Audit events are immutable — no update or delete operations exist on the audit table
- Retention: minimum 2 years

### Financial Safety

- Do **not** auto-deduct staff pay in MVP
- Store discrepancy resolution data separately from any future payroll export
- All monetary calculations in the backend use integer cents (no floating point)
- Payment reconciliation requires human approval for discrepancies above threshold

### AI Safety Gates

| Action Type | Gate |
|---|---|
| Create task, assign request, trigger job | Auto-execute allowed |
| Summarize incident, draft workflow | Auto-execute allowed |
| Issue penalty/warning | Requires supervisor approval |
| Payroll-impacting action | Requires manager approval |
| Destructive deletion | Requires manager approval |
| Terminal revocation | Requires manager approval |
| Mass customer communication | Requires manager approval |
| Finance override | Requires manager approval |

### Customer Communications

- All WhatsApp messages sent through Zoho adapter are logged with: recipient, template, timestamp, delivery status
- Consent records are immutable and timestamped
- Opt-out must be honored immediately

---

## 19. Testing Strategy

### Unit Tests (Backend)

- Cart math: totals, discounts, tax, multi-payment split
- Loyalty: award calculation, voucher validation rules, consent logic
- Capability: profile merging, permission checks
- Reconciliation: discrepancy detection, threshold rules
- Sync: ingest transformer per entity type (v1→current, v2→current), idempotency key handling, pull cursor generation, format version detection

### Unit Tests (Android)

- Cart math (must match backend exactly)
- Discount/tax/payment calculations
- Loyalty queue behavior (offline award, retry, dedup)
- Capability filtering (feature visibility logic)
- Device revocation state machine
- Sync mutation serialization/deserialization
- Outbox queue ordering and retry logic
- Pull cursor management and cache overwrite

### Integration Tests (Backend)

- API contract tests: request/response shape validation
- Database: migration tests, seed data, constraint enforcement
- Auth flow: invite → OTP → login → refresh → logout
- Sync: push old-format JSON and verify server transforms + imports, push current-format, idempotency dedup, pull delta with cursor, master data creation from device (same API as web)

### Integration Tests (Android)

- Full re-pull after DB wipe (verify `onCreate` callback triggers full sync)
- API contract compatibility (mock server with recorded responses)
- Local DB import/export

### E2E Test Scenarios

| Scenario | Coverage |
|---|---|
| Sell item and award loyalty | POS + Loyalty + Sync |
| Redeem voucher at checkout | POS + Loyalty + Server validation |
| Close till with discrepancy + evidence upload | Till + Reconciliation + Files |
| Submit leave request and approve | Staff Ops + Supervisor + Notifications |
| Submit stationery request | Requests + Notifications |
| Scan barcode, submit naming request with image | Inventory + Files |
| Revoke device, confirm lockout | Devices + Auth + Revocation |
| Upload maintenance photo, create ticket | Workforce + Files |
| Assign task, confirm staff visibility | Workforce + Capabilities |
| Offline: create 5 orders, reconnect, verify push sync | Outbox push + POS + idempotency |
| Push order in old JSON format, verify server transforms and imports | Sync ingest transformer + backward compatibility |
| Server updates product price, device pulls new catalog | Server → Device pull + cache overwrite |
| Create product from Android, verify on second device | Master data thin-client + pull sync |
| App update triggers DB wipe, verify automatic re-pull | Room destructive migration + full pull recovery |

### Manual UAT Matrix

| Device Config | Test Focus |
|---|---|
| Cashier device (phone) | POS flow, loyalty, basic staff ops |
| Supervisor device (tablet) | Approvals, reconciliation, shift management |
| Revoked device | Lockout behavior, data wipe confirmation |
| Intermittent network | Offline queue, sync recovery, partial connectivity |
| With barcode scanner | Scan-to-cart, scan-to-count |
| With printer attached | Receipt printing, label printing |
| No printer | Graceful degradation, digital receipt fallback |

### CI Pipeline Structure

```
PR opened / push to main
  ├── Lint (Android + Backend)
  ├── Unit Tests (parallel)
  │   ├── Android: ./gradlew testDebugUnitTest
  │   └── Backend: npm run test
  ├── Build
  │   ├── Android: ./gradlew assembleDebug
  │   └── Backend: docker build
  ├── Integration Tests
  │   └── Backend: npm run test:e2e (against test DB)
  └── Artifacts
      ├── Debug APK (uploaded as CI artifact)
      └── Backend image (pushed to registry)

Tag / Release branch
  ├── All of the above
  ├── Android: ./gradlew bundleRelease (signed)
  ├── Firebase Test Lab: instrumentation suite
  ├── Maestro: critical path flows
  └── Release artifacts published
```

---

## 20. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Offline sync push fails silently or queues overflow | Low | Medium | Server always accepts POS data regardless of format; device retries indefinitely; outbox has hard size limit (1000 mutations) with user warning at 80%; daily sync keeps queue shallow |
| Room wipe loses unpushed outbox items | Low | Medium | Keep destructive migration but add `onCreate` callback for automatic full re-pull; push outbox frequently when online; daily sync means exposure window is small |
| Blink payment integration breaks during migration | Medium | High | Keep Blink integration code paths untouched in `:feature:pos-legacy`; test thoroughly before any refactor |
| Staff resistance to new UI | Medium | Medium | Keep cashier flow familiar; change only the home/navigation layer first; gather feedback before deeper UX changes |
| Supabase Realtime connection drops | Medium | Low | Web console gracefully degrades to polling; Android never depends on Realtime |
| Render cold starts slow API response | Low | Medium | Keep at least one instance warm; use health check endpoint; consider paid tier with zero-downtime deploys |
| Cloudinary rate limits hit during bulk reconciliation uploads | Low | Medium | Queue uploads through worker; implement backoff; batch evidence uploads |
| Data migration produces inconsistencies | Medium | High | Validation gates at each phase; dual-write period; automated reconciliation reports |
| Zoho WhatsApp adapter becomes unreliable | Low | Medium | Adapter is isolated; can swap to direct Meta Cloud API if needed without touching core system |
| Scope creep into deferred features | High | Medium | MVP boundary is documented; all deferred items require explicit decision to un-defer |

---

## 21. Implementation Sequence

### Phase 0: Foundations (Weeks 1–3)

- [ ] Create backend repo (NestJS) and web repo (Next.js)
- [ ] Stand up Supabase project: schema, auth, RLS policies
- [ ] Confirm Supabase Pro plan with daily backups enabled
- [ ] Stand up Render services: API, worker, cron, Redis
- [ ] Stand up Cloudinary: create environment, configure upload presets
- [ ] Implement: auth module (phone OTP, JWT with `store_id` claim, device session)
- [ ] Implement: device module (enrollment, heartbeat, revocation)
- [ ] Implement: capability module (profiles, assignment, snapshot)
- [ ] Implement: audit module (immutable event log)
- [ ] Implement: file upload service (Cloudinary pipeline)
- [ ] Implement: notification pipeline (FCM + in-app)
- [ ] Implement: agent-control framework (task/command/approval)
- [ ] Implement: sync module — ingest pipeline (dedup, version detection, transform, import), pull delta endpoint, transformers for current entity formats
- [ ] Implement: product and category CRUD endpoints (used by both web console and Android)
- [ ] Deploy health check, basic monitoring, Sentry integration
- [ ] Test a Supabase backup restore on staging (verify procedure works)

### Phase 1: Android Shell (Weeks 3–5)

- [ ] **Blocker:** Retrieve existing Play Store listing details (package name, signing key)
- [ ] **Blocker:** Verify current Blink SDK version; check for deprecation notices
- [ ] **First PR:** Add Room `onCreate` callback for full re-pull flag after DB wipe (see §7 Room strategy)
- [ ] Refactor Android: wrap existing POS into `:feature:pos-legacy` (Blink code moves with it untouched)
- [ ] Build `:app` shell, `:core:*` modules, `:feature:home`
- [ ] Build `:core:printer` — Epson ePOS SDK wrapper with `PrinterService` abstraction
- [ ] Build `:core:sync` — outbox push engine + server pull engine
- [ ] Build `:core:network` — API client with connectivity observer
- [ ] Implement capability loader and role-first home screen
- [ ] Implement device enrollment (QR scan flow)
- [ ] Implement new auth flow (phone OTP → PIN/biometric)
- [ ] If Blink SDK needs update, do it in a standalone PR against `:feature:pos-legacy` before shell work
- [ ] Keep current POS **fully functional** throughout
- [ ] Verify: `./gradlew assembleDebug` passes at every step

### Phase 2: POS + Loyalty + Reconciliation (Weeks 5–9)

- [ ] Write sync transformers for existing Android JSON formats (map current app output → new DB schema)
- [ ] Rebuild loyalty backend against Supabase (port from Flask reference)
- [ ] Integrate loyalty with Android POS and offline outbox
- [ ] Wire sync engine end-to-end: outbox push for device-owned entities, cursor pull for server-owned
- [ ] Implement thin-client master data creation from Android (products, categories — same API as web)
- [ ] Implement reconciliation workflow (close till → evidence → resolve)
- [ ] Implement inventory basic (counts, barcode request, naming request)
- [ ] Implement request engine (stationery, pickups, customer items)
- [ ] Web console: dashboard, devices, capabilities, reconciliation review, product/category management

### Phase 3: Staff Ops + Supervisor (Weeks 9–12)

- [ ] Implement workforce module (attendance, leave, tasks, expenses, assets, maintenance)
- [ ] Build Android `:feature:staff-ops` module
- [ ] Build Android `:feature:supervisor` module
- [ ] Web console: staff ops dashboard, supervisor approvals, audit trail
- [ ] Implement AI task center in web console
- [ ] Implement compliance module (data deletion requests, consent audit)
- [ ] Web console: data compliance section

### Phase 4: Testing + Hardening (Weeks 12–14)

- [ ] Set up GitHub Actions CI pipeline (lint, test, build, sign)
- [ ] Set up Firebase Test Lab integration
- [ ] Write Maestro flows for critical paths (checkout, loyalty, Blink payment, reconciliation, leave request)
- [ ] Run full E2E test suite
- [ ] Run manual UAT on device matrix (including Epson printer scenarios)
- [ ] Performance testing: cold start, checkout latency, sync push/pull throughput
- [ ] Data migration dry-run (Phase 1 + 2 of migration plan)
- [ ] Backup restore drill: restore from Supabase backup, verify data integrity

### Phase 5: Migration + Launch (Weeks 14–16)

- [ ] Execute data migration Phase 1 (reference data: products, categories, stores)
- [ ] Execute data migration Phase 2 (transactional history: orders, loyalty, attendance)
- [ ] Dual-write period (2–4 weeks)
- [ ] Staff training on new app (focus on: new home screen, same POS flow, new staff ops)
- [ ] Staged rollout: one store first, then expand
- [ ] Monitor for 1 week post-rollout before decommissioning legacy paths
- [ ] Execute data migration Phase 4 (cutover)
- [ ] Evaluate PITR upgrade based on transaction volume

### Post-MVP

- [ ] Dynamic feature module split (on-demand delivery for staff-ops, supervisor)
- [ ] Replace `:feature:pos-legacy` screens incrementally, extract Blink into `:core:payments`
- [ ] Restaurant suite
- [ ] Advanced reporting and analytics
- [ ] Full HR rules engine
- [ ] Marketing campaigns + support inbox
- [ ] Customer-facing loyalty portal
- [ ] Zoho CRM sync adapter (if needed)

---

## 22. Assumptions

- `Posterita Loyalty` Flask app is now only a behavior/reference source — it will be retired after port.
- `Supabase` is the sole system of record for all operational data. Product and category master data lives in Supabase, created via backend API.
- `Zoho` is used only for WhatsApp communication/integration — no business data stored there.
- `Vercel` hosts the web console and lightweight edge functions — not the core backend.
- `Render` is the backend runtime and worker host.
- `Cloudinary` is the media platform for all binary assets.
- `GitHub Actions` handles Android builds and CI/CD.
- `Firebase Test Lab` and `Maestro` handle Android automated testing.
- The unified Android app is for internal/store/staff use only.
- Customer-facing loyalty remains web/WhatsApp-first during MVP.
- The team executing this has access to the current Posterita Android codebase and can build/run it locally.
- Stores remain operational throughout the migration — no planned downtime.
- A user works in exactly one store per day — no multi-store session switching.
- Blink payment integration is supported and must be preserved during migration.
- Epson is the primary receipt printer brand; Epson ePOS SDK is the printing foundation.
- Android creates server-owned data (products, categories, users) by calling the backend API directly (thin client pattern) — not via local-first creation or sync.
- Mauritius Data Protection Act 2017 compliance is required for customer data and consent handling.
- Supabase Pro with daily backups is sufficient at launch; PITR to be added when transaction volume justifies it.

---

## 23. Resolved Design Decisions

These were open questions, now answered:

| # | Question | Decision | Impact |
|---|---|---|---|
| 1 | **Blink integration** | Blink is supported and must be preserved. Wrap existing Blink integration code in `:feature:pos-legacy` untouched. Test thoroughly before any refactor. | Blink payment paths stay in the install-time POS module. Card/Blink payments require connectivity (already the case). |
| 2 | **Multi-store** | A user works in exactly one store per day. | Simplifies capability model — no multi-store session switching needed. Device enrollment binds to one store. Capability snapshot is per-user-per-store, not per-user-per-store-combination. |
| 3 | **Product catalog source** | Product and category master data lives in Supabase. Supabase is the single source of truth. All creation/mutation happens via backend API calls — both web console and Android call the same endpoints. Data is created live in Postgres, never local-first. | No catalog import/sync from external systems needed for MVP. Android gets a read-only cache via pull sync. |
| 4 | **Master data from Android** | When creating server-owned data (products, categories, users) from Android, the device acts as a thin client — calls the backend API directly (same endpoint as web), receives the response, inserts into local Room cache. No outbox, no local-first. Requires connectivity. | Eliminates the need for ID pre-allocation or draft skeletons. One simple pattern: API call → server creates → device caches response. |
| 5 | **Receipt printers** | Primarily Epson printers. | Use Epson ePOS SDK for Android. Build `:core:printer` module around Epson SDK with an abstraction layer so other printer brands can be added later if needed. Epson SDK supports Bluetooth, WiFi, and USB. |
| 6 | **Play Store listing** | Existing listing exists but details are not yet known. | Need to retrieve Play Store listing details (package name, signing key, existing users) before Phase 1 Android shell work begins. This is a blocker for CI/CD signing setup. |
| 7 | **Data protection** | Mauritius Data Protection Act 2017 compliance is required. | Consent records must include: what data, for what purpose, when consented, by whom. Opt-out must be honored immediately. Customer PII must be deletable on request. Add a `data_deletion_request` flow to the admin console. Loyalty consent model already supports this — formalize it. |

---

## 24. Backup and Recovery Strategy

### Supabase Backup Tiers

| Supabase Plan | Backup Type | Frequency | Retention | RPO |
|---|---|---|---|---|
| Free | None | — | — | Full loss possible |
| Pro ($25/mo) | Automated daily | Every 24 hours | 7 days | Up to 24 hours of data loss |
| Pro + PITR ($100/mo add-on) | Point-in-time recovery | Continuous WAL archiving | 7 days | ~seconds of data loss |
| Team ($599/mo) | PITR included | Continuous WAL archiving | 14 days | ~seconds of data loss |

### Recommendation

**Start on Supabase Pro ($25/mo) at launch. Add PITR ($100/mo add-on) once transaction volume justifies it.**

Rationale:

- During early rollout with a few stores, daily backups with 24h RPO are acceptable. If the worst happens (Supabase database corruption or accidental mass deletion), you lose at most one day of transactions. That's painful but survivable for a small operation — you can re-enter a day's orders from printed receipts and till records.
- Once you're running multiple stores with significant daily transaction volume, the cost of re-entering a lost day's data exceeds the $100/mo PITR add-on. At that point, upgrade.
- PITR gives you continuous WAL archiving — you can restore to any point within the retention window, down to the second. This protects against accidental deletions, bad migrations, and corruption.

### What Supabase Backups Do NOT Cover

| Risk | Mitigation |
|---|---|
| Cloudinary media loss (images, signatures, PDFs) | Cloudinary has its own backup/redundancy. For critical evidence (reconciliation photos, signatures), consider storing a backup reference or hash in Postgres so you can detect loss. |
| Android local Room data loss (device lost/wiped) | By design, device data is expendable — the outbox pushes to server, and the cache is repopulated via pull. If a device is lost before outbox drain, those unpushed mutations are lost. Mitigate by aggressive push frequency (every 60s when online). |
| Redis data loss (job queues, idempotency keys) | Redis is ephemeral by design. Job queues can be replayed from source data. Idempotency keys have 24h TTL — loss means a small window of potential duplicate processing, handled by database unique constraints as a safety net. |
| Supabase project-level disaster (region outage) | Supabase runs on AWS. For a single-region deployment, a full region outage means downtime. Stores continue operating offline via the outbox pattern. On recovery, they push. For true multi-region DR, you'd need Supabase Enterprise — overkill for MVP. |
| Accidental schema migration breaks production | Test all migrations against a staging Supabase project first. Use `supabase db push` with `--dry-run` before applying. Keep a rollback migration for every forward migration. |

### Backup Checklist for Launch

- [ ] Confirm Supabase Pro plan is active with daily backups enabled
- [ ] Test a backup restore on a staging project (verify the process works before you need it)
- [ ] Document the restore procedure (who does it, how, expected downtime)
- [ ] Set up a weekly manual backup export of critical tables (products, loyalty wallets, till sessions) to a Google Drive or similar — belt-and-suspenders
- [ ] Decide on PITR upgrade trigger: "When daily transaction count across all stores exceeds X, enable PITR"
- [ ] Add a Supabase backup status check to the weekly ops review

---

## 25. Remaining Open Items

| # | Item | Needed By | Impact If Delayed |
|---|---|---|---|
| 1 | Retrieve existing Play Store listing details (package name, signing key fingerprint, current user count) | Phase 1 start | Blocks Android CI/CD signing config and app update strategy |
| 2 | Confirm Blink SDK version currently in use and check for any deprecation notices | Phase 1 start | Could require re-integration if SDK is end-of-life |
| 3 | Define PITR upgrade trigger threshold (daily transaction count or monthly revenue) | Post-launch | Low — daily backups are sufficient at launch |
| 4 | Decide if Zoho CRM sync adapter is needed for MVP or deferred | Phase 0 | Low if deferred — CRM data doesn't block POS operations |

---

*This document should be treated as a living plan. Update it as decisions are made on open questions and as implementation reveals new constraints.*
