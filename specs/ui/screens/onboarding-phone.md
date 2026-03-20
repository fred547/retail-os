# Screen: Onboarding — Phone Number Entry
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Collects the user's phone number for WhatsApp-based OTP verification during onboarding.

## Layout
- Back button at top left ("Back" with left chevron, blue text)
- Title: "Enter your phone number" at 20px/800
- Subtitle: "We will send a verification code via WhatsApp" at 13px muted
- Country code selector: "+230" in a bordered panel box
- Phone number input field alongside country code
- Helper text: "OTP will be sent via WhatsApp" at 11px muted
- Primary CTA: "SEND CODE" full-width button

## Key Components Used
- PF (Phone Frame, no bottom nav)
- BackBtn (back navigation, blue text with left chevron)
- Btn48 (primary full-width)
- Inline form fields with panel background

## Data Requirements
- Country code list (default: +230 for Mauritius)
- Phone number validation

## User Actions
- Enter phone number
- Tap "SEND CODE" to trigger WhatsApp OTP
- Tap Back to return to welcome screen

## Design Notes
- Country code and phone input are side by side with 8px gap
- Both inputs use panel background (#FAFAFA), 14px border-radius, 1px line border
- Font size 15px/700 for input display
- v3.8.1 uses a single large input field approach instead
