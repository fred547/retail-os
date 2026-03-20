# Screen: Till — Close (Reconciliation)
> Module: modules/05-till-reconciliation.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/TillSessions.tsx (partial)

## Purpose
Multi-step till closing process: shows expected totals, collects cash count, calculates discrepancy, and captures evidence photos.

## Layout (4-step flow)
1. **STEP 1 - EXPECTED TOTALS:** Glass card showing Cash sales, Card/Blink, Refunds, Expected cash (highlighted in blueLight)
2. **STEP 2 - COUNT CASH:** Glass card with denomination inputs (same as open till but for closing count): Rs 2000, Rs 500, Rs 200, Rs 100, Coins
3. **STEP 3 - DISCREPANCY:** Amber-light card showing discrepancy result (or "Complete cash count to see discrepancy" if not yet counted)
4. **STEP 4 - EVIDENCE:** Three upload slots — Till photo, Bank slip, Z-report (dashed border upload areas with icons)
- Primary CTA: "SUBMIT RECONCILIATION" full-width button

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Section (titled sections for each step)
- Glass (totals and count cards)
- Badge (status indicators)
- Btn48 (submit)

## Data Requirements
- System-calculated expected totals: cash sales, card sales, refunds
- User-counted cash denominations
- Discrepancy calculation (counted - expected)
- Photo/document uploads for evidence

## User Actions
- Review expected totals
- Enter cash count by denomination
- View discrepancy calculation
- Upload evidence photos (till photo, bank slip, Z-report)
- Tap "SUBMIT RECONCILIATION" to finalize

## Design Notes
- Expected totals: Glass card with rows, highlighted row uses blueLight background for "Expected cash"
- Labels: 12px/600 muted for regular rows, 12px/800 blueD for highlighted row
- Denomination inputs: compact (56px width, 32px height, 8px border-radius)
- Discrepancy card: amberLight background, 12px border-radius
- Evidence uploads: dashed border (1.5px), 10px border-radius, centered icon + label, tappable
- This screen is more compact than open till due to the 4-step layout
