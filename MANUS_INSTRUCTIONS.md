# Instructions for AI Agents (Manus / Claude / etc.)

## Sources of Truth

1. **Architecture & Rules:** `CLAUDE.md` in repo root — read this FIRST
2. **Live UI Prototype:** https://posterita-prototype.vercel.app/ — the target look & feel
3. **Prototype Source:** `posterita-prototype/src/App.jsx` — 1,242-line React prototype with all screens
4. **Specs:** `specs/` directory — architecture, data model, module specs, UI specs
5. **Android App:** `pos-android/` — production POS app (Kotlin)
6. **Web Console:** `pos-android/server-side/posterita-cloud/web/` — production admin web app (Next.js)
7. **API Routes:** `pos-android/server-side/posterita-cloud/web/src/app/api/` — Vercel serverless functions
8. **DO NOT USE:** `manus-retail-os/` — this is inspiration only, not production code

## Three-Layer Feature Rule

When implementing ANY feature, ensure all three layers are addressed:
1. **Database** — Supabase schema/migration
2. **API** — Vercel serverless route for CRUD
3. **UI** — Android (native POS) + Web Console (admin CRUD)

Admin CRUD (products, stores, users, etc.) is built in the Web Console and embedded in Android via WebView. POS operations (sales, scanning, till) are native Android only.

## Critical Rule: No Functionality Loss

The `pos-android/` app is a working production POS. When implementing UI changes to match the prototype:

- **DO NOT remove existing functionality.** The prototype is a UI reference, not a feature spec.
- **If the prototype is missing a feature that exists in the Android app, KEEP the Android feature.**
- **If there is a conflict** (e.g., prototype shows a different flow for the same action), **FLAG IT** — do not silently override the existing implementation.
- **Ask before replacing** any working logic with prototype-inspired alternatives.

## Prototype Screen Map (Mobile)

The prototype at https://posterita-prototype.vercel.app/ contains these mobile screens:

### Auth Flow
| Screen | Key | Description |
|--------|-----|-------------|
| Welcome | `welcome` | Logo, "Get Started" button, "I have an account" link |
| Phone Entry | `phone` | +230 country code, phone input, WhatsApp OTP |
| OTP Verify | `otp` | 6-digit code input |
| Profile Setup | `profile` | First/last name, photo, emergency contact |
| PIN Create | `pin` | 4-digit PIN with numpad |
| Device Enroll | `enroll` | QR code scan to link device to store |
| Login | `login` | PIN entry for returning users, biometric option |

### Home
| Screen | Key | Description |
|--------|-----|-------------|
| Home Dashboard | `home` | Greeting, pending approvals banner, 2x2 grid (POS/Staff Ops/Supervisor/Inventory), today's summary |
| Notifications | `notifs` | List with colored dots, timestamps |

### POS Flow
| Screen | Key | Description |
|--------|-----|-------------|
| Products | `products` | Hamburger + item count + last-added bar, DINE IN/TAKE AWAY toggle, category pills (3-col grid), search, product grid (2-col with images), bottom action buttons (CLEAR/SEARCH/MORE, SCAN/CUST/MY CART), cart slide-up sheet |
| Product Detail | `proddetail` | Large image, SKU, price, stock/sold-today stats, barcode, VAT, ADD TO CART / QUICK SALE |
| Customer Search | `custsearch` | Phone/name search, result cards with avatar + points, SELECT button, "+ Create new customer" |
| Payment | `payment` | Cash / Card+Blink / Split options as cards, quick cash amounts grid, COMPLETE SALE |
| Receipt | `receipt` | Success checkmark, receipt in glass card (store name, items, subtotal/VAT/total, payment/change, loyalty points), PRINT / WHATSAPP / NEW SALE |
| Refund | `refund` | Order search, item selection with checkboxes, reason field |
| Held Orders | `holds` | Cards with customer, amount, time, note; RESUME / CANCEL buttons |
| Order History | `history` | Date header, search, REFUND/HOLDS/OPEN TILL/CLOSE TILL buttons, order cards with status badges |

### Till
| Screen | Key | Description |
|--------|-----|-------------|
| Open Till | `opentill` | Denomination counting (Rs 2000/500/200/100/Coins), float total, OPEN TILL SESSION |
| Close Till | `closetill` | 4-step flow: Expected totals, Count cash, Discrepancy, Evidence (photo/slip/Z-report), SUBMIT RECONCILIATION |

### Other
| Screen | Key | Description |
|--------|-----|-------------|
| Loyalty | `loyalty` | Points balance (large number in purple), vouchers with REDEEM, consent status |
| Inventory | `inventory` | 2x2 grid (Count/Barcode/Name Item/Stock), active counts section |
| Staff Ops | `staffops` | Check in/out, 3x2 grid (Leave/Expense/Stationery/Pickup/Cust. Item/Maint.), tasks with urgency, recent requests |
| Supervisor | `supervisor` | Approval counts (Leave/Expense/Recon), approval queue with APPROVE/REJECT/VIEW, quick actions |
| Sync Status | `sync` | Outbox/last pull stats, push/pull logs with OK badges, FORCE SYNC NOW |
| Printer Setup | `printer` | Connected printer with status, test buttons, available printers |
| Settings | `settings` | User avatar + role, menu items (Device info, Printer, Sync, Emergency, About, Log out) |

## Prototype Screen Map (Web Console)

| Screen | Key | Description |
|--------|-----|-------------|
| Dashboard | `wdash` | 4-metric row, reconciliation alerts table, pending approvals list |
| Devices | `wdevices` | Device table (name, store, user, profile, status, battery, sync), ENROLL DEVICE, Revoke |
| Reconciliation | `wrecon` | Expected/Counted/Discrepancy cards, cashier note, evidence links, resolution form |
| Audit Trail | `waudit` | Table with time, user, action badge, detail, store |
| AI Setup | `waisetup` | Two-column: auto-execute actions vs manager-approval-required actions |

## Design Tokens (from Prototype)

```
Background:     #F5F2EA (warm cream)
Paper/Cards:    #FFFFFF
Panel:          #FAFAFA
Ink (text):     #141414
Muted text:     #6C6F76
Line/border:    #E6E2DA
Chip:           #f0f0f0

Blue (primary): #1976D2    Light: #DCEBFF    Dark: #0D5DB3
Red (error):    #E53935    Light: #FFF1F0
Green (success):#2E7D32    Light: #E8F5E9
Amber (warning):#F57F17    Light: #FFF8E1
Purple:         #5E35B1    Light: #EDE7F6

Font:           "Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif
Corner radius:  14dp (buttons/cards), 10-12dp (small elements), 999 (pills/badges)

Shadows:
  Small:  0 1px 2px rgba(0,0,0,.05)
  Medium: 0 4px 16px rgba(0,0,0,.08)
  Large:  0 24px 70px rgba(0,0,0,.10)
```

## UI Component Patterns

- **Glass cards:** Semi-transparent white (rgba 255,255,255,0.82) with blur(14px) backdrop
- **Buttons (Btn48):** 48px height, 14dp radius, primary=blue filled, default=white with 1px border
- **Pills:** 38px height, 12dp radius, active=blue filled, inactive=white with gray border
- **Badges:** Inline, 999 radius, colored background with matching text
- **Cards:** White, 10dp radius, 1px border rgba(0,0,0,.06), small shadow
- **Fields:** 42px height, 14dp radius, 1px border, label above in uppercase 11px muted
- **Bottom nav:** 4 tabs — Home, POS, Tasks, More
- **Cart sheet:** Slides up from bottom, 22dp radius top, shadow

## Architectural Rules (from CLAUDE.md)

- Android never talks to Supabase directly — all data flows through backend API
- Offline-first — every store-floor operation works without connectivity
- One store per user per day
- Every mutation produces an audit event
- Capability-driven UI (role-based)
- Inventory count is scan-only

## How to Use This File

1. Read `CLAUDE.md` for architecture rules
2. Read this file for UI reference and screen map
3. Browse https://posterita-prototype.vercel.app/ to see the visual target
4. Read the relevant `specs/modules/` file for the module you're working on
5. Read the existing Android code before making changes
6. **Always preserve existing functionality** — only enhance the UI to match the prototype
