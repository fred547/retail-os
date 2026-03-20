# Screen: Loyalty — Customer Lookup
> Module: modules/07-loyalty-program.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Search for and link a loyalty customer to the current sale. Shows matching customers with their points balance.

## Layout
- Back button to products
- Title: "Customer Lookup" at 18px/800
- Subtitle: "Link customer to this sale" at 12px muted
- Search field: "Phone number or name..."
- Results section with customer cards:
  - Avatar (36px circle with initials)
  - Customer name at 13px/800
  - Phone number and points balance at 11px muted
  - SELECT button (primary)
- "+ Create new customer" link at bottom

## Key Components Used
- PF (Phone Frame, active="pos")
- BackBtn
- Field (search input)
- Section (titled "RESULTS")
- Card (per customer result)
- Avatar (initials circle)
- Btn48 (SELECT button)

## Data Requirements
- Customer search by phone number or name
- Customer records: name, phone, loyalty points

## User Actions
- Type phone number or name to search
- Tap SELECT to link customer to current sale
- Tap customer card to view loyalty detail
- Tap "+ Create new customer" for new enrollment

## Design Notes
- Customer cards: flex layout with avatar, info, and SELECT button
- Avatar: 36px circle, blueLight background, blueD text with initials
- SELECT button prevents event propagation (e.stopPropagation) so card click and button click have different targets
- v3.8.1 embeds loyalty linking directly in the POS top bar as a small banner
