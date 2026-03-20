# Screen: Logistics — Deliveries
> Module: modules/16-logistics.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Track inter-store and customer deliveries with real-time status, driver assignment, and COD (cash on delivery) tracking.

## Layout

### Shipment List
- TopBar: "Logistics" + "Deliveries & packages" subtitle
- Shipment cards: each shows:
  - Shipment ID (14px/700) and destination (12px muted)
  - Item count and driver name
  - Status pill (In Transit/Ready/Delivered)
  - COD amount in amber (if applicable)

### Shipment Detail (on tap)
- TopBar: shipment ID + destination
- Delivery progress stepper (vertical):
  - Steps: Pickup from store, In transit, Arrive at destination, Customer handover, Cash collected
  - Completed steps: green circles with checkmark; pending: gray numbered circles
- COD warning card (amberLight): amount to collect
- "Complete: [next step]" button or "Delivery Complete" success button

## Key Components Used
- TopBar
- Card (shipment items)
- StatusPill (shipment status)
- Progress stepper (vertical, custom)
- Btn (complete step, success variant)

## Data Requirements
- Shipments: ID, destination, item count, status, driver, COD amount
- Delivery step progress

## User Actions
- View all shipments
- Tap shipment for detail
- Advance delivery through steps
- Complete delivery (marks cash collected if COD)

## Design Notes
- Status pills: green for Delivered, blue for In Transit, amber for Ready
- COD card: amberLight background, amber 33% opacity border
- Progress stepper: 24px circles, 12px gap between steps
- Completed steps: green fill, white checkmark 10px/800
- Current step: 700 weight, ink color; future: 400 weight, muted
