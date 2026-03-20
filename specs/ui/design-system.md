# Posterita Design System
> Extracted from: posterita-brand-guidelines.md, posterita-brand-preview.jsx, and prototype design tokens

## Brand Personality

Posterita is retail operations software for tropical, fast-paced store environments. The design must be:
- **Warm:** Off-white/sand backgrounds, not clinical white
- **Bold:** Heavy font weights, strong contrast, decisive color
- **Fast:** Big tap targets, minimal steps, visible state
- **Tropical premium:** Like a well-designed surf shop, not a government form

## Color Palette

### Primary Colors
| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#F5F2EA` | Page background. Warm off-white, the signature Posterita canvas |
| `--paper` | `#FFFFFF` | Card and panel backgrounds |
| `--panel` | `#FAFAFA` | Secondary panel background (header bars, input areas) |
| `--ink` | `#141414` | Primary text, near-black with warmth |
| `--muted` | `#6C6F76` | Secondary text, descriptions, timestamps |
| `--line` | `#E6E2DA` | Borders, dividers. Warm gray, not blue-gray |

### Action Colors
| Token | Hex | Role |
|-------|-----|------|
| `--blue` | `#1976D2` | Primary action: buttons, links, prices, active states |
| `--blue-light` | `#DCEBFF` | Blue tint for badges, backgrounds, selected states |
| `--blue-dark` | `#0D5DB3` | Blue text on light blue backgrounds |

### Semantic Colors
| Token | Hex | Light Variant | Usage |
|-------|-----|---------------|-------|
| `--red` | `#E53935` | `#FFF1F0` | Danger, remove, clear, refund, errors |
| `--green` | `#2E7D32` | `#E8F5E9` | Success, synced, approved, check-in |
| `--amber` | `#F57F17` | `#FFF8E1` | Warning, pending, stale, attention |
| `--purple` | `#5E35B1` | `#EDE7F6` | Loyalty, points, vouchers, customer features |

### Extended Colors (v3.8.1)
| Token | Hex | Light Variant | Usage |
|-------|-----|---------------|-------|
| `--teal` | `#00838F` | `#E0F7FA` | Staff operations |
| `--orange` | `#FF6F00` | `#FFF3E0` | Logistics |
| `--brown` | `#5D4037` | `#EFEBE9` | Warehouse |
| `--pink` | `#AD1457` | `#FCE4EC` | Shifts |

### Color Rules
- Tint badges: pair semantic color text with its light variant background
- Glassmorphism: `background: rgba(255,255,255,0.82); backdrop-filter: blur(14px)`
- Page canvas: always `--bg`, never pure white or gray
- Active states: `--blue` fill with white text

## Typography

### Font Stack
```
"Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif
```

### Type Scale
| Name | Size | Weight | Use |
|------|------|--------|-----|
| Display | 38px | 800 | Hero headings, marketing only |
| Title | 22px | 800 | Screen titles, section headers |
| Heading | 18px | 800 | Card titles, panel headers |
| Subheading | 16px | 700 | Cart item names, product detail |
| Body | 14px | 600 | Default text, descriptions |
| Caption | 13px | 800 | Product names, prices, buttons |
| Micro | 12px | 800 | Category chips, badges, timestamps |
| Tiny | 11px | 700 | Auxiliary info, hints |
| Nano | 10px | 700 | Eyebrow labels, extra small |
| Pico | 9px | 600 | WhatsApp message times |

### Weight Rules
- **800 (ExtraBold):** Anything instantly readable: prices, quantities, buttons, totals
- **700 (Bold):** Secondary emphasis: product names, cart items, form values
- **600 (SemiBold):** Body text
- **400 (Regular):** Long-form only: descriptions, notes, help text
- **Never use 300/Light.** Thin text disappears in bright store environments

### Letter Spacing
| Context | Spacing |
|---------|---------|
| Display/Title | `-0.04em` to `-0.02em` (tight) |
| Uppercase labels | `+0.04em` to `+0.08em` (wide) |
| Body text | `0` (normal) |
| Prices/numbers | `-0.02em` |

## Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight components (chip padding, badge) |
| `--space-sm` | 6px | Grid gaps in dense layouts |
| `--space-md` | 8px | Standard inner padding, element gaps |
| `--space-lg` | 12px | Section padding, card padding (mobile) |
| `--space-xl` | 16px | Major section gaps, card padding (tablet/web) |
| `--space-2xl` | 20px | Panel padding |
| `--space-3xl` | 24px | Hero padding, page gutters |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 8px | Small buttons, mini badges |
| `--radius-sm` | 10px | Product cards, cart items, inputs |
| `--radius-md` | 14px | Buttons, chips, search boxes |
| `--radius-lg` | 20px | Panels, settings cards |
| `--radius-xl` | 24px | Hero cards, glassmorphism panels |
| `--radius-2xl` | 28px | Phone shell frame |
| `--radius-pill` | 999px | Badges, quantity pills, toasts |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Product cards, subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Floating panels, dropdowns |
| `--shadow-lg` | `0 24px 70px rgba(0,0,0,0.10)` | Hero cards, glassmorphism |
| `--shadow-sheet` | `0 24px 80px rgba(0,0,0,0.18)` | Cart sheet, modals |

## Touch Targets

| Element | Min Size |
|---------|----------|
| Primary buttons | 48px height |
| Product cards | 68px height |
| Category chips | 38px (phone), 32px (tablet) |
| Quantity +/- | 38px diameter |
| Remove button | 40x40px |
| Pay buttons | 52px height |

## Platform Breakpoints

### Phone (portrait, 375-430px)
- Product grid: 2 columns
- Cart: bottom sheet overlay
- Bottom bar: 2 rows of action buttons
- Category chips: 3-column grid
- Phone frame wrapper: 430px max-width, 12px bezel padding, 38px border-radius

### Tablet (landscape)
- Layout: 62/38 split (products / cart)
- Product grid: 2 columns, smaller cards
- Cart: always visible inline
- Category chips: 4-column grid
- All controls scaled down ~15%

### Web Console
- Sidebar: 200px width, bg background
- Content: flexible width, max 1200px
- Cards: radius-xl with glassmorphism
- Tables: warm palette, line borders

## Iconography
- Style: Line icons, 2px stroke, rounded caps
- Default size: 20px (mobile), adjustable
- Colors: ink for navigation, muted for secondary, blue for active
- Preferred set: Lucide-style clean line icons
- v3.8.1 includes 24 custom SVG icons in the Icon component
