# Screen: POS — Product Selection
> Module: modules/04-pos-and-transactions.md
> Status: built
> Production file: manus-retail-os/client/src/pages/Products.tsx (partial)

## Purpose
The primary point-of-sale screen where cashiers browse products, add items to cart, and proceed to payment. This is the most-used screen in the entire application.

## Layout (top to bottom)
1. **Top bar:** Hamburger menu | Cart quantity count ("4X") | Vertical divider | Last-added product preview (image + name + price) | UNDO button
2. **Order type toggle:** Two equal buttons — "DINE IN" (active, blue) / "TAKE AWAY" (white)
3. **Category chips:** 3-column grid of category filter buttons (ALL, FOOTWEAR, BAGS, ACCESS., GEAR, APPAREL)
4. **Search bar:** Full-width input "Search product" with 42px height
5. **Product grid:** 2-column scrollable grid of product cards (thumbnail + name + price + qty badge)
6. **Bottom action bar:**
   - Row A: CLEAR | SEARCH | MORE (3 equal columns)
   - Row B: SCAN | CUST | MY CART > (1fr 1fr 2fr)

## Key Components Used
- PF (Phone Frame, no bottom nav during POS mode)
- Hamburger (48px touch target, 3-line icon)
- Pill (category filter chips, 38px height)
- Product cards (56px image | 1fr info layout, min-height 68px)
- Btn48 (all bottom bar buttons)
- Cart sheet overlay (triggered by MY CART button)

## Data Requirements
- Product catalog: id, name, price, category, image URL
- Categories list
- Current cart state (items, quantities)
- Last-added product for preview bar

## User Actions
- Tap product card to add to cart (increments if already in cart)
- Tap category chip to filter products
- Tap CLEAR to empty cart
- Tap SEARCH for barcode/name lookup
- Tap MORE to access order history, refunds, holds, till operations
- Tap SCAN to activate barcode scanner
- Tap CUST to link a loyalty customer
- Tap MY CART to open cart sheet overlay
- Tap UNDO to remove last-added item

## Design Notes
- Product card grid: gridTemplateColumns "1fr 1fr", 4px gap
- Product card internal: gridTemplateColumns "56px 1fr", image flush-left, cover crop
- Product name: 13px/800, max 2 lines with WebkitLineClamp
- Price: 13px/800, blue color
- "Nx in cart" indicator: 12px, #8a8a8a color, shown only when qty > 0
- Qty badge: absolute top-right, min-width 22px, pill shape, blue background, white text 11px/800
- MY CART button: blue background, 16px/800 white text, right chevron, red badge at top-right showing total qty
- CLEAR button: red text (danger style)
- The entire POS screen fills the phone frame without bottom nav to maximize product browsing space
