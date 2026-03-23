# Terminal Types & Store Zones
> References: shared/architecture.md, shared/data-model.md, 19-kitchen-restaurant.md

## Problem

Currently `businessType` is a single SharedPreferences value (`"retail"` or `"restaurant"`) that applies to the entire app. This is wrong:

1. **One store can have both** — a hotel gift shop (retail) and restaurant in the same location, managed by the same brand
2. **Terminals have different roles** — a POS register, a kitchen display tablet, a queue management kiosk, and a staff mobile device are all "terminals" but behave completely differently
3. **The UI feature set should follow the terminal**, not a global toggle — a KDS tablet should boot straight into kitchen display, not show the full POS

## Design Principle

**The terminal determines the experience.** When a device is enrolled as a terminal, it gets a `terminal_type` that controls what UI it shows, what features are available, and how it behaves on startup.

## Terminal Types

| Type | Purpose | Startup Behavior | Feature Set |
|------|---------|-------------------|-------------|
| `pos_retail` | Standard retail register | Home → POS | Cart, payments, receipts, orders, till, customers |
| `pos_restaurant` | Restaurant POS/cashier | Home → POS (with order type dialog) | Everything in retail + dine-in, tables, kitchen orders, delivery |
| `kds` | Kitchen Display System | Full-screen KDS grid | KDS only — bump, recall, timer. Exit requires PIN. |
| `customer_display` | Customer-facing screen | Mirror of cart totals | Read-only cart view, loyalty status (future) |
| `self_service` | Self-ordering kiosk | Product browser → cart → payment | Browse, cart, payment. No admin, no till, no settings. |
| `mobile_staff` | Staff personal device | Home (limited) | Orders, inventory count, price check. No payments/till. |
| `queue` | Queue management | Ticket dispenser | Take-a-number, display next. No POS. (future) |

Default: `pos_retail` (backward compatible — current behavior).

## Schema Changes

### Supabase: ALTER `terminal`

```sql
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS terminal_type TEXT NOT NULL DEFAULT 'pos_retail';
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT NULL;
```

- `terminal_type` — one of the types above. Default `pos_retail` preserves backward compat.
- `zone` — optional label for physical location within the store (e.g., "Ground Floor", "Patio", "Kitchen"). Informational, not enforced.

### Room: ALTER `terminal` entity

```kotlin
// Add to Terminal.kt
val terminal_type: String = "pos_retail",
val zone: String? = null
```

Room migration adds the columns with defaults.

### Remove `businessType` from SharedPreferences

The global `prefsManager.businessType` / `prefsManager.isRestaurant` is replaced by reading the terminal's `terminal_type` from the Room database.

```kotlin
// SharedPreferencesManager — add computed property
val terminalType: String
    get() = prefs.getString("terminal_type", "pos_retail") ?: "pos_retail"

val isRestaurantTerminal: Boolean
    get() = terminalType == "pos_restaurant"

val isKdsTerminal: Boolean
    get() = terminalType == "kds"
```

These are synced from `terminal.terminal_type` when the terminal is loaded at login/sync.

### Backward Compatibility

- Existing terminals get `terminal_type = 'pos_retail'` (default)
- If `prefsManager.businessType == "restaurant"` on upgrade, migrate to `pos_restaurant`
- The `isRestaurant` property becomes an alias for `isRestaurantTerminal`
- No breaking changes to existing behavior

## Store Zones (lightweight alternative to store splitting)

Instead of creating multiple stores for one physical location, a store can have **zones** — logical areas that terminals and tables belong to.

```sql
ALTER TABLE store ADD COLUMN IF NOT EXISTS zones JSONB DEFAULT '[]';
-- Example: ["Ground Floor", "First Floor", "Patio", "Kitchen"]
```

This is purely informational. The `terminal.zone` and `table_section.name` reference these by convention, not by FK. A store with zones `["Retail Area", "Restaurant"]` can have:
- Terminal "POS 1" (type `pos_retail`, zone "Retail Area")
- Terminal "POS 2" (type `pos_restaurant`, zone "Restaurant")
- Terminal "KDS Kitchen" (type `kds`, zone "Kitchen")
- Table sections "Indoor" and "Patio" linked to zone "Restaurant"

## Terminal Type Behavior Matrix

### Startup Flow

| Type | SplashActivity → | Home Screen |
|------|-------------------|-------------|
| `pos_retail` | PIN → Home | Full POS home (products, cart, orders, till) |
| `pos_restaurant` | PIN → Home | Full POS home + kitchen orders in drawer |
| `kds` | PIN → KdsDisplayActivity | Full-screen KDS (no home, no POS) |
| `customer_display` | Auto-start → Display | Customer-facing cart mirror (no PIN) |
| `self_service` | Auto-start → Browse | Product browser (no PIN, no admin) |
| `mobile_staff` | PIN → Home (limited) | Orders, inventory, price check only |
| `queue` | Auto-start → Queue | Take-a-number display (no PIN) |

### Feature Visibility

| Feature | pos_retail | pos_restaurant | kds | customer_display | self_service | mobile_staff |
|---------|-----------|---------------|-----|-----------------|-------------|-------------|
| Product browser | ✅ | ✅ | — | — | ✅ | ✅ (view) |
| Cart / checkout | ✅ | ✅ | — | 👁 (read) | ✅ | — |
| Payments | ✅ | ✅ | — | — | ✅ | — |
| Receipt printing | ✅ | ✅ | — | — | ✅ | — |
| Till management | ✅ | ✅ | — | — | — | — |
| Order type dialog | — | ✅ | — | — | — | — |
| Table selection | — | ✅ | — | — | — | — |
| Kitchen orders | — | ✅ | ✅ (bump) | — | — | — |
| KDS server | — | ✅ (host) | — | — | — | — |
| Order history | ✅ | ✅ | — | — | — | ✅ |
| Inventory count | ✅ | ✅ | — | — | — | ✅ |
| Settings | ✅ | ✅ | PIN only | — | — | Limited |
| Printers | ✅ | ✅ | — | — | — | — |
| Drawer nav | Full | Full + Kitchen | — | — | — | Limited |

### KDS Terminal Specifics

When `terminal_type == "kds"`:
1. SplashActivity detects KDS type → skips Home → launches `KdsSetupActivity` (or auto-connects if server is remembered)
2. KdsDisplayActivity runs in full-screen immersive mode
3. Exit requires PIN → returns to KdsSetupActivity (not Home)
4. Settings accessible via PIN → only shows: connection config, station selection, display preferences
5. No POS features, no drawer, no cart, no orders
6. The KDS terminal auto-starts `KdsServerService` if it's the POS terminal that should host

### Customer Display / Self-Service Specifics (future)

- No PIN required on startup
- Restricted navigation — cannot reach admin screens
- Customer display mirrors the active terminal's cart via local broadcast or LAN
- Self-service has its own simplified cart UI, payment via card only (no cash)

## Where Terminal Type is Set

### During Signup (SetupWizardActivity)

The signup wizard already infers `businessType` from the selected business category. This should set the **first terminal's** `terminal_type`:

```
"restaurant" category → terminal_type = "pos_restaurant"
"retail" category → terminal_type = "pos_retail"
```

### In EditTerminalActivity

Add a **Terminal Type** selector (dropdown or radio group):
- POS — Retail
- POS — Restaurant
- Kitchen Display (KDS)
- Staff Device
- Customer Display (future)
- Self-Service Kiosk (future)

### On the Web Console (`/terminals` page)

Add `terminal_type` column to the terminals table and an edit control.

### Via API (`/api/sync`)

The sync response already includes terminal data. The `terminal_type` field syncs naturally — no new endpoint needed.

## Migration Path

### Phase 1 (now — minimal, backward compatible)
1. Add `terminal_type` column to Supabase `terminal` table (default `pos_retail`)
2. Add `terminal_type` to Room `Terminal` entity + migration
3. Sync pulls `terminal_type` from server
4. Replace `prefsManager.isRestaurant` → read from terminal's type
5. SplashActivity checks terminal type for KDS auto-launch
6. Remove the restaurant mode toggle from Settings (it's now per-terminal)

### Phase 2 (later — new terminal types)
7. Customer display mode
8. Self-service kiosk mode
9. Staff mobile device mode
10. Queue management

## API Changes

None — existing `/api/sync` and `/api/data` routes handle the new column automatically since terminals sync via the standard pull flow.

The web console `/terminals` page needs the type dropdown added to the create/edit form.

## What This Replaces

| Current (global) | New (per-terminal) |
|---|---|
| `prefsManager.businessType` | `terminal.terminal_type` (in Room DB) |
| `prefsManager.isRestaurant` | `terminal_type in ("pos_restaurant")` |
| Restaurant Mode toggle in Settings | Terminal type selector in EditTerminalActivity |
| Global feature gating | Per-terminal feature matrix |
| Single POS experience per device | Device can be enrolled as any terminal type |

## Dependencies

- Kitchen & Restaurant module (19-kitchen-restaurant.md) — KDS terminal type uses the KDS infrastructure
- Platform Bootstrap — terminal enrollment assigns type
- Sync Protocol — terminal_type pulled with terminal data
