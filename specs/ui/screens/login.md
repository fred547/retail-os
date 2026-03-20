# Screen: Login (PIN Entry)
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Daily login screen for returning users. Supports both owner login (direct PIN entry) and staff login (staff selection then PIN entry).

## Layout

### Owner Login
- Centered layout on warm background
- "Welcome back, [Name]" greeting at 13px muted
- Brand name "Funky Fish" at 20px/800
- Four PIN dot indicators (14px circles)
- 3x4 numeric keypad (56x56px buttons in v3.8.1)
- "Use biometric" link at bottom in blue

### Staff Login
- Store/device identifier at top: "Grand Baie - POS-GB-01" at 12px muted
- Brand name at 18px/800
- Staff selection cards (avatar + name + role)
- After selection: PIN entry screen with staff name

## Key Components Used
- Card (staff selection cards with avatar, name, role)
- Badge-style avatar (36px circle, blueLight background, initials)
- PIN dot indicators
- Numeric keypad grid

## Data Requirements
- List of staff enrolled on this device (name, role)
- PIN validation against local store
- Biometric authentication availability

## User Actions
- (Owner) Enter 4-digit PIN
- (Owner) Tap "Use biometric" for fingerprint/face login
- (Staff) Select their name from the staff list
- (Staff) Enter their 4-digit PIN
- Back button to return to welcome

## Design Notes
- Staff cards: white background, 24px border-radius, 1px line border, flex layout with avatar + text
- Avatar: 36px circle, blueLight background, initials in blue/700 weight
- Keypad buttons: 56px diameter circles in v3.8.1, paper background, subtle shadow, 18px/700 font
- Empty keypad cells are transparent with no border
