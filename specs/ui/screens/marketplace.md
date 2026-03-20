# Screen: Redemption Marketplace
> Module: modules/07-loyalty-program.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Points redemption marketplace where customers exchange loyalty points for products. Tracks catalog items, redemption transactions, and commission revenue.

## Layout (Tabbed)

### Catalog Tab
- Marketplace product cards: title, merchant name, retail value, points cost (purple, 18px/800)
- Featured items marked with star badge
- Redemption count and limit progress bars
- "+ List Product in Marketplace" button

### Redemptions Tab
- Transaction cards: customer name, redeemed item, points deducted (purple), fulfillment status
- Commission breakdown per transaction

### Stats Tab
- Revenue card (gradient purple): total marketplace commission, points count, redemption count
- Commission tiers card: Standard 10%, Volume 8%, Premium 15%
- Points burned card: total points burned and liability reduction

## Key Components Used
- TopBar
- Tab selector pills (purple when active)
- Card (catalog items, transactions, stats)
- StatusPill (featured, fulfilled/pending)
- ProgressBar (redemption limits, purple)
- Badge (featured marker)
- Btn (list product)

## Data Requirements
- Marketplace catalog: products, points cost, retail value, merchant, featured status, redemption count/max
- Redemption transactions: customer, item, points, commission, fulfillment status
- Revenue stats: commission earned, points burned, liability reduction
- Commission tier configuration

## User Actions
- Browse marketplace catalog
- View redemption transaction history
- Review revenue and commission stats
- List new products in marketplace

## Design Notes
- Tab pills: purple when active
- Points cost: 18px/800 purple, prominent display
- Featured badge: amber "Featured" with star
- Revenue card: gradient purple (T.purple to #4527A0), white text
- Commission: calculated as pts deducted * commission rate
- Points per $: 100 pts = $1.00 USD
