# Screen: Web Console — AI Agent Setup
> Module: modules/15-ai-agents.md
> Status: prototype-only
> Production file: not yet built

## Purpose
Configure which actions AI agents can auto-execute versus which require manager approval.

## Layout
- Title: "AI Agent Setup" at 20px/800
- Warning banner (amberLight): explains the configuration purpose
- Two-panel grid:
  - **Auto-execute panel (Glass, green heading):** List of actions AI can run without approval
    - Create tasks, Assign requests, Trigger sync jobs, Generate summaries, Draft schedules, Prepare discrepancy cases
  - **Requires approval panel (Glass, amber heading):** List of actions needing manager sign-off
    - Issue penalties/warnings, Payroll-impacting actions, Destructive deletions, Terminal revocation, Mass customer comms, Finance overrides

## Key Components Used
- WebShell (sidebar navigation)
- Glass (two permission panels)
- Checkbox-style indicators (18x18 rounded squares with checkmark or exclamation mark)

## Data Requirements
- AI action categories with current permission level
- Action descriptions

## User Actions
- View current AI permission configuration
- Toggle actions between auto-execute and requires-approval (implied)

## Design Notes
- Two-column grid, 14px gap
- Auto-execute: green heading text (14px/800), green checkmark indicators (18x18, green fill, white checkmark)
- Requires approval: amber heading text, amber indicators (18x18, amber fill, white "!")
- Each action row: flex layout with indicator + label, 6px vertical padding, line border-bottom
- Action labels: 13px/700
