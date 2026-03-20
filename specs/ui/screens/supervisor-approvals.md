# Screen: Supervisor — Approval Cockpit
> Module: modules/08-staff-management.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Centralized approval screen for supervisors to review and act on pending leave requests, expense claims, discrepancy reports, and stationery requests.

## Layout
- Back button to home
- Title: "Supervisor" at 18px/800
- Subtitle: "Approval cockpit" at 12px muted
- Summary counters: 3-column glass cards showing pending counts (Leave, Expense, Recon)
- Approval queue: scrollable list of approval cards, each showing:
  - Staff name and request type at 12px/800
  - Details at 10px muted
  - Action buttons: APPROVE (green) | REJECT (red) | VIEW (neutral)
- Quick actions: 2-column grid of action cards (Checklist, Shifts, Tasks, Warning)

## Key Components Used
- PF (Phone Frame, active="tasks")
- BackBtn
- Glass (summary counter cards)
- Card (approval items, quick actions)
- Section (titled sections)
- Inline action buttons (styled as small pill buttons with colored backgrounds)

## Data Requirements
- Pending approval counts by type
- Approval queue: staff name, request type, details
- Quick action availability

## User Actions
- View pending counts at a glance
- Tap APPROVE to approve a request
- Tap REJECT to reject a request
- Tap VIEW for more details
- Access quick actions: checklist, shifts, tasks, warning issuance

## Design Notes
- Counter cards: Glass component, 10px padding, 12px border-radius, centered layout
- Counter value: 20px/800 in the relevant color; label: 10px/700 muted
- Approval buttons: small inline pills (4px 12px padding, 8px border-radius)
  - APPROVE: greenLight background, green text
  - REJECT: redLight background, red text
  - VIEW: panel background, muted text, line border
- Quick action cards: flex layout with emoji icon + label
