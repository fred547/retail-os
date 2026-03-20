# Screen: Shift Planning
> Module: modules/08-staff-management.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Weekly shift schedule view showing staff assignments per day, with public holiday awareness.

## Layout
- TopBar: "Shift Planning" + "Week of 17 Mar 2026" subtitle
- Day selector: horizontal scroll row of day pills (Mon-Sun), current day highlighted in blue
- Today's heading: "Wed 19 - Today" at 13px/700
- Shift cards for selected day: each shows:
  - Staff avatar (32px circle, blueLight, initial letter)
  - Staff name at 13px/700
  - Time slot pill: "08:00-16:00" in blueLight/blue styling
- Public holidays card: list of upcoming holidays
- CTA: "+ Create Shift Template" button

## Key Components Used
- TopBar
- Day pill selector (horizontal scroll, 56px min-width each)
- Card (shift assignments, holidays)
- Avatar-style initials circles
- Btn (create template)

## Data Requirements
- Weekly shift schedule: day -> staff assignments with time slots
- Staff list with names
- Public holiday calendar (Mauritius-specific)

## User Actions
- Tap day pills to view different days' schedules
- View shift assignments for selected day
- Create new shift template

## Design Notes
- Day pills: 56px min-width, 8px 6px padding, 14px border-radius
- Selected day: blue background, white text; others: paper background, ink text, line border
- Shift cards: 24px border-radius, flex space-between, avatar + name on left, time slot pill on right
- Time slot pill: 12px/600 blue text, blueLight background, 4px 10px padding, 8px border-radius
- Holiday items: bullet-point list, 12px muted text
