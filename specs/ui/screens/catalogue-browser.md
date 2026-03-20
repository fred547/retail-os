# Screen: Catalogue Browser
> Module: modules/10-catalogue-and-products.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Products.tsx (partial)

## Purpose
Product catalogue management with AI enrichment. Shows all products with enrichment status, allows AI-powered content generation, and supports PDF catalogue export and label printing.

## Layout
- TopBar: "Catalogue" + enrichment progress subtitle (e.g., "3/6 enriched")
- Grid/List view toggle (top-right)
- Enrichment progress bar (green)
- Action buttons: "AI Enrich All" (secondary) | "PDF Catalogue" (ghost with printer icon)
- Product grid (2-column in grid view, list in list view):
  - Each product shows: emoji/image, name, price, enrichment status pill, catalogue-ready pill
- Label printing card at bottom (purpleLight background): information about printing barcode + QR labels

### AI Enrichment Sub-screen
- TopBar: "AI Enrichment" + "Processing N products..."
- Per-product cards showing processing status (checkmark, spinner, hourglass)
- Completed items show: "AI generated: short desc, long desc, features, tags, marketing copy"
- "Review Suggestions" CTA

## Key Components Used
- TopBar (with right-side view toggle)
- Card (product items)
- StatusPill (enriched/needs AI/ready)
- ProgressBar (enrichment progress)
- Btn (AI enrich, PDF, print)
- Icon (printer)

## Data Requirements
- Product list: name, price, image/emoji, enrichment status, catalogue readiness
- AI-generated content: descriptions, features, tags, marketing copy

## User Actions
- Toggle between grid and list views
- Tap "AI Enrich All" to batch-generate product content
- View AI enrichment progress
- Review and accept AI suggestions
- Generate PDF catalogue
- Print barcode/QR labels for catalogue-ready products

## Design Notes
- View toggle: small pills with grid/list icons, blueLight background when active
- Grid view: 2-column grid, 8px gap
- Product cards: 12px padding, emoji at 32px (grid) or 24px (list)
- Status pills: "Enriched" in green, "Needs AI" in amber, "Ready" in blue
- Label printing card: purpleLight background, purple text heading, 33% opacity purple border
