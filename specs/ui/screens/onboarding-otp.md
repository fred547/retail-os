# Screen: Onboarding — OTP Verification
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Allows the user to enter the 6-digit verification code sent via WhatsApp.

## Layout
- Back button
- Title: "Verify your number" at 20px/800
- Subtitle: "6-digit code sent to +230 5823 1102" at 13px muted
- Six individual digit boxes in a horizontal row (44x50px each)
- Primary CTA: "VERIFY" full-width button
- "Didn't receive it?" text
- "Resend via WhatsApp" link in blue

## Key Components Used
- PF (Phone Frame, no bottom nav)
- BackBtn
- Btn48 (primary full-width)
- Custom digit input boxes (border: 2px, blue when filled, line color when empty)

## Data Requirements
- OTP validation against server
- Phone number from previous step (displayed in subtitle)

## User Actions
- Enter 6-digit OTP code
- Tap "VERIFY" to validate
- Tap "Resend via WhatsApp" to request new code
- Tap Back to return to phone number entry

## Design Notes
- Digit boxes: 44px wide, 50px tall, border-radius 12px
- Filled digits show blue border (2px solid T.blue), empty show line color border
- Digits displayed at 22px/800 weight
- Center-aligned content throughout
