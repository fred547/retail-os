# Screen: Web Console — Devices
> Module: modules/12-device-management.md
> Status: built
> Production file: manus-retail-os/client/src/pages/Devices.tsx

## Purpose
Fleet management view showing all enrolled POS devices across stores with status, battery, sync state, and capability profiles.

## Layout
- Header: "Devices" title + "+ ENROLL DEVICE" primary button
- Device table (Glass container):
  - Column headers: DEVICE, STORE, USER, PROFILE, STATUS, BATT, SYNC, (actions)
  - Per-device rows: device ID (800 weight), store, user, profile badge, status badge (Online/Stale/Offline), battery %, last sync time, Revoke link
- Color-coded status: green=Online, amber=Stale, red=Offline

## Key Components Used
- WebShell (sidebar navigation)
- Glass (table container)
- Badge (profile type, status indicators)
- Btn48 (enroll device)

## Data Requirements
- Device list: ID, store, assigned user, capability profile, status, battery %, last sync time
- Device enrollment capability

## User Actions
- View all devices at a glance
- Enroll new device
- Revoke device access
- Identify stale/offline devices

## Design Notes
- Table: Glass container with overflow hidden, 16px border-radius
- Header row: bg background, 10px/800 muted text, 0.04em letter-spacing
- Grid columns: "1fr 1fr 1fr 80px 70px 60px 70px 60px"
- Data rows: 12px font, 8px 14px padding, line border-bottom
- Device ID: 800 weight (bold); other text: muted
- Status badges: greenLight/green for Online, amberLight/amber for Stale, redLight/red for Offline
- Profile badges: blueLight/blueD for POS/Super, gray for unassigned
- Revoke: red text, 11px/800, cursor pointer
