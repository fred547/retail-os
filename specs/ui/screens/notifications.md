# Screen: Notifications
> Module: modules/02-home-and-navigation.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Shows a chronological list of system notifications including leave approvals, task assignments, till discrepancies, sync events, and device warnings.

## Layout
- Back button to Home
- Title: "Notifications" at 18px/800
- Scrollable list of notification cards, each containing:
  - Colored status dot (8px circle, left-aligned)
  - Notification title at 13px/800
  - Description at 12px muted, line-height 1.4
  - Timestamp ("10m ago") at 10px muted

## Key Components Used
- PF (Phone Frame, active="home")
- BackBtn
- Card (per notification, 10px 12px padding)

## Data Requirements
- List of notifications with: title, description, timestamp, type/color, target screen

## User Actions
- Tap any notification to navigate to the relevant screen (e.g., till discrepancy goes to close till, task goes to staff ops)
- Tap Back to return to home

## Design Notes
- Each notification uses a Card with flex layout: colored dot + content
- Status dot colors: green (success), blue (info), red (danger), amber (warning)
- Dot: 8px circle, 4px margin-top to align with title text
- Cards have 8px margin-bottom
- Notifications are tappable, each links to a relevant detail screen
