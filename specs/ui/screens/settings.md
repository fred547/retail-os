# Screen: Settings
> Module: modules/13-settings-and-config.md
> Status: built
> Production file: manus-retail-os/client/src/pages/Settings.tsx

## Purpose
Device and account settings including user profile, store info, device details, team management, and logout.

## Layout (App.jsx version)
- Title: "Settings" at 18px/800
- User profile card (Glass): avatar + name + role + store
- Settings menu list: Device info, Printer setup, Sync status, Emergency contact, About Posterita, Log out (red text)
- Device info footer: device ID, app version, sync status

### v3.8.1 Expanded Settings
- TopBar: "Settings"
- **Profile card:** Avatar (48px blue circle with initial), name, role, phone number
- **STORE section:** Store name, Brand, Terminal ID, Currency
- **DEVICE section:** Device ID, Enrolled date, Last sync, App version, Printer model
- **TEAM section:** Staff list (4 members) with name and role, "+ Invite Staff" button
- **Sign Out button:** Danger/red variant, full-width

## Key Components Used
- PF / TopBar
- Glass (profile card in App.jsx)
- Card (section cards in v3.8.1)
- Avatar (user avatar)
- Btn / Btn48 (sign out, invite staff)
- Menu list items (clickable rows with right chevron)

## Data Requirements
- User profile: name, role, store, photo
- Device: ID, enrollment date, sync status, app version
- Store: name, brand, terminal, currency
- Team: staff list with names and roles
- Connected peripherals (printer model)

## User Actions
- View profile and device info
- Navigate to printer setup
- Navigate to sync status
- Update emergency contact
- Invite new staff member (v3.8.1)
- Sign out / log out

## Design Notes
- Profile card: Glass component, 14px padding, flex layout with 44px avatar
- Menu items: 12px vertical padding, line border-bottom, flex space-between
- Right chevron: 16px, muted color
- Log out: red text, no chevron
- Footer: panel background, 10px border-radius, 10-12px padding, 11px muted text
- v3.8.1: Card-based sections with key-value rows (flex space-between, 8px padding, line borders)
