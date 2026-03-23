---
name: posterita-ui
description: UI design reference for Posterita Retail OS. Use when designing screens, reviewing layouts, comparing with prototype, or ensuring visual consistency. Loads the prototype screen map, design tokens, and component patterns.
argument-hint: [screen name or component]
---

## Posterita UI Design Reference

**Live Prototype:** https://posterita-prototype.vercel.app/
**Prototype Source:** `posterita-prototype/src/App.jsx` (1,242 lines, all screens)

When designing or reviewing any UI, compare against the prototype and apply these rules.

## Design Tokens

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `posterita_primary` | `#1976D2` | Buttons, links, prices, active states |
| `posterita_primary_light` | `#DCEBFF` | Selected backgrounds, badges |
| `posterita_primary_dark` | `#0D5DB3` | Text on light blue backgrounds |
| `posterita_secondary` | `#2E7D32` | Success, synced, approved |
| `posterita_error` | `#E53935` | Danger, remove, refund, errors |
| `posterita_warning` | `#F57F17` | Pending, stale, attention |
| `posterita_purple` | `#5E35B1` | Loyalty, points, vouchers |
| `posterita_bg` | `#F5F2EA` | Page background (warm cream, NEVER white) |
| `posterita_paper` | `#FFFFFF` | Cards, panels |
| `posterita_panel` | `#FAFAFA` | Header bars, input areas |
| `posterita_ink` | `#141414` | Primary text (NEVER use @color/black) |
| `posterita_muted` | `#6C6F76` | Secondary text (NEVER hardcode grays) |
| `posterita_line` | `#E6E2DA` | Borders, dividers |

### Typography (Lexend font family)
| Style | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 38sp | 800 | Hero headings only |
| Title | 22sp | 800 | Screen titles |
| Heading | 18sp | 800 | Card titles, panel headers |
| Subheading | 16sp | 700 | Cart item names |
| Body | 14sp | 600 | Default text |
| Caption | 13sp | 800 | Product names, prices, buttons |
| Micro | 12sp | 800 | Chips, badges, timestamps |
| Tiny | 11sp | 700 | Auxiliary info |
| Nano | 10sp | 700 | Eyebrow labels |

### Spacing & Radius
- Corner radius: **14dp** (buttons/cards), **10dp** (small elements), **999** (pills/badges)
- Button height: **48dp** standard, **52dp** payment buttons
- Touch targets: **44dp** minimum
- Page padding: **16dp** sides

## Screen Patterns

### Consistent Top Bar
Every screen follows this pattern:
- **POS screen:** ☰ hamburger | "POS" title | (spacer) | 🟢 connectivity dot | (actions)
- **Sub-screens:** ← back arrow | "Screen Name" | (spacer) | 🟢 connectivity dot | (actions)
- **Receipt:** "Receipt #XXX" title only (no back, no drawer)
- Background: `posterita_paper`, 1dp elevation
- **Connectivity dot** (8dp circle, right side): green=online, red=offline, amber=syncing. Always visible in top bar.

### Bottom Buttons
- Full-width, `posterita_paper` background, 4dp elevation
- Primary action (PAY, NEW SALE): `Widget.Posterita.Button.Pay` (52dp)
- Secondary actions (HOLD, MORE): `Widget.Posterita.Button.Outlined` (52dp)

### Cards
- `MaterialCardView`, 14dp radius, 0dp elevation, 1dp stroke `posterita_line`
- Background: `posterita_paper`

### List Item Cards (`item_manage_card.xml`)
Standard card for list screens (settings sub-screens, manage screens):
- 40dp rounded-square icon with colored background + white initial/icon
- Title (lexend_medium) + subtitle (tiny, muted) + optional meta line (micro)
- Optional badge (10sp, semibold) + right chevron `›`
- Color-code icons by entity type/role/status

### Detail Brochure (`DetailViewActivity`)
**NEVER use flat label-value tables for detail screens.** Use brochure pattern:
1. **Hero Header** — centered 72dp icon circle + large title + key stat subtitle + flag chips
2. **Section Cards** — grouped fields in bordered cards, section header (11sp, muted, semibold, 0.08 letter-spacing)
3. **Boolean Chips** — "Yes"/"No" rendered as colored pills (green/muted), not plain text
4. **Right-aligned values** — labels 40% width (muted), values 60% width (ink, medium weight, right-aligned)
5. **Pass extras:** `EXTRA_TITLE`, `EXTRA_SUBTITLE` (key stat), `EXTRA_COLOR` (icon bg color), `EXTRA_FIELDS`
6. **Field format:** `"label|value"` strings. `"## SECTION|"` for section headers. `"---|"` ignored.
7. Chip candidates: Active, Admin, Stock Item, Kitchen Item, Favourite, Modifier, etc.
8. **Section cards are tappable** — tap a section to open its Section Editor (see below)

### Section Editor Pattern (Progressive Disclosure)
**NEVER build monolithic edit forms.** Use section-based editing:

#### Core Principle
Every entity is displayed as a **Detail Brochure** (read view). Each section card is tappable.
Tapping opens a **Section Editor** — a focused bottom sheet with only that section's 2-4 fields.
The same section editors are reused as wizard steps when creating a new entity.

#### Architecture
```
SectionEditorSheet (reusable BottomSheetDialogFragment)
├── Input: section key, field definitions, current values
├── UI: title + 2-4 focused inputs + Save button
├── Output: edited values via callback/result
│
Detail Brochure (view + edit existing)
├── Hero header (read-only)
├── Section cards (tappable → opens SectionEditorSheet)
├── On save → updates DB, refreshes brochure
│
Create Wizard (new entity)
├── Chains SectionEditorSheets as sequential steps
├── Progress indicator (dots or steps)
├── Each step = same component used in edit mode
├── Final step creates entity with all collected values
```

#### Section Editor Rules
1. **Max 4 fields per section** — if a section has more, split it
2. **Bottom sheet, not full screen** — keeps context visible behind
3. **One Save per section** — partial saves are OK, no "save all" at the end
4. **Smart inputs** — dropdowns for categories/tax, toggles for booleans, number pad for prices
5. **Validation inline** — show errors on the field, not in a toast
6. **Cancel = swipe down** — no explicit cancel button needed

#### Standard Section Definitions

**Products:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| General | Name, Item Code, UPC, Description | Text |
| Pricing | Selling Price, Cost Price, Wholesale Price | Number (currency) |
| Category & Tax | Category, Tax Rate | Dropdown pickers |
| Flags | Stock, Kitchen, Favourite, Modifier, BOM | Toggle switches |

**Stores:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| General | Name, Currency | Text, Dropdown |
| Address | Address, City, State, ZIP, Country | Text |

**Terminals:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| General | Name, Prefix, Float Amount | Text, Number |
| Store | Store assignment | Dropdown picker |

**Users:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| Identity | First Name, Last Name, Username | Text |
| Contact | Email, Phone | Text (email/phone) |
| Role | Role, Discount Limit | Dropdown, Number |
| Security | PIN | PIN input (masked) |

**Taxes:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| General | Name, Rate, Tax Code | Text, Number |

**Categories:**
| Section | Fields | Input Types |
|---------|--------|-------------|
| General | Name, Display Name, Position | Text, Number |
| Tax | Tax assignment | Dropdown picker |

## Mobile Screens (from prototype)

### Auth: welcome → phone → otp → profile → pin → enroll → login
### Home: greeting + store/role, 2x2 tile grid, today's summary
### POS: ☰ + search + scan → categories → product grid (2-col) → MY CART button
### Cart: customer bar + items + note/tips chips + totals + HOLD/PAY
### Payment: Cash / Card+Blink / Split options → quick cash amounts
### Receipt: success banner + receipt card (store, items, totals, QR) + VOID/PRINT/NEW SALE
### Till: open (denomination) → close (4-step: expected → count → discrepancy → evidence)
### Orders: search + filter chips + order cards with status badges
### Refund: order search → item checkboxes → reason → supervisor PIN
### Scanner: viewfinder + auto-scan toggle + product toast + MY CART with badge

## Web Console Patterns

### Sidebar Navigation
- `prefetch={true}` on all `<Link>` components — pages pre-load in background
- Brand › Store › Terminal context shown below header
- Responsive: collapses to hamburger on mobile

### Terminal Config Page (`/terminals`)
- Table layout: Terminal name (with type icon), Type badge, Store, Zone, Prefix, Status, Actions (Edit + QR)
- Terminal type: visual card selector with icons (Monitor, ChefHat, ScreenShare, Smartphone), not a dropdown
- Edit panel opens above the table, not in an accordion

### Platform Tabs (`/platform`)
- URL-based tabs: `?tab=brands|owners|errors|sync|tests`
- `<Link prefetch={true}>` for each tab — near-instant switching
- Each tab fetches its own data (not all at once)

### Table Section Picker (Android)
- Color-coded cards: occupied tables filled with section color, free tables outlined
- Section tabs at top (All / Indoor / Patio / Takeaway) with counts
- Dialog sized at 90% width / 70% height

### Printer Station Assignment (Android)
- When "Print Kitchen Receipts" toggled on, show station checkboxes below
- Multi-select: check which stations this printer handles
- Label: "Stations this printer handles:" with station name + type

## Rules
1. **NEVER use @color/black** — use `posterita_ink`
2. **NEVER use hardcoded grays** — use `posterita_muted`
3. **NEVER use white for page backgrounds** — use `posterita_bg`
4. **Always use TextAppearance.Posterita.*** styles for text
5. **Always use Widget.Posterita.Button.*** styles for buttons
6. **Prototype is UI reference, not feature spec** — preserve existing Android functionality
7. **NEVER build monolithic edit forms** — use Section Editor pattern (progressive disclosure)
8. **NEVER show data as a flat label-value table** — use Detail Brochure pattern
9. **NEVER use CRUD scaffolds** — every screen should feel designed, not generated
10. **Responsive design, NOT adaptive** — one layout that flexes, use Tailwind responsive classes
11. **Prefetch all nav links** — `prefetch={true}` on sidebar and tab `<Link>` components
