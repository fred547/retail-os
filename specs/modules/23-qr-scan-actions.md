# Module 23 — QR Scan Actions

> Single-scan triggers that automate retail workflows. One barcode/QR scan = one action.

## Overview

Every barcode or QR scan at the POS, warehouse, or logistics hub should trigger a meaningful action without extra taps. This module defines 55 scan-to-action mappings across 8 domains, with a two-tier security model.

## Security Model

### Two Tiers

| Tier | Auth | Use Case |
|------|------|----------|
| **Low-risk** | QR scan only (static badge UUID) | Clock in/out, break, table claim, inventory count |
| **High-risk** | QR scan + PIN confirmation | Cash drawer, void, refund, discount override, switch user, price override |

### Badge Format

Each employee badge encodes a **non-guessable UUID** (not the sequential `user_id`). Format:

```
posterita://staff/{uuid}
```

The UUID is generated server-side when the user is created and stored in `pos_user.badge_uuid`. Scanning resolves to the user via Room DB lookup.

### Anti-Fraud Measures

| Measure | Implementation |
|---------|---------------|
| **Rate limiting** | Cannot clock in twice within 60 seconds |
| **Geo-check** | Log WiFi SSID + BSSID on clock-in (proves store presence) |
| **Dual-store alert** | Flag if same badge scans at two stores within 30 minutes |
| **Revocation** | Deactivate user → badge UUID becomes invalid, PIN stops working |
| **Audit trail** | Every scan logged to `scan_action_log` table with timestamp, device, location |
| **QR expiry (optional)** | For customer-facing QRs (coupons, credit notes): embed expiry timestamp, validate on scan |

### QR Encoding Standards

| Type | Format | Example |
|------|--------|---------|
| Staff badge | `posterita://staff/{uuid}` | `posterita://staff/a1b2c3d4-...` |
| Product | EAN-13 / UPC-A barcode (existing) | `5901234123457` |
| Customer loyalty | `posterita://customer/{uuid}` | `posterita://customer/e5f6g7h8-...` |
| Table | `posterita://table/{table_id}` | `posterita://table/42` |
| Order (receipt) | `posterita://order/{uuid}` | `posterita://order/ord-abc123` |
| Coupon/promo | `posterita://promo/{code}?expires={ts}` | `posterita://promo/SUMMER25?expires=1735689600` |
| Shelf location | `posterita://shelf/{store_id}/{location}` | `posterita://shelf/1/15-C` |
| Picking list | `posterita://pick/{session_id}` | `posterita://pick/501` |
| Transfer doc | `posterita://transfer/{transfer_id}` | `posterita://transfer/88` |
| Delivery note | `posterita://delivery/{delivery_id}` | `posterita://delivery/204` |
| Serial item | `posterita://serial/{serial_number}` | `posterita://serial/VIN123456` |
| Enrollment | `posterita://enroll/{token}` | Existing |
| Config | `posterita://config/{base64_json}` | Terminal batch setup |

All `posterita://` URIs are parsed by a central `ScanActionRouter` on Android.

## Scan Action Catalogue

### 1. Staff & Workforce (10 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 1 | Employee badge | **Clock in** | Low | Creates shift record, logs WiFi SSID for location proof |
| 2 | Employee badge | **Clock out** | Low | Closes active shift, computes hours worked |
| 3 | Employee badge | **Start break** | Low | Sets break_start on active shift |
| 4 | Employee badge | **End break** | Low | Sets break_end, computes break duration |
| 5 | Employee badge | **Switch cashier** | High (PIN) | Locks current user session, unlocks scanned user after PIN |
| 6 | Supervisor badge | **Authorize void/refund** | High (PIN) | Replaces password prompt for void/refund approval |
| 7 | Supervisor badge | **Open cash drawer** | High (PIN) | Existing feature — add badge scan as alternative to password |
| 8 | Supervisor badge | **Approve over-limit discount** | High (PIN) | When cashier exceeds their `discountlimit` |
| 9 | Supervisor badge | **Override price** | High (PIN) | Approve manual price entry on non-editable product |
| 10 | Employee badge | **Assign to terminal** | Low | Auto-set `sales_rep_id` on all subsequent orders |

**Context resolution:** Badge scan on POS checks if user is already clocked in. If yes → action is clock out. If no → clock in. Eliminates need for separate in/out buttons.

### 2. POS & Checkout (11 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 11 | Product barcode | **Add to cart** | None | Existing — EAN-13/UPC-A lookup in Room |
| 12 | Product QR | **Add to cart with qty** | None | QR encodes `product_id + qty` (e.g., case of 12) |
| 13 | Coupon QR | **Apply promotion** | None | Validates promo code + expiry, auto-applies to cart |
| 14 | Gift card barcode | **Pay with gift card** | None | Reads card balance, applies as payment tender |
| 15 | Customer loyalty card | **Link customer to order** | None | Attaches `customer_id` to current order |
| 16 | Customer loyalty card | **Redeem points** | Low | Shows balance, prompts redemption amount |
| 17 | Receipt QR | **Recall order for refund** | High (PIN) | Loads original order by UUID for return workflow |
| 18 | Receipt QR | **Reorder / repeat** | None | Loads same items into new cart |
| 19 | Hold order QR | **Recall parked sale** | None | Printed when sale is parked, scan to resume cart |
| 20 | Layaway QR | **Resume layaway** | None | Load outstanding balance for next payment |
| 21 | Credit note QR | **Apply credit** | None | Deducts credit amount from cart total |

**Disambiguation:** When a scan matches multiple action types (e.g., customer card at checkout), the POS uses context: if cart is open → link customer (#15); if no cart → pull up profile (#44).

### 3. Restaurant & F&B (6 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 22 | Table QR | **Open order for table** | None | Auto-selects table, skips floor map navigation |
| 23 | Table QR | **Waiter claims table** | Low | Assigns current user as server for that table |
| 24 | Table QR | **Customer self-order** | None | Customer scans with phone → opens WebView menu |
| 25 | Table QR | **View bill** | None | Customer scans → sees current order total on phone |
| 26 | Order ticket QR | **Bump order from KDS** | None | Kitchen staff scans ticket to mark order ready |
| 27 | Queue ticket QR | **Mark collected** | None | Counter staff scans customer's ticket to close order |

### 4. Warehouse & Inventory (12 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 28 | Product barcode | **Count item** | None | Increment qty in active inventory count session |
| 29 | Shelf label QR | **Start put-away at location** | None | Sets target shelf, device ready for product scan |
| 30 | Product barcode | **Confirm put-away** | None | After shelf scan (#29), assigns product to shelf location |
| 31 | Picking list QR | **Load picking session** | None | Opens pick list with items + shelf locations |
| 32 | Product barcode | **Confirm pick** | None | Marks item as picked in active session |
| 33 | Transfer doc QR | **Start stock transfer** | None | Loads transfer with source/destination stores |
| 34 | Product barcode | **Confirm transfer item** | None | Marks item as transferred |
| 35 | Shelf label QR | **Browse shelf contents** | None | Opens shelf browser filtered to that location |
| 36 | Product barcode | **Quick stock check** | None | Popup: qty on hand across all stores |
| 37 | Delivery note QR | **Start goods receipt** | None | Opens PO for receiving (GRN workflow) |
| 38 | Product barcode | **Confirm received** | None | Increment received qty on active GRN |
| 39 | Serial barcode | **Register serial item** | None | Links serial number to product + store |

### 5. Logistics & Delivery (4 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 40 | Order QR | **Assign to driver** | Low | Links delivery to current user |
| 41 | Order QR | **Mark out for delivery** | Low | Driver scans at pickup → status = in_transit |
| 42 | Order QR | **Confirm delivery** | Low | Driver scans at customer door → status = delivered |
| 43 | Customer ID QR | **Verify recipient** | None | Customer shows QR from order confirmation SMS/email |

### 6. CRM & Loyalty (3 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 44 | Customer card | **Pull up profile** | None | Show purchase history, points balance, notes |
| 45 | Customer card | **Earn loyalty points** | None | Same as #15 — context-dependent |
| 46 | Referral QR | **Link referral** | None | Credits referrer when new customer first purchases |

### 7. Admin & Device Setup (5 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 47 | Enrollment QR | **Register device** | None | Existing — scan from web console during setup |
| 48 | WiFi QR | **Connect to network** | None | Standard WiFi QR format → auto-join store WiFi |
| 49 | Printer QR | **Pair printer** | None | QR on printer contains IP/MAC → auto-configure |
| 50 | KDS QR | **Pair KDS display** | None | Replaces manual IP entry for KDS connection |
| 51 | Config QR | **Apply terminal settings** | High (PIN) | Batch-configure: store, terminal type, prefix, features |

### 8. Customer-Facing (4 actions)

| # | Scan Source | Action | Security | Details |
|---|-----------|--------|----------|---------|
| 52 | Shelf product QR | **View product info** | None | Customer phone → price, description, stock level |
| 53 | Store window QR | **Browse catalogue** | None | Opens public catalogue page |
| 54 | Receipt QR | **Digital receipt** | None | View receipt online (replaces paper) |
| 55 | Payment QR | **Mobile payment** | None | Blink/Juice — existing for Blink |

## Architecture

### Android: ScanActionRouter

Central dispatcher in `:app` module. Receives all scan results (camera, Bluetooth HID, hardware scanner) and routes based on URI prefix:

```
Camera/Scanner → ScanActionRouter.route(rawValue) → {
  "posterita://staff/*"    → StaffActionHandler
  "posterita://customer/*" → CustomerActionHandler
  "posterita://order/*"    → OrderActionHandler
  "posterita://table/*"    → TableActionHandler
  "posterita://promo/*"    → PromoActionHandler
  "posterita://shelf/*"    → ShelfActionHandler
  "posterita://pick/*"     → PickingActionHandler
  "posterita://transfer/*" → TransferActionHandler
  "posterita://delivery/*" → DeliveryActionHandler
  "posterita://serial/*"   → SerialActionHandler
  "posterita://enroll/*"   → EnrollmentHandler (existing)
  "posterita://config/*"   → ConfigHandler
  EAN-13 / UPC-A          → ProductBarcodeHandler (existing)
  Unknown                  → show "Unrecognized code" toast
}
```

Each handler checks context (which activity is active, whether a cart is open, whether a count session is active) to disambiguate actions.

### Database Changes

```sql
-- Badge UUID on pos_user
ALTER TABLE pos_user ADD COLUMN IF NOT EXISTS badge_uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_user_badge ON pos_user (badge_uuid);

-- Scan action audit log
CREATE TABLE IF NOT EXISTS scan_action_log (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  store_id INTEGER NOT NULL,
  terminal_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,         -- 'clock_in', 'clock_out', 'void_auth', etc.
  scan_type TEXT NOT NULL,      -- 'staff_badge', 'product_barcode', 'table_qr', etc.
  scan_value TEXT NOT NULL,     -- the raw scanned value
  target_id TEXT,               -- resolved entity ID (user_id, product_id, order_uuid, etc.)
  wifi_ssid TEXT,               -- for location proof
  wifi_bssid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_log_account ON scan_action_log (account_id, created_at DESC);
```

### Sync

- `badge_uuid` syncs from server → device (pull only, like other pos_user fields)
- `scan_action_log` syncs from device → server (push only, like error_logs)

## Implementation Priority

| Phase | Actions | Rationale |
|-------|---------|-----------|
| **P1** | #1-2 Clock in/out, #5 Switch cashier, #6-7 Supervisor auth | Highest daily frequency, replaces manual flows |
| **P2** | #15 Loyalty link, #13 Coupon apply, #19 Recall hold | Speeds up every transaction |
| **P3** | #22-23 Table QR, #26-27 Kitchen/queue bump | Restaurant efficiency |
| **P4** | #28-39 Warehouse scan flows | Already partially built, needs router integration |
| **P5** | #40-43 Logistics, #47-51 Admin, #52-55 Customer-facing | Lower frequency, higher polish |

## Dependencies

- ZXing scanner (existing in `:app`)
- `ScanActionRouter` (new, central dispatcher)
- `badge_uuid` column on `pos_user` (new migration)
- `scan_action_log` table (new migration)
- PIN verification infrastructure (existing in Room)
