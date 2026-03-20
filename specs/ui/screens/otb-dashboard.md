# Screen: OTB & Merchandise Planning Dashboard
> Module: modules/11-otb-and-merchandise-planning.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Open-to-Buy merchandise planning dashboard showing stock cover heatmap, OTB budget tracking, and goods pipeline with projected stock levels. This is a desktop/web-focused screen for merchandise planners and buyers.

## Layout
- **Header:** "Merchandise Planning" title + "OTB & Stock Cover -- Funky Fish - All Stores" subtitle + "March 2026" date + Live indicator (green dot)
- **Summary cards (4-column grid):**
  - Total OTB Budget: Rs 4.0M (blue)
  - Committed: Rs 2.5M / 63% utilized (amber)
  - Remaining OTB: Rs 1.5M (green)
  - Avg Stock Cover: 3.9 mo (green)
- **Tab switcher:** Stock Cover | OTB Plan | Goods Pipeline

### Stock Cover Tab
- Target range indicator: "3-6 months" badge
- Heatmap table: Store rows x Category columns (Sandals, Accessories, Apparel, Overall)
- Each cell: cover value + status icon (Critical <2mo, Low <3mo, Healthy 3-6mo, Overstock >6mo)
- Warehouse row (highlighted)
- Legend: color-coded status indicators
- Warehouse Distribution Capacity: cards showing months of supply per category

### OTB Plan Tab
- Per-category expandable cards (Sandals, Accessories, Apparel):
  - Budget/Committed/Remaining OTB metrics
  - Budget utilization progress bar (multi-layer: budget, committed, actual)
  - Monthly breakdown grid (6 months): mini bar charts with committed/budget fill

### Goods Pipeline Tab
- Category filter buttons: All, Sandals, Accessories, Apparel
- Timeline header: 6-month axis with "NOW" marker
- PO cards positioned on timeline: reference, vendor, status badge, units, cost, ETA, progress bar
- Projected Stock chart: bar chart showing units and cover months per future month

## Key Components Used
- TabButton (tab switcher)
- CoverCell (value + status icon)
- Summary cards (glassmorphism)
- Heatmap grid table
- Timeline visualization
- PO cards (colored by status: Draft, Confirmed, In Production, In Transit)
- Bar chart (projected stock)

## Data Requirements
- Stock cover data: per-store, per-category cover months
- Warehouse stock and distribution capacity
- OTB plan: per-category budget, committed, actual, monthly breakdown
- Purchase orders: PO reference, vendor, category, units, cost, status, ETA, progress
- Projected stock: monthly units and cover forecast

## User Actions
- Switch between Stock Cover, OTB Plan, and Goods Pipeline tabs
- Filter pipeline by category
- Review store-level stock health at a glance
- Identify critical stock situations
- Track PO progress on timeline

## Design Notes
- Background: #F5F2EA warm canvas, full viewport height
- Summary cards: glassmorphism (rgba(255,255,255,0.82), blur(14px)), 12px border-radius
- Labels: 11px/700 muted, uppercase, 0.8px letter-spacing
- Values: 24px/800
- Tab buttons: 13px/800, 8px 18px padding, 8px border-radius; active: blue fill white text; inactive: transparent, line border
- Heatmap: grid with header row in #FAFAF7 background, 140px first column, equal columns for categories
- Cover status colors: red (#E53935) for Critical, amber (#F57F17) for Low, green (#2E7D32) for Healthy, purple (#5E35B1) for Overstock
- Status icons: filled circle (Critical), triangle (Low), checkmark (Healthy), square (Overstock)
- OTB budget bars: 8px height, 4px border-radius, multi-layer with opacity
- Monthly breakdown: 6-column grid, mini bar charts with fill height animation
- Pipeline PO cards: positioned by ETA on timeline, colored borders by status
- Projected stock bars: gradient fill, rounded top corners, color by cover status
