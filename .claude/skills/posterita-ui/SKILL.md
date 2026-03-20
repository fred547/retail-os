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
- **POS screen:** ☰ hamburger | "POS" title | (actions)
- **Sub-screens:** ← back arrow | "Screen Name" | (actions)
- Background: `posterita_paper`, 1dp elevation

### Bottom Buttons
- Full-width, `posterita_paper` background, 4dp elevation
- Primary action (PAY, NEW SALE): `Widget.Posterita.Button.Pay` (52dp)
- Secondary actions (HOLD, MORE): `Widget.Posterita.Button.Outlined` (52dp)

### Cards
- `MaterialCardView`, 14dp radius, 0dp elevation, 1dp stroke `posterita_line`
- Background: `posterita_paper`

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

## Rules
1. **NEVER use @color/black** — use `posterita_ink`
2. **NEVER use hardcoded grays** — use `posterita_muted`
3. **NEVER use white for page backgrounds** — use `posterita_bg`
4. **Always use TextAppearance.Posterita.*** styles for text
5. **Always use Widget.Posterita.Button.*** styles for buttons
6. **Prototype is UI reference, not feature spec** — preserve existing Android functionality
