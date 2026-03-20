# Screen: Onboarding — Device Enrollment
> Module: modules/01-onboarding-and-enrollment.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Enrolls the physical device to a specific store by scanning a supervisor-provided QR code.

## Layout
- Back button
- Title: "Enroll this device" at 20px/800
- Subtitle: "Ask your supervisor for the QR code" at 13px muted
- QR scanner area: 200x200px dashed border square with camera icon
- "Tap to simulate scan" hint text
- Glass info card explaining what enrollment does:
  - Link device to your store
  - Download capability profile
  - Sync product catalog

## Key Components Used
- PF (Phone Frame, no bottom nav)
- BackBtn
- Glass (glassmorphism card, 12-16px padding, 14px border-radius)
- QR scanner placeholder

## Data Requirements
- QR code containing store ID and enrollment token
- Device capability profile to download post-enrollment

## User Actions
- Point camera at QR code (or tap to simulate)
- Enrollment happens automatically on successful scan
- Navigates to home screen after enrollment

## Design Notes
- QR scan area: 200x200, border-radius 20px, dashed blue border with 60% opacity, blue tint background at 8%
- Info card uses Glass component with blueLight styling
- Info text: 11px/800 blueD color for headers, 12px blueD for bullet points
- v3.8.1 does not have a separate enrollment screen; enrollment is part of the onboarding wizard
