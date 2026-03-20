# Workforce
> References: shared/architecture.md, shared/data-model.md

## Overview

The workforce module covers shift planning (templates, selections, approvals), attendance tracking via QR stations, leave management, task assignment, and expense claims. Shifts are template-based with public holiday awareness. Attendance is captured by scanning QR codes at store entrances — instant, no forms.

## Relevant Tables

`shift_template`, `public_holiday`, `shift_selection`, `attendance_log`, `leave_request`, `attendance_event`, `expense_claim`, `asset`, `maintenance_ticket`, `task`

## API Routes

### Shifts

- `POST /v1/shifts/templates` — Create shift template
- `GET /v1/shifts/templates` — List templates for store
- `POST /v1/shifts/selections` — Staff selects a shift
- `POST /v1/shifts/selections/{id}/approve` — Manager approves
- `POST /v1/shifts/selections/{id}/reject` — Manager rejects
- `GET /v1/shifts/schedule?week_start={date}` — Weekly schedule view
- `GET /v1/shifts/holidays` — Public holiday calendar

### Workforce (from v2 §12)

- Attendance, leave, tasks, expenses, asset acceptance, maintenance routes remain from v2.

## Business Rules

### Shift Planning

- Templates define: store, shift code/name, role, day type (weekday/weekend/holiday), time range, max staff count, requires approval
- Staff selects available shifts for the coming week
- Manager approves/rejects selections
- Public holidays (Mauritius 2026 seeded) modify available shift types

### Attendance QR Stations

Every store has QR codes printed at the entrance:

```
┌────────────────────────────┐     ┌────────────────────────────┐
│       ┌──────────┐         │     │       ┌──────────┐         │
│       │ QR CODE  │         │     │       │ QR CODE  │         │
│       │  CHECK   │         │     │       │  CHECK   │         │
│       │   IN     │         │     │       │   OUT    │         │
│       └──────────┘         │     │       └──────────┘         │
│   Scan to clock in         │     │   Scan to clock out        │
│   Grand Baie Store         │     │   Grand Baie Store         │
└────────────────────────────┘     └────────────────────────────┘
```

Staff scans -> app opens -> attendance captured instantly (auto-submit with GPS + timestamp). No form to fill.

The QR token includes an HMAC hash to prevent forgery: `{"t":"att","dir":"in","store":"GB","hash":"HMAC(secret, GB+in)"}`. Backend validates the hash.

### Attendance Sources

- `qr` — QR station scan (primary)
- `manual` — Supervisor manual entry
- `gps` — GPS-based (future)
- `nfc` — NFC tap (future)

## Dependencies

- Platform Bootstrap (auth, roles)
- Android app (`:feature:staff-ops`, `:feature:supervisor`)
- WhatsApp/QR module (attendance QR generation)

## Implementation Notes

- **Phase 0:** Shift planning schema + seed Mauritius 2026 holidays
- **Phase 3:** Workforce module (attendance, leave, tasks, expenses), shift planning, attendance QR stations
- Android modules: `:feature:staff-ops`, `:feature:supervisor`
