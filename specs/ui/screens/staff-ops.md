# Screen: Staff Operations
> Module: modules/08-staff-management.md
> Status: prototype-only
> Production file: manus-retail-os/client/src/pages/Staff.tsx (partial)

## Purpose
Daily staff assistant showing attendance status, task list, request shortcuts (leave, expense, stationery, pickup, customer item, maintenance), and recent request statuses.

## Layout (App.jsx version)
- Back button to home
- Title: "Staff Ops" at 18px/800
- Subtitle: "Your daily assistant" at 12px muted
- Check-in status banner: greenLight background showing check-in time + CHECK OUT button
- 3x2 grid of request shortcuts: Leave, Expense, Stationery, Pickup, Cust. Item, Maint. (emoji icons)
- "MY TASKS" section: task list with checkbox, title, due time, and urgency badge
- "RECENT REQUESTS" section: request cards with title and status badge (Approved/Pending/Signed)

### v3.8.1 Expanded (Tabbed)
- **Attendance tab:** Today's attendance summary (3/4 checked in), staff list with check-in times, QR attendance station card
- **Leave tab:** Leave requests with approve/decline buttons
- **Expenses tab:** Expense claims with amounts and status

## Key Components Used
- PF (Phone Frame, active="tasks")
- BackBtn / TopBar
- Card (task items, request items, shortcuts)
- Badge (urgency, status)
- Section (titled sections)
- Btn48 / Btn (CHECK OUT, Approve, Decline)
- ProgressBar (attendance progress in v3.8.1)
- ListRow (staff attendance in v3.8.1)
- StatusPill (Present/Absent in v3.8.1)

## Data Requirements
- User's attendance status (check-in time)
- Task list: title, due time, priority/urgency
- Recent requests: type, status, details
- Staff attendance list (v3.8.1)
- Leave requests and expense claims (v3.8.1)

## User Actions
- Check out from shift
- Tap a request shortcut to create new request
- View and manage tasks (mark complete)
- View request status
- Approve/decline leave and expenses (supervisor role, v3.8.1)

## Design Notes
- Check-in banner: greenLight background, 12px border-radius, flex space-between
- Request shortcuts: 3-column grid, Card component with centered emoji + label
- Task items: compact Cards with checkbox (16x16, 4px border-radius, red border for urgent)
- v3.8.1 attendance: QR code station card with blueLight background, centered QR icon
