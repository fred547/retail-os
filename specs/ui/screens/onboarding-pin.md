# Screen: Onboarding — PIN Creation
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Allows the user to create a 4-digit PIN for daily login to the POS device.

## Layout
- Back button
- Title: "Create your PIN" at 20px/800
- Subtitle: "4-digit PIN for daily login" at 13px muted
- Four dot indicators showing PIN progress (14px circles, blue when filled, line when empty)
- 3x4 numeric keypad grid (digits 1-9, blank, 0, backspace)
- Each key is 54x54px (or 60x60 in v3.8.1)

## Key Components Used
- PF (Phone Frame, no bottom nav)
- BackBtn
- Custom PIN dot indicators
- Custom numeric keypad grid

## Data Requirements
- PIN to be stored securely on device

## User Actions
- Tap digits 0-9 to enter PIN
- Tap backspace to delete last digit
- PIN auto-advances after 4 digits are entered

## Design Notes
- PIN dots: 14px diameter circles, spaced 14px apart, centered
- Filled dots: T.blue background; unfilled: T.line background
- Keypad grid: gridTemplateColumns repeat(3, 1fr), 10px gap, max-width 230px centered
- Key buttons: 54px square, 14px border-radius, paper background, line border
- Key text: 20px/700 weight
- Backspace shown as unicode character
