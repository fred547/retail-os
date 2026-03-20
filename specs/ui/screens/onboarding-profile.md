# Screen: Onboarding — Profile Setup
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Collects user profile information (name, photo, emergency contact) during onboarding.

## Layout
- Back button
- Title: "Set up your profile" at 20px/800
- Subtitle: "Your team uses this to identify you" at 13px muted
- Circular photo upload placeholder (72px, blueLight background, "+" icon)
- "Add photo" link in blue
- Form fields: First Name, Last Name, Emergency Contact, Emergency Phone
- Primary CTA: "CONTINUE" full-width button

## Key Components Used
- PF (Phone Frame, no bottom nav)
- BackBtn
- Field (label + bordered input, 42px height, 14px border-radius)
- Btn48 (primary full-width)

## Data Requirements
- User name (first, last)
- Optional photo upload
- Emergency contact details

## User Actions
- Add profile photo
- Fill in name fields
- Add emergency contact (optional)
- Tap "CONTINUE" to proceed to PIN creation

## Design Notes
- Photo placeholder: 72px circle, blueLight background, blue "+" at 26px
- Field labels: 11px/800 weight, muted color, 0.04em letter-spacing, uppercase
- Field inputs: 42px height, 14px border-radius, line border
- v3.8.1 splits this into separate name and brand steps for owner onboarding
