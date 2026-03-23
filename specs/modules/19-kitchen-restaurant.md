# Kitchen & Restaurant Module
> References: shared/architecture.md, shared/data-model.md, 04-pos-and-transactions.md

## Overview

The kitchen and restaurant module extends the existing POS restaurant infrastructure (tables, hold orders, kitchen order management, printer roles) with table sections/zones, preparation station routing, a LAN-based Kitchen Display System (KDS), delivery orders, table transfer/merge, and course management. The KDS runs entirely on the local network — no internet required.

**Existing infrastructure this builds on:**
- `restaurant_table` (Supabase + Room) — table occupancy tracking
- `HoldOrder` entity — JSON-based order parking with table assignment
- `KitchenOrdersActivity` — 3-state status cycle (NEW → IN_PROGRESS → READY)
- `Printer` entity — role field (receipt/kitchen/bar/label)
- `PrinterManager` — `printKitchenOnly()` / `printReceiptOnly()` routing
- `Product.iskitchenitem` — Y/N flag for kitchen print filtering
- Web console `/tables` page — CRUD for restaurant tables
- Sync route pushes/pulls `restaurant_table`

## Relevant Tables

### Existing
`restaurant_table`, `hold_order`, `printer`, `product`, `productcategory`, `orders`, `orderline`

### New
`table_section`, `preparation_station`, `category_station_mapping`

---

## 1. Table Sections / Zones

### Problem
All tables exist in a flat list. Restaurants need logical groupings — Indoor, Patio, Bar Area, Takeaway Counter — for floor management, capacity planning, and waiter assignment.

### Schema: `table_section`

```sql
CREATE TABLE table_section (
    section_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,
    display_order INT DEFAULT 0,
    color         TEXT DEFAULT '#6B7280',  -- hex for UI badge/tab
    is_active     BOOLEAN DEFAULT TRUE,
    is_takeaway   BOOLEAN DEFAULT FALSE,   -- auto-assign order numbers, no physical table
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_section_account ON table_section(account_id);
CREATE INDEX idx_table_section_store ON table_section(store_id);
```

### Schema change: `restaurant_table`

```sql
ALTER TABLE restaurant_table ADD COLUMN section_id INT DEFAULT NULL;
CREATE INDEX idx_table_section ON restaurant_table(section_id);
```

### Business Rules

- Each table belongs to at most one section (nullable for backward compat)
- Sections are store-scoped — different stores can have different layouts
- **Takeaway section** (`is_takeaway = true`): orders get auto-assigned sequential numbers (e.g., "T-001"), no physical table occupancy tracking
- Section `display_order` controls tab ordering in table selection UI
- Section `color` renders as tab background tint / badge color
- Deleting a section nullifies `section_id` on associated tables (soft unlink)

### Android UX

- **Table selection dialog** becomes tabbed by section:
  ```
  ┌──────────────────────────────────────┐
  │ [All] [Indoor] [Patio] [Bar] [T/A]  │
  ├──────────────────────────────────────┤
  │  ┌─T1──┐  ┌─T2──┐  ┌─T3──┐         │
  │  │  4  │  │  2  │  │  6  │         │
  │  │ Free │  │ Occ │  │ Free│         │
  │  └─────┘  └─────┘  └─────┘         │
  └──────────────────────────────────────┘
  ```
- Unsectioned tables appear under "All" tab
- Takeaway tab shows order number input (auto-increment or manual)
- `KitchenOrdersActivity` groups orders by section with collapsible headers

### Web Console

- `/tables` page gains **Section Management** above the table list:
  - Section cards with color swatch, name, table count, drag-to-reorder
  - Add Section form: name, color picker, is_takeaway toggle
  - Edit/delete section inline
- Table add/edit forms gain section dropdown
- Filter tables by section

---

## 2. Preparation Stations

### Problem
A restaurant kitchen has distinct stations (grill, salad, dessert, bar). Currently, all kitchen items print to any printer with `print_kitchen=true`. Items need to route to the correct station's printer based on product category or per-product override.

### Schema: `preparation_station`

```sql
CREATE TABLE preparation_station (
    station_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,           -- "Grill Station", "Bar", "Dessert"
    station_type  TEXT NOT NULL DEFAULT 'kitchen',  -- kitchen | bar | dessert | custom
    printer_id    INT DEFAULT NULL,        -- linked printer (nullable until configured)
    color         TEXT DEFAULT '#3B82F6',  -- hex for KDS header color
    display_order INT DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prep_station_account ON preparation_station(account_id);
CREATE INDEX idx_prep_station_store ON preparation_station(store_id);
```

### Schema: `category_station_mapping`

```sql
CREATE TABLE category_station_mapping (
    id            SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    category_id   INT NOT NULL,            -- productcategory.category_id
    station_id    INT NOT NULL,            -- preparation_station.station_id
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, category_id)        -- one station per category per account
);

CREATE INDEX idx_cat_station_account ON category_station_mapping(account_id);
```

### Schema changes: existing tables

```sql
-- Product: per-product station override
ALTER TABLE product ADD COLUMN station_override_id INT DEFAULT NULL;

-- Printer: link to preparation station
ALTER TABLE printer ADD COLUMN station_id INT DEFAULT NULL;
```

### Routing Priority

When determining which station handles a cart item:

1. **Product override** — `product.station_override_id` (highest priority, for items like cocktails that go to bar even though their category is "Drinks")
2. **Category mapping** — `category_station_mapping` where `category_id = product.category_id`
3. **Default station** — first active station of type `kitchen` (fallback)

If no station is resolved, item prints to all kitchen-role printers (legacy behavior).

### Station-Based Print Routing

`PrinterManager.printKitchenOnly()` changes from:
```
filter printers where print_kitchen == true → print all kitchen items
```
to:
```
for each cart item:
  resolve station_id via routing priority
  find printer where printer.station_id == resolved_station_id
  group items by printer
for each printer group:
  print kitchen receipt with only that group's items
  receipt header shows station name
```

**Fallback:** If a station has no printer assigned, or if no station mapping exists, items fall through to any printer with `role = 'kitchen'` (backward compatible with existing single-kitchen-printer setups).

### Android Implementation

- `CartActivity` tags each cart item with `resolved_station_id` and `station_name` before hold/print
- `PrinterManager` filters items per printer's `station_id` when printing kitchen receipts
- Kitchen receipt header shows station name in large bold text:
  ```
  ╔═══════════════════════╗
  ║    🔥 GRILL STATION    ║
  ╠═══════════════════════╣
  ║ Table: T5 Indoor       ║
  ║ Order #47  14:32       ║
  ║───────────────────────║
  ║ x2 Ribeye Steak       ║
  ║    - Medium Rare       ║
  ║ x1 Grilled Salmon     ║
  ╚═══════════════════════╝
  ```

### Web Console: `/stations`

New page (sidebar under Settings or Tables):

- Station list with color badge, name, type, linked printer, mapped categories count
- Add Station form: name, type (dropdown), color picker, printer selector (from account's printers)
- Category Mapping panel: multi-select categories → assign to station
- Visual mapping grid: categories on left, stations on top, checkmarks at intersections

---

## 3. Kitchen Display System (KDS)

### Architecture: LAN-First

The KDS runs entirely on the local network. The POS terminal (order-taking device) runs an embedded HTTP server. KDS display tablets connect to it over WiFi/LAN. No internet required — this is critical for restaurants where internet is unreliable but LAN is stable.

```
┌─────────────┐     LAN (WiFi)      ┌──────────────┐
│ POS Terminal │◄───────────────────►│ KDS Tablet 1 │
│ (HTTP Server)│                     │ (Grill)      │
│  port 8321   │◄──────────┐        └──────────────┘
└─────────────┘            │
                           │        ┌──────────────┐
                           └───────►│ KDS Tablet 2 │
                                    │ (Bar)        │
                                    └──────────────┘
```

### Embedded HTTP Server

**Technology:** `com.sun.net.httpserver.HttpServer` (available on Android API 21+, no external dependency) or NanoHTTPD if `com.sun` is unavailable.

**Port:** 8321 (configurable in Settings)

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/kds/orders` | All active hold orders with item-level status |
| `GET` | `/kds/orders?station_id={id}` | Orders filtered to a specific station |
| `GET` | `/kds/stream` | SSE stream for real-time order updates |
| `POST` | `/kds/bump` | Bump item or entire order to next status |
| `POST` | `/kds/recall` | Recall a bumped (completed) order back to active |
| `GET` | `/kds/stations` | List preparation stations for this store |
| `GET` | `/kds/health` | Health check (returns server info, uptime) |

### KDS Order Payload

```json
{
  "orders": [
    {
      "hold_order_id": 42,
      "table_name": "T5",
      "section_name": "Indoor",
      "order_type": "dine_in",
      "status": "IN_PROGRESS",
      "created_at": "2026-03-23T14:32:00Z",
      "elapsed_seconds": 480,
      "note": "Birthday table",
      "items": [
        {
          "line_id": 1,
          "product_name": "Ribeye Steak",
          "quantity": 2,
          "modifiers": "Medium Rare",
          "station_id": 3,
          "station_name": "Grill",
          "item_status": "in_progress",
          "bumped_at": null,
          "course": 1
        }
      ]
    }
  ],
  "server_time": "2026-03-23T14:40:00Z"
}
```

### SSE Stream (`/kds/stream`)

Server-Sent Events for real-time updates without polling:

```
event: order_new
data: {"hold_order_id": 43, "table_name": "T6", ...}

event: item_status
data: {"hold_order_id": 42, "line_id": 1, "status": "ready"}

event: order_bump
data: {"hold_order_id": 42, "status": "READY"}

event: order_recall
data: {"hold_order_id": 42, "status": "IN_PROGRESS"}

event: heartbeat
data: {"server_time": "2026-03-23T14:41:00Z"}
```

Heartbeat every 15 seconds. Client auto-reconnects on disconnect (SSE spec handles this natively).

### mDNS Discovery

**Registration (POS server):**
```kotlin
// NsdManager service registration
val serviceInfo = NsdServiceInfo().apply {
    serviceName = "PosteritaPOS-${terminalId}"
    serviceType = "_posterita-kds._tcp."
    port = 8321
}
nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
```

**Discovery (KDS client):**
```kotlin
nsdManager.discoverServices("_posterita-kds._tcp.", NsdManager.PROTOCOL_DNS_SD, discoveryListener)
// → resolves to IP:port of POS terminal
```

- KDS setup screen shows discovered POS terminals with name
- Manual IP entry as fallback (for networks where mDNS is blocked)
- Remembered connections persist across restarts

### Per-Item Status Tracking

Items in hold order JSON gain status fields:

| Status | Meaning | KDS Color |
|--------|---------|-----------|
| `new` | Just received, not started | White/blue |
| `in_progress` | Being prepared | Yellow |
| `ready` | Ready for pickup/serve | Green |
| `served` | Delivered to table | Grey (auto-dismissed) |

**Aggregation rule:** When ALL items for a station reach `ready`, the order card for that station shows "ALL READY" with green highlight. When ALL items across ALL stations reach `ready`, the order-level status changes to `READY`.

### Bump Flow

1. KDS operator taps item → cycles `new → in_progress → ready`
2. Or taps order-level bump button → all items on this station move to `ready`
3. Bumped orders slide to "Done" rail (right side or bottom)
4. Recall button brings bumped order back to active grid

### Hold Order JSON Extension

Existing `HoldOrder.json` object gains per-item station and status fields:

```json
{
  "items": [
    {
      "productId": 101,
      "productName": "Ribeye Steak",
      "qty": 2,
      "price": 450.00,
      "isKitchenItem": "Y",
      "station_id": 3,
      "station_name": "Grill",
      "item_status": "new",
      "bumped_at": null,
      "course": 1
    }
  ],
  "tableId": 5,
  "tableName": "T5",
  "sectionName": "Indoor",
  "orderType": "dine_in",
  "status": "NEW",
  "isKitchenOrder": true,
  "note": ""
}
```

**Backward compatibility:** Missing `station_id`, `item_status`, `course` fields default to `null`/`"new"`/`1` when parsing. Old hold orders continue to work.

---

## 4. KDS Display Activity

### Layout: Full-Screen Grid

```
┌─────────────────────────────────────────────────────────┐
│ 🔥 GRILL STATION          14:40    [Settings] [Sound]   │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ T5 Indoor│ T3 Patio │ T8 Indoor│ T/A #12  │   DONE      │
│ 8:00 🟡  │ 3:20 🟢  │ 0:45 🟢  │ 2:10 🟢  │             │
│──────────│──────────│──────────│──────────│  T2 ✓ 14:32 │
│ 2x Ribeye│ 1x Burger│ 3x Wings │ 1x Wrap  │  T7 ✓ 14:28 │
│  Med Rare│  No Onion│          │ 1x Fries │             │
│ 1x Salmon│ 2x Fries │ 1x Rings │          │             │
│──────────│──────────│──────────│──────────│             │
│ [BUMP]   │ [BUMP]   │ [BUMP]   │ [BUMP]   │             │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

### Timer Color Coding

| Elapsed | Color | Urgency |
|---------|-------|---------|
| < 5 min | Green | Normal |
| 5–10 min | Yellow | Attention |
| 10–15 min | Orange | Warning |
| > 15 min | Red (pulsing) | Overdue |

Thresholds configurable per station in settings.

### Features

- **Auto-scroll:** New orders appear on left, slide right as they age
- **Sound alerts:** Configurable chime on new order, escalating beep on overdue
- **Bump gesture:** Tap card to bump, or swipe right
- **Recall:** Tap completed order in Done rail to bring back
- **Station filter:** KDS locks to one station (set during KDS setup)
- **All-stations view:** Supervisor mode shows all stations, items color-coded by station
- **Screen-always-on:** `FLAG_KEEP_SCREEN_ON` while KDS is active
- **Font sizing:** Adjustable text size (small/medium/large) for readability at distance

### KDS Setup Flow

1. Launch app → detect no active POS session → offer "KDS Mode" option
2. Or: Settings → KDS Display → Enter KDS Mode
3. Discover POS terminals via mDNS (or enter IP manually)
4. Select station to display (or "All Stations")
5. Full-screen KDS activates, locks to that mode until exited via PIN

---

## 5. Order Lifecycle Enhancement

### Order Types

Extend `orderType` in hold order JSON:

| Type | Behavior |
|------|----------|
| `dine_in` | Assigned to table, tracks occupancy |
| `take_away` | No table, auto-assigned order number from takeaway section |
| `delivery` | No table, captures delivery address, phone, driver notes |

### Delivery Orders

Hold order JSON gains delivery fields:

```json
{
  "orderType": "delivery",
  "delivery": {
    "customer_name": "John Smith",
    "phone": "+230 5XXX XXXX",
    "address": "123 Main St, Port Louis",
    "driver_notes": "Gate code: 4521",
    "estimated_ready_at": "2026-03-23T15:00:00Z",
    "delivery_status": "preparing"
  }
}
```

Delivery statuses: `preparing → ready_for_pickup → out_for_delivery → delivered`

### Table Transfer

Move an order from one table to another:

1. KitchenOrdersActivity → long-press order → "Transfer Table"
2. Table selection dialog opens (same tabbed UI)
3. System updates:
   - `HoldOrder.json.tableId` → new table ID
   - `HoldOrder.json.tableName` → new table name
   - Old table: `is_occupied = false`, `current_order_id = null`
   - New table: `is_occupied = true`, `current_order_id = holdOrderId`
4. KDS receives SSE `event: table_transfer` with old/new table info
5. Kitchen receipt NOT reprinted (items don't change)

### Order Merge

Combine two table orders into one (e.g., two parties join):

1. KitchenOrdersActivity → long-press order → "Merge With..."
2. Select target order from active orders list
3. System merges:
   - Source order items appended to target order's JSON `items` array
   - Source hold order deleted
   - Source table freed
   - Target order retains its table assignment
   - New items tagged with merge origin: `"merged_from": "T3"`
4. KDS receives SSE `event: order_merge`
5. Print merge slip to kitchen (lists newly added items only)

### Course Management (Future — Phase E)

Per-item `course` field (integer, default 1):

```json
{
  "items": [
    { "productName": "Soup", "course": 1 },
    { "productName": "Steak", "course": 2 },
    { "productName": "Cake", "course": 3 }
  ]
}
```

- KDS groups items by course within each order card
- **Fire button:** server/cashier taps "Fire Course 2" → KDS shows course 2 items as `new`
- **Auto-fire delay:** configurable delay between courses (e.g., 15 min after course 1 items bumped)
- Course 1 items display immediately. Later courses show greyed out until fired.

---

## 6. Database Changes

### Migration 00022: Kitchen & Restaurant Enhancement

```sql
-- ============================================================
-- TABLE SECTIONS / ZONES
-- ============================================================
CREATE TABLE table_section (
    section_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,
    display_order INT DEFAULT 0,
    color         TEXT DEFAULT '#6B7280',
    is_active     BOOLEAN DEFAULT TRUE,
    is_takeaway   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_section_account ON table_section(account_id);
CREATE INDEX idx_table_section_store ON table_section(store_id);

-- ============================================================
-- PREPARATION STATIONS
-- ============================================================
CREATE TABLE preparation_station (
    station_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,
    station_type  TEXT NOT NULL DEFAULT 'kitchen',
    printer_id    INT DEFAULT NULL,
    color         TEXT DEFAULT '#3B82F6',
    display_order INT DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prep_station_account ON preparation_station(account_id);
CREATE INDEX idx_prep_station_store ON preparation_station(store_id);

-- ============================================================
-- CATEGORY → STATION MAPPING
-- ============================================================
CREATE TABLE category_station_mapping (
    id            SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    category_id   INT NOT NULL,
    station_id    INT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, category_id)
);

CREATE INDEX idx_cat_station_account ON category_station_mapping(account_id);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- restaurant_table: link to section
ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_table_section ON restaurant_table(section_id);

-- product: per-product station override
ALTER TABLE product ADD COLUMN IF NOT EXISTS station_override_id INT DEFAULT NULL;

-- printer: link to preparation station
ALTER TABLE printer ADD COLUMN IF NOT EXISTS station_id INT DEFAULT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE table_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_station_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account access table_section" ON table_section
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

CREATE POLICY "Account access preparation_station" ON preparation_station
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

CREATE POLICY "Account access category_station_mapping" ON category_station_mapping
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE table_section;
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_station;
ALTER PUBLICATION supabase_realtime ADD TABLE category_station_mapping;
```

### Room Migration: Version 23 → 24

Three new entities + three ALTER TABLE statements:

```kotlin
val MIGRATION_23_24 = object : Migration(23, 24) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // New tables
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS table_section (
                section_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                account_id TEXT NOT NULL,
                store_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                color TEXT NOT NULL DEFAULT '#6B7280',
                is_active INTEGER NOT NULL DEFAULT 1,
                is_takeaway INTEGER NOT NULL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS preparation_station (
                station_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                account_id TEXT NOT NULL,
                store_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                station_type TEXT NOT NULL DEFAULT 'kitchen',
                printer_id INTEGER,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                display_order INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS category_station_mapping (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                account_id TEXT NOT NULL,
                category_id INTEGER NOT NULL,
                station_id INTEGER NOT NULL,
                created_at TEXT
            )
        """)

        // Alter existing tables
        db.execSQL("ALTER TABLE restaurant_table ADD COLUMN section_id INTEGER DEFAULT NULL")
        db.execSQL("ALTER TABLE product ADD COLUMN station_override_id INTEGER DEFAULT NULL")
        db.execSQL("ALTER TABLE printer ADD COLUMN station_id INTEGER DEFAULT NULL")
    }
}
```

---

## 7. Room Entities

### TableSection

```kotlin
@Entity(tableName = "table_section")
data class TableSection(
    @PrimaryKey val section_id: Int,
    val account_id: String,
    val store_id: Int,
    val name: String,
    val display_order: Int = 0,
    val color: String = "#6B7280",
    val is_active: Boolean = true,
    val is_takeaway: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
```

### PreparationStation

```kotlin
@Entity(tableName = "preparation_station")
data class PreparationStation(
    @PrimaryKey val station_id: Int,
    val account_id: String,
    val store_id: Int,
    val name: String,
    val station_type: String = "kitchen",
    val printer_id: Int? = null,
    val color: String = "#3B82F6",
    val display_order: Int = 0,
    val is_active: Boolean = true,
    val created_at: String? = null,
    val updated_at: String? = null
)
```

### CategoryStationMapping

```kotlin
@Entity(tableName = "category_station_mapping")
data class CategoryStationMapping(
    @PrimaryKey val id: Int,
    val account_id: String,
    val category_id: Int,
    val station_id: Int,
    val created_at: String? = null
)
```

---

## 8. Sync Integration

### Pull (Cloud → Device)

Add to sync response payload in `/api/sync/route.ts`:

```typescript
// In pull section, after restaurant_tables query:
const sections = await db.from('table_section')
    .select('*')
    .eq('account_id', accountId)
    .eq('store_id', storeId)
    .gte('updated_at', lastSyncAt);

const stations = await db.from('preparation_station')
    .select('*')
    .eq('account_id', accountId)
    .eq('store_id', storeId)
    .gte('updated_at', lastSyncAt);

const categoryMappings = await db.from('category_station_mapping')
    .select('*')
    .eq('account_id', accountId);
    // No updated_at filter — always pull full set (small table, needs consistency)

// Response:
{
  table_sections: sections.data ?? [],
  preparation_stations: stations.data ?? [],
  category_station_mappings: categoryMappings.data ?? [],
  // ... existing fields
}
```

### CloudSyncService Mapping

```kotlin
// In CloudSyncService.kt — add mapping functions:

private fun mapTableSections(sections: JSONArray) {
    val entities = (0 until sections.length()).map { i ->
        val obj = sections.getJSONObject(i)
        TableSection(
            section_id = obj.getInt("section_id"),
            account_id = obj.getString("account_id"),
            store_id = obj.getInt("store_id"),
            name = obj.getString("name"),
            display_order = obj.optInt("display_order", 0),
            color = obj.optString("color", "#6B7280"),
            is_active = obj.optBoolean("is_active", true),
            is_takeaway = obj.optBoolean("is_takeaway", false),
            created_at = obj.optString("created_at"),
            updated_at = obj.optString("updated_at")
        )
    }
    db.tableSectionDao().insertAll(entities)
}

private fun mapPreparationStations(stations: JSONArray) { /* similar pattern */ }
private fun mapCategoryStationMappings(mappings: JSONArray) { /* similar pattern */ }
```

### Push Rules

These are **server-first master data** — never pushed from Android (Rule 2 in CLAUDE.md):
- `table_section` — pull only
- `preparation_station` — pull only
- `category_station_mapping` — pull only

KDS state (item bumps, status changes) stays **local only** — it's ephemeral operational state in hold order JSON, not synced to cloud.

---

## 9. New Android Components

### KDS Server (`KdsServer.kt`)

```
com.posterita.pos.android.kds/
├── KdsServer.kt           -- Embedded HTTP server (port 8321)
├── KdsEventBus.kt         -- In-process event bus for hold order changes
├── KdsDiscovery.kt        -- mDNS registration (server) / discovery (client)
├── KdsOrderSerializer.kt  -- HoldOrder → KDS JSON payload conversion
└── KdsSseHandler.kt       -- SSE connection management + event dispatch
```

**KdsServer responsibilities:**
- Start/stop with POS session lifecycle (bound to HomeActivity or Application)
- Serve REST endpoints (GET /kds/orders, POST /kds/bump, etc.)
- Maintain SSE connections to KDS tablets
- Thread-safe access to HoldOrderDao
- No authentication (LAN-trust model; future: shared secret in headers)
- CORS headers for potential browser-based KDS clients

**KdsEventBus:**
- Kotlin SharedFlow-based internal bus
- Events: `OrderCreated`, `OrderUpdated`, `ItemBumped`, `OrderRecalled`, `TableTransferred`, `OrderMerged`
- CartActivity, KitchenOrdersActivity emit events → KdsServer relays to SSE clients
- KDS display subscribes for local display updates when running on same device

### KDS Display (`KdsDisplayActivity.kt`)

```
com.posterita.pos.android.ui.activity/
├── KdsDisplayActivity.kt  -- Full-screen KDS grid
└── KdsSetupActivity.kt    -- Station selection + server connection
```

**KdsDisplayActivity:**
- Full-screen, immersive mode, `FLAG_KEEP_SCREEN_ON`
- RecyclerView grid (auto-columns based on screen width: 2 on phone, 4 on tablet, 6 on large display)
- Timer updates every second (lightweight handler, not full adapter refresh)
- Sound manager for new order chime + overdue escalation
- Swipe-to-bump gesture + tap-to-cycle-status
- Done rail on right edge (last 10 completed orders for recall)
- Settings gear: font size, timer thresholds, sound toggle, station filter
- Exit requires PIN (prevents kitchen staff from accidentally leaving KDS mode)

**KdsSetupActivity:**
- Discovery list (mDNS) with manual IP entry option
- Station selector (checkboxes for multi-station view)
- Connection test + latency display
- "Remember this connection" toggle
- Launches KdsDisplayActivity on successful connection

### Room DAOs

```kotlin
@Dao
interface TableSectionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sections: List<TableSection>)

    @Query("SELECT * FROM table_section WHERE store_id = :storeId AND is_active = 1 ORDER BY display_order")
    suspend fun getSectionsByStore(storeId: Int): List<TableSection>

    @Query("SELECT * FROM table_section WHERE section_id = :sectionId")
    suspend fun getSectionById(sectionId: Int): TableSection?

    @Query("DELETE FROM table_section WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}

@Dao
interface PreparationStationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(stations: List<PreparationStation>)

    @Query("SELECT * FROM preparation_station WHERE store_id = :storeId AND is_active = 1 ORDER BY display_order")
    suspend fun getStationsByStore(storeId: Int): List<PreparationStation>

    @Query("SELECT * FROM preparation_station WHERE station_id = :stationId")
    suspend fun getStationById(stationId: Int): PreparationStation?

    @Query("DELETE FROM preparation_station WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}

@Dao
interface CategoryStationMappingDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(mappings: List<CategoryStationMapping>)

    @Query("SELECT * FROM category_station_mapping WHERE account_id = :accountId")
    suspend fun getMappingsByAccount(accountId: String): List<CategoryStationMapping>

    @Query("SELECT station_id FROM category_station_mapping WHERE account_id = :accountId AND category_id = :categoryId")
    suspend fun getStationForCategory(accountId: String, categoryId: Int): Int?

    @Query("DELETE FROM category_station_mapping WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
```

### AndroidManifest Additions

```xml
<!-- KDS server network permission (already have INTERNET) -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<!-- KDS activities -->
<activity android:name=".ui.activity.KdsDisplayActivity"
    android:screenOrientation="landscape"
    android:theme="@style/Theme.AppCompat.NoActionBar" />
<activity android:name=".ui.activity.KdsSetupActivity" />

<!-- Foreground service for KDS server (keeps running when POS is backgrounded) -->
<service android:name=".service.KdsServerService"
    android:foregroundServiceType="connectedDevice"
    android:exported="false" />
```

---

## 10. Web Console Changes

### New Page: `/stations`

Preparation station CRUD + category mapping management.

**Sidebar placement:** Under "Tables" in the restaurant section.

**Features:**
- Station list with: color dot, name, type badge, linked printer name, mapped category count
- Add/Edit form: name, type dropdown (kitchen/bar/dessert/custom), color picker, printer dropdown
- Category Mapping section: checkbox grid showing all categories, check to assign to this station
- Reorder stations via drag handle (updates `display_order`)
- Active/inactive toggle

### Updated Page: `/tables`

- Section management panel at top (add/edit/delete sections, color picker, takeaway toggle)
- Table list grouped by section with section headers
- Section filter tabs
- Table add/edit gains section dropdown

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/data` | POST | Existing data proxy handles `table_section`, `preparation_station`, `category_station_mapping` reads |
| `/api/data/insert` | POST | Create sections, stations, mappings |
| `/api/data/update` | POST | Update sections, stations, mappings |
| `/api/data/delete` | POST | Delete sections, stations, mappings |

No new API routes needed — existing data proxy supports arbitrary table CRUD with account_id scoping.

---

## 11. Implementation Phases

### Phase A: Foundation (Migration + Entities + Sync)

**Goal:** Schema exists, syncs to device, web console can manage stations and sections.

| Task | Component | Files |
|------|-----------|-------|
| Supabase migration 00022 | DB | `supabase/migrations/00022_kitchen_restaurant.sql` |
| Room entities + DAOs | Android | `entity/TableSection.kt`, `entity/PreparationStation.kt`, `entity/CategoryStationMapping.kt`, DAOs |
| Room migration 23→24 | Android | `AppDatabase.kt` |
| Sync pull for new tables | API + Android | `sync/route.ts`, `CloudSyncService.kt` |
| Web console `/stations` page | Web | `web/src/app/(dashboard)/stations/page.tsx` |
| Web console `/tables` section management | Web | Update `tables/page.tsx` |

### Phase B: Station Routing (Cart + Print)

**Goal:** Cart items tagged with station, kitchen receipts route to correct printer.

| Task | Component | Files |
|------|-----------|-------|
| Station resolver utility | Android | `util/StationResolver.kt` |
| Cart item station tagging | Android | `CartActivity.kt` |
| PrinterManager station-based routing | Android | `PrinterManager.kt` |
| Kitchen receipt station header | Android | `ReceiptPrinter.kt` |
| Hold order JSON station fields | Android | `CartActivity.kt`, `KitchenOrdersActivity.kt` |

### Phase C: KDS Display (Server + SSE + UI)

**Goal:** POS terminal serves orders over LAN, KDS tablets display and bump.

| Task | Component | Files |
|------|-----------|-------|
| KDS HTTP server | Android | `kds/KdsServer.kt`, `kds/KdsSseHandler.kt` |
| KDS event bus | Android | `kds/KdsEventBus.kt` |
| KDS order serializer | Android | `kds/KdsOrderSerializer.kt` |
| mDNS discovery | Android | `kds/KdsDiscovery.kt` |
| KDS display activity | Android | `KdsDisplayActivity.kt` |
| KDS setup activity | Android | `KdsSetupActivity.kt` |
| KDS foreground service | Android | `service/KdsServerService.kt` |
| Emit events from Cart/Kitchen | Android | `CartActivity.kt`, `KitchenOrdersActivity.kt` |

### Phase D: Table Operations (Transfer + Merge + Delivery)

**Goal:** Move orders between tables, merge orders, support delivery type.

| Task | Component | Files |
|------|-----------|-------|
| Table transfer | Android | `KitchenOrdersActivity.kt` |
| Order merge | Android | `KitchenOrdersActivity.kt` |
| Delivery order type | Android | `CartActivity.kt` |
| Delivery address capture | Android | New dialog/fragment |
| KDS SSE events for transfers/merges | Android | `KdsServer.kt` |
| Section-based table picker | Android | `CartActivity.kt` table dialog |

### Phase E: Courses (Future)

**Goal:** Multi-course dining with fire control.

| Task | Component | Files |
|------|-----------|-------|
| Course field in cart items | Android | `CartActivity.kt` |
| Course grouping in KDS | Android | `KdsDisplayActivity.kt` |
| Fire button for next course | Android | `KdsDisplayActivity.kt`, `KitchenOrdersActivity.kt` |
| Auto-fire delay setting | Android | Station settings |

---

## 12. Error Logging

All new components follow the unified error logging rule (CLAUDE.md Rule 8):

| Component | Error Path |
|-----------|-----------|
| KDS server errors | `AppErrorLogger` → Room `error_log` → sync → `error_logs` |
| mDNS discovery failures | `AppErrorLogger` with tag `KDS_DISCOVERY` |
| SSE connection drops | Logged at `WARN` level with client IP |
| Station routing failures | `AppErrorLogger` with tag `STATION_ROUTING` |
| Web console station CRUD | `error-logger.ts` → `/api/errors/log` |
| Sync failures for new tables | Existing sync error logging covers this |

---

## 13. Security Considerations

### KDS LAN Server

- **No authentication in v1** — LAN trust model (same as network printers)
- **Future:** Optional shared secret in `X-KDS-Token` header, configured during KDS setup
- **No internet exposure** — server binds to LAN interface only (`InetAddress.getByName("0.0.0.0")` with firewall note)
- **No sensitive data** — KDS payload contains product names, quantities, table names. No prices, customer data, or payment info.
- **PIN-protected exit** — KDS mode requires PIN to exit, preventing kitchen staff from accessing POS functions

### Data Isolation

- All new tables have `account_id` column with RLS policies
- API routes use service role (bypasses RLS) but always filter by resolved `account_id`
- Sync scopes by `account_id` + `store_id`

---

## 14. DB Column Reference (New Tables)

| Table | Columns |
|-------|---------|
| `table_section` | section_id, account_id, store_id, name, display_order, color, is_active, is_takeaway, created_at, updated_at |
| `preparation_station` | station_id, account_id, store_id, name, station_type, printer_id, color, display_order, is_active, created_at, updated_at |
| `category_station_mapping` | id, account_id, category_id, station_id, created_at |

**Altered columns:**
| Table | New Column | Type | Default |
|-------|-----------|------|---------|
| `restaurant_table` | `section_id` | INT | NULL |
| `product` | `station_override_id` | INT | NULL |
| `printer` | `station_id` | INT | NULL |

---

## Dependencies

- Platform Bootstrap (auth, device enrollment)
- POS and Transactions (cart, hold orders, kitchen orders)
- Sync Protocol (pull new tables)
- Printer infrastructure (role-based routing)
- Web Console (existing data proxy, sidebar)
