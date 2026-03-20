# Screen: Till — Open
> Module: modules/05-till-reconciliation.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/TillSessions.tsx (partial)

## Purpose
Records the opening float (starting cash) when beginning a till session for the day.

## Layout
- Back button to products
- Title: "Open Till" at 18px/800
- Subtitle: store name and device ID at 12px muted
- Glass card containing denomination breakdown:
  - Section header: "OPENING FLOAT" at 11px/800 muted
  - Rows for each denomination: Rs 2000 notes, Rs 500 notes, Rs 200 notes, Rs 100 notes, Coins
  - Each row: denomination label (left) + count input field (right, 70x38px)
  - Total row at bottom: "Float total" with calculated amount
- Primary CTA: "OPEN TILL SESSION" full-width button

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Glass (denomination card)
- Inline number input fields (70px wide, 38px height, right-aligned)
- Btn48 (primary full-width)

## Data Requirements
- Denomination list for local currency (MUR)
- Calculated float total

## User Actions
- Enter count for each denomination
- Total auto-calculates
- Tap "OPEN TILL SESSION" to start the session

## Design Notes
- Glass card: 16px padding, 14px border-radius
- Denomination rows: flex space-between, 8px vertical padding, separated by line borders
- Input fields: 70px width, 38px height, 10px border-radius, right-aligned text, 14px/800 font
- Total row: separated by top border, 16px/800 weight both sides
