# Screen: Cash Collection
> Module: modules/05-till-reconciliation.md
> Status: prototype-only
> Production file: not yet built

## Purpose
End-of-day cash collection process: calculate cash to collect, prepare sealed bag, and confirm for driver pickup.

## Layout (3-step flow)

### Step 1: Cash Summary
- TopBar: "Cash Collection" + "Store to Safe transport" subtitle
- Summary card:
  - Till total, Card payments (deducted), COD received (added)
  - Separator line
  - Cash to collect total (green, 15px/800)
- CTA: "Prepare Collection Bag"

### Step 2: Seal & Label
- Centered card:
  - Bag label emoji
  - "Seal & Label Bag" title
  - Bag ID (e.g., CB-GB-20260319)
  - Amount in green at 20px/800
- CTA: "Confirm Sealed"

### Step 3: Confirmation
- Success card (greenLight background, green 33% border):
  - Checkmark emoji
  - "Collection Ready" in green
  - Bag ID and amount
  - "Waiting for driver pickup" status
- "Back to Home" ghost button

## Key Components Used
- TopBar
- Card (summary, seal, confirmation)
- Btn (primary, ghost, success variants)

## Data Requirements
- Till totals: cash sales, card payments, COD received
- Calculated cash collection amount
- Bag ID generation

## User Actions
- Review cash calculation
- Prepare and seal collection bag
- Confirm sealed bag
- Return to home after confirmation

## Design Notes
- Cash summary: standard card, 14px/700 labels, 700 weight values
- Total line: 15px/800, green color, preceded by line border-top with margin
- Seal card: centered text, 32px emoji, 16px/800 title, 20px/800 green amount
- Confirmation card: greenLight background, green 33% border
