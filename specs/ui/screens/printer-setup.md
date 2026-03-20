# Screen: Printer Setup
> Module: modules/13-settings-and-config.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Configure and test receipt/label printers connected via Bluetooth, WiFi, or USB.

## Layout
- Back button to settings
- Title: "Printer Setup" at 18px/800
- Subtitle: "Epson ePOS - Bluetooth / WiFi / USB" at 12px muted
- Connected printer section:
  - Printer card: icon (40x40 greenLight container), model name, connection type, "Online" badge
- Test section: TEST RECEIPT | TEST LABEL buttons side by side
- Available printers section:
  - Discoverable printer cards: name, connection type, CONNECT button

## Key Components Used
- PF (Phone Frame, active="more")
- BackBtn
- Section (connected, test, available)
- Card (printer items)
- Badge (online status)
- Btn48 (test, connect)

## Data Requirements
- Connected printers: model, connection type, status
- Available/discoverable printers
- Printer test capability

## User Actions
- View connected printer status
- Run test prints (receipt or label)
- Connect to available printers
- Disconnect/reconnect printers

## Design Notes
- Printer icon: 40x40, 12px border-radius, greenLight background, printer emoji at 18px
- Status badge: greenLight background, green text, "Online"
- Test buttons: standard Btn48 side by side with 6px gap
- Available printers: cards with flex space-between, name on left, CONNECT button on right
