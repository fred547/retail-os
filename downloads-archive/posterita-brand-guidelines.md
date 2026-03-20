# Posterita Design System — Brand Guidelines

*Version 1.0 · March 2026*
*For use across Android POS, Web Console, Print, and Marketing*

---

## 1. Brand essence

**Posterita** is retail operations software built for tropical, fast-paced store environments. It runs on devices held by cashiers standing all day, supervisors moving between stores, and managers reviewing numbers on their laptops. The design must be fast to read, forgiving to fat fingers, and beautiful enough that staff take pride in using it.

### Design personality

| Trait | What it means in practice |
|---|---|
| **Warm** | Off-white and sand backgrounds, not clinical white or corporate gray. The screen should feel like warm light, not fluorescent. |
| **Bold** | Heavy font weights, strong contrast, decisive color. No wishy-washy pastels or uncertain line weights. When something is a button, it looks like a button. |
| **Fast** | Big tap targets, minimal steps, visible state. A cashier scanning 50 items in a rush should never wonder "did that register?" |
| **Tropical premium** | Funky Fish sells beach lifestyle. The UI should feel like a well-designed surf shop, not a government form. Generous radius, a hint of playfulness, but grounded. |

---

## 2. Color system

### Primary palette

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#F5F2EA` | Page background. Warm off-white, the signature Posterita canvas. Used everywhere as the base surface. |
| `--paper` | `#FFFFFF` | Card and panel backgrounds. Pure white for elevated content. |
| `--ink` | `#141414` | Primary text. Near-black with warmth. |
| `--muted` | `#6C6F76` | Secondary text. Descriptions, timestamps, hints. |
| `--line` | `#E6E2DA` | Borders, dividers. Warm gray, not blue-gray. |
| `--blue` | `#1976D2` | Primary action color. Buttons, links, prices, active states, Blink payments. |
| `--blue-light` | `#DCEBFF` | Blue tint for badges, backgrounds, selected states. |
| `--blue-dark` | `#0D5DB3` | Blue text on light blue backgrounds. |

### Semantic palette

| Token | Hex | Usage |
|---|---|---|
| `--red` | `#E53935` | Danger, remove, clear, refund, errors, discrepancy negative |
| `--red-light` | `#FFF1F0` | Red tint for badges, error backgrounds |
| `--green` | `#2E7D32` | Success, synced, approved, check-in, positive discrepancy |
| `--green-light` | `#E8F5E9` | Green tint backgrounds |
| `--amber` | `#F57F17` | Warning, pending, stale, attention needed |
| `--amber-light` | `#FFF8E1` | Amber tint backgrounds |
| `--purple` | `#5E35B1` | Loyalty, points, vouchers, customer features |
| `--purple-light` | `#EDE7F6` | Purple tint backgrounds |

### Background application rules

- **Page canvas:** Always `--bg` (#F5F2EA). Never pure white or gray for the outermost background.
- **Cards and panels:** `--paper` (#FFFFFF) with subtle border `--line` and soft shadow.
- **Glassmorphism:** Cards can use `background: rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(14px)` for elevated panels on the warm background.
- **Active states:** `--blue` fill with white text. Selected category chips, primary buttons, active toggles.
- **Tint badges:** Pair semantic colors with their `-light` variant. Text in the dark shade, background in the light shade (e.g., green text on green-light background).

---

## 3. Typography

### Font stack

```
--font: "Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
```

Avenir Next is the primary face. It has the warmth and geometric clarity that matches the brand — not as cold as Inter/Roboto, not as quirky as rounded typefaces.

### Type scale

| Name | Size | Weight | Use |
|---|---|---|---|
| Display | 38px | 800 | Hero headings, marketing pages only |
| Title | 22px | 800 | Screen titles, section headers |
| Heading | 18px | 800 | Card titles, panel headers, cart title |
| Subheading | 16px | 700 | Cart item names, product names in detail view |
| Body | 14px | 600 | Default text, descriptions, form labels |
| Caption | 13px | 800 | Product card names, prices, button labels |
| Micro | 12px | 800 | Category chips, badge text, timestamps |
| Tiny | 11px | 700 | Auxiliary info, hints, extra lines |

### Weight rules

- **800 (ExtraBold)** for anything that must be instantly readable at a glance: prices, quantities, button labels, totals. This is the workhorse weight.
- **700 (Bold)** for secondary emphasis: product names in detail, cart item titles, form values.
- **600 (SemiBold)** for body text that needs to hold its own against the heavy weights around it.
- **400 (Regular)** for long-form content only: descriptions, notes, help text.
- **Never use 300/Light.** In a bright store environment with screen glare, thin text disappears.

### Letter spacing

| Context | Spacing |
|---|---|
| Display headings | `-0.04em` (tight) |
| Title/Heading | `-0.02em` |
| All-caps labels (eyebrow, category chips) | `+0.06em` to `+0.08em` |
| Body text | `0` (normal) |
| Prices, numbers | `-0.02em` |

---

## 4. Spacing and layout

### Spacing scale

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Inside tight components (chip padding, badge padding) |
| `--space-sm` | 6px | Grid gaps in dense layouts (product grid, bottom buttons) |
| `--space-md` | 8px | Standard inner padding, gap between related elements |
| `--space-lg` | 12px | Section padding, card inner padding on mobile |
| `--space-xl` | 16px | Major section gaps, card padding on tablet/web |
| `--space-2xl` | 20px | Panel padding, generous breathing room |
| `--space-3xl` | 24px | Hero padding, page-level gutters |

### Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | 8px | Small buttons, mini badges |
| `--radius-sm` | 10px | Product cards, cart items, input fields |
| `--radius-md` | 14px | Buttons, chips, search boxes, bottom action buttons |
| `--radius-lg` | 20px | Panels, cart sheet, settings cards |
| `--radius-xl` | 24px | Hero cards, glassmorphism panels |
| `--radius-2xl` | 28px | Phone shell frame, outermost containers |
| `--radius-pill` | 999px | Badges, quantity badges, toast notifications |

### Shadow

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Product cards, subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Floating panels, dropdowns |
| `--shadow-lg` | `0 24px 70px rgba(0,0,0,0.10)` | Hero cards, glassmorphism panels |
| `--shadow-sheet` | `0 24px 80px rgba(0,0,0,0.18)` | Cart sheet overlay, modals |

---

## 5. Component patterns

### Product card (mobile)

```
┌────────────────────────────────┐
│ ┌──────┐  Name (2 lines max)   │  [qty badge]
│ │ IMG  │  Rs 1,290              │
│ │ 56px │  "2x in cart"          │
│ └──────┘                        │
└────────────────────────────────┘
```

- **Grid:** `56px image | 1fr info | auto badge`
- **Height:** Min 68px, stretches for 2-line names
- **Image:** Square, flush left, `object-fit: cover`, `border-radius: 10px 0 0 10px`
- **Name:** 13px / 800, max 2 lines with ellipsis
- **Price:** 13px / 800, `--blue` color
- **Extra line:** 12px, `--muted`, shows "2x in cart" or empty
- **Qty badge:** Pill at top-right, `--blue` background, white text, 11px / 800

### Category chip

- **Height:** 38px (phone) / 32px (tablet)
- **Grid:** 3-column on phone, 4-column on tablet
- **Background:** White with `--line` border
- **Active:** `--blue` fill, white text, `--blue` border
- **Font:** 12px / 800, uppercase is optional (follow existing convention)

### Bottom action bar (phone)

```
┌──────────┬──────────┬──────────┐
│  CLEAR   │  SEARCH  │   MORE   │   Row A: 3 equal columns
├──────────┼──────────┼──────────┤
│   SCAN   │   CUST   │ MY CART ›│   Row B: 1fr 1fr 2fr
└──────────┴──────────┴──────────┘
```

- **Button height:** 48px
- **Border radius:** 14px
- **Font:** 12px / 800
- **CLEAR:** `--red` text (danger)
- **MY CART:** `--blue` background, white text, red badge at top-right

### Cart sheet (phone overlay)

- **Position:** Absolute overlay, `inset: 64px 8px 8px`
- **Border radius:** 22px
- **Background:** White with `--shadow-sheet`
- **Layout:** Header | scrollable list | totals | pay buttons
- **Pay buttons:** 2-column, 52px height

### Tablet cart panel

- **Split:** 62% product grid / 38% cart panel
- **Cart items:** No images (space-saving), name + blue price + info line
- **Totals:** Sub total, Tax total, Grand total (18px / 800)
- **Pay buttons:** Single column on tablet

---

## 6. Touch targets

All interactive elements must meet these minimums:

| Context | Minimum size |
|---|---|
| Primary buttons | 48px height |
| Product cards | 68px height |
| Category chips | 38px height (phone), 32px (tablet) |
| Quantity +/- | 38px diameter |
| Remove (×) | 40px × 40px |
| Bottom bar buttons | 48px height |
| Cart button | 48px height |
| Pay buttons | 52px height |

**Rule:** If a cashier can't tap it reliably with a wet thumb, it's too small.

---

## 7. Status and feedback

### Quantity badge

- Position: Top-right corner of product card, `4px 4px` inset
- Shape: Pill (`border-radius: 999px`)
- Background: `--blue`
- Text: White, 11px / 800
- Min width: 22px
- Appears only when qty > 0

### Toast notification

- Position: Fixed bottom center
- Shape: Pill with generous padding
- Background: `rgba(20, 20, 20, 0.94)`
- Text: White, 13px / 700
- Animation: Fade + slide up, 1.6s auto-dismiss
- Use for: "Product added", "Line removed", "Cart cleared"

### Last-added product bar

- Shows in the top bar, between cart quantity and undo button
- Image: 44px / 10px radius (phone), 38px (tablet)
- Name: 13px / 700, single line with ellipsis
- Price: 12px / 800, `--blue`
- Undo button: `--red` text, bordered, 40px height

---

## 8. Platform adaptations

### Phone (portrait)

- Product grid: **2 columns**, compact cards
- Cart: Bottom sheet overlay, opened from MY CART button
- Bottom bar: 2 rows of action buttons
- Category chips: 3-column grid
- Status bar: White background, simple time + app name

### Tablet (landscape)

- Layout: **62/38 split** — product grid left, cart panel right
- Product grid: 2 columns, slightly smaller cards
- Cart: Always visible inline, no overlay needed
- Category chips: 4-column grid
- All controls scaled down ~15% to fit more content

### Web console

- Uses the same color system and typography
- Cards use `--radius-xl` with glassmorphism
- Tables and data grids inherit the warm palette
- Buttons follow the same size/radius conventions
- Navigation sidebar: `--bg` background, active item uses `--blue-light` tint

---

## 9. Iconography

- **Style:** Line icons, 2px stroke, rounded caps and joins
- **Size:** 18px default on mobile, 16px in compact contexts
- **Color:** `--ink` for navigation, `--muted` for secondary, `--blue` for active
- **Hamburger menu:** 3 lines, 18px wide, 2px stroke, 4px gap — centered in a 48px touch target
- **Cart arrow:** Right chevron `›`, 22px, inline with "MY CART" text
- **Preferred icon set:** Lucide or a similar clean line set. No filled icons in navigation.

---

## 10. Implementation tokens (CSS custom properties)

```css
:root {
  /* Colors */
  --bg: #F5F2EA;
  --paper: #FFFFFF;
  --panel: #FAFAFA;
  --ink: #141414;
  --muted: #6C6F76;
  --line: #E6E2DA;
  --blue: #1976D2;
  --blue-light: #DCEBFF;
  --blue-dark: #0D5DB3;
  --red: #E53935;
  --red-light: #FFF1F0;
  --green: #2E7D32;
  --green-light: #E8F5E9;
  --amber: #F57F17;
  --amber-light: #FFF8E1;
  --purple: #5E35B1;
  --purple-light: #EDE7F6;

  /* Typography */
  --font: "Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 6px;
  --space-md: 8px;
  --space-lg: 12px;
  --space-xl: 16px;
  --space-2xl: 20px;
  --space-3xl: 24px;

  /* Radius */
  --radius-xs: 8px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-2xl: 28px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 24px 70px rgba(0,0,0,0.10);
  --shadow-sheet: 0 24px 80px rgba(0,0,0,0.18);
}
```

---

## 11. Android-specific notes

- **Kotlin/Compose or XML Views:** The color tokens map directly to either `colors.xml` resources or Compose theme values.
- **Epson ePOS SDK:** Receipts should use the bold weight for totals and store name, normal weight for line items.
- **Room/offline:** When the device is syncing, show a subtle `--amber` bar at the top. When synced, show `--green` briefly.
- **Touch feedback:** Use `--blue-light` ripple on product cards, `--line` ripple on secondary buttons.
- **Font loading:** Avenir Next may not be available on all Android devices. The fallback chain (`SF Pro Display` → `Segoe UI` → `system-ui`) ensures the geometric sans-serif character is preserved. On Android, `system-ui` resolves to Roboto, which is acceptable as a last resort.

---

## 12. What this system does NOT cover (yet)

- Restaurant-specific UI (table layout, kitchen display, course management)
- Customer-facing displays (kiosk, loyalty portal)
- Marketing materials (social media, email templates)
- Print design (shelf labels, posters)
- Dark mode (not needed for store environments with overhead lighting)

These will be added as those features move from deferred to active.
