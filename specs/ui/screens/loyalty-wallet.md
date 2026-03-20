# Screen: Loyalty — Customer Wallet
> Module: modules/07-loyalty-program.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Loyalty.tsx (partial)

## Purpose
Shows a specific customer's loyalty wallet: points balance, available vouchers, and marketing consent status.

## Layout (App.jsx version)
- Back button to customer search
- Title: "Loyalty" at 18px/800
- Customer info: name and phone at 12px muted
- Points balance card: purpleLight background, 14px border-radius, 16px padding
  - Points: 32px/800 purple
  - Label: "Points balance" at 13px/700 purple
- Vouchers section:
  - Voucher cards: name, expiry date, code, REDEEM button
- Consent section: greenLight status card showing consent date

### v3.8.1 Expanded Loyalty Screen (Tabbed)
- **Wallets tab:** Total points in circulation card (gradient red), customer wallet list with name, phone, points, tier badge (Gold/Silver)
- **Transactions tab:** Earn/redeem/campaign log with directional arrows, points amounts, timestamps
- **Vouchers tab:** Active voucher codes with type, redemption progress bars, expiry dates
- **Config tab:** Points configuration (points per Rs 100, welcome bonus, survey bonus), consent status with progress bar

## Key Components Used
- PF / TopBar
- Badge (points, tier)
- Card (voucher items, wallet items)
- Section (titled sections)
- StatusPill (tier badges)
- ProgressBar (voucher redemption, consent progress)
- ListRow (transaction items)
- Btn48 / Btn (REDEEM buttons)

## Data Requirements
- Customer: name, phone, points balance, lifetime points, tier
- Vouchers: code, description, expiry, redemption status
- Transaction history: type (earn/redeem/campaign), points, customer, timestamp
- Points configuration rules
- Consent statistics

## User Actions
- View points balance and tier
- Tap REDEEM on a voucher to apply it to current sale
- Switch between Wallets/Transactions/Vouchers/Config tabs (v3.8.1)
- View consent status

## Design Notes
- Points card: purpleLight background, centered text, 32px/800 for the number
- Voucher cards: standard Card component, flex space-between with REDEEM button
- Consent: greenLight card with green checkmark and text
- v3.8.1 tier badges: Gold uses amber color, Silver uses muted
- v3.8.1 points-in-circulation card: gradient red background, white text, shows total and liability value
