# Screen: Onboarding — Welcome
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
First screen a new user sees. Introduces the Posterita brand and offers two paths: new account setup or existing account login.

## Layout
- Centered vertical layout within phone frame
- Posterita logo (blue "P" in rounded square, 80x80)
- Brand name "Posterita" at 28px/800 weight
- Tagline "Unified retail operations" at 14px muted
- Primary CTA button: "GET STARTED"
- Secondary text link: "I have an account -- log in"

## Key Components Used
- PF (Phone Frame wrapper, 430px max, dark bezel with 38px border-radius)
- Btn48 (primary full-width button, 48px height, blue background)
- Logo placeholder (blueLight background, rounded square)

## Data Requirements
- None (static screen)

## User Actions
- Tap "GET STARTED" to begin onboarding flow (navigates to phone number entry)
- Tap "I have an account" to navigate to PIN login screen

## Design Notes
- Uses the warm off-white background (#F5F2EA)
- Generous padding: 70px top, 24px sides
- Logo container: 80x80, border-radius 20px, blueLight background
- The v3.8.1 prototype adds a splash screen variant with a fish emoji and version info ("8 roles, 41 sections, 21 screens")
- v3.8.1 also adds a "Staff Login" option as a third button for device-enrolled staff
