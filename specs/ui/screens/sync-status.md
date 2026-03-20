# Screen: Sync Status
> Module: modules/03-sync-and-offline.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Shows the device's offline sync status: outbox queue, last pull time, push/pull logs with timestamps.

## Layout
- Back button to settings
- Title: "Sync Status" at 18px/800
- Subtitle: "Last sync: 2 minutes ago" at 12px muted
- Two summary cards (2-column grid):
  - OUTBOX (greenLight): pending push count, "Pending push" label
  - LAST PULL (blueLight): time since last pull
- Push log section ("PUSH LOG - DEVICE TO SERVER"):
  - Cards showing pushed data (e.g., "47 orders pushed") + timestamp + OK badge
- Pull log section ("PULL LOG - SERVER TO DEVICE"):
  - Cards showing pulled data (e.g., "Products (142 items)") + timestamp + OK badge
- Primary CTA: "FORCE SYNC NOW" full-width button

## Key Components Used
- PF (Phone Frame, active="more")
- BackBtn
- Glass (summary cards with tinted backgrounds)
- Section (push log, pull log)
- Card (log entries)
- Badge (OK status)
- Btn48 (force sync)

## Data Requirements
- Outbox queue count
- Last pull timestamp
- Push log: action descriptions, timestamps, success/failure
- Pull log: data types pulled, timestamps, success/failure

## User Actions
- Review sync status at a glance
- View push and pull history
- Tap "FORCE SYNC NOW" to trigger immediate sync

## Design Notes
- Summary cards: Glass with tinted background, 12px padding, 12px border-radius
- Outbox: greenLight background, green text; Pull: blueLight background, blueD text
- Values: 22px/800; labels: 10px
- Log cards: compact 8px 10px padding, 4px margin-bottom, flex space-between
