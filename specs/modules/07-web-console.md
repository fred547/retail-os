# Web Console
> References: shared/architecture.md, shared/roles-and-permissions.md

## Overview

The web control console is a Next.js app on Vercel providing back-office operations: device management, approvals, reconciliation, reports, campaigns, operations oversight, procurement, OTB planning, and financial reporting. It communicates with the backend via API and receives live updates via Supabase Realtime.

## Relevant Tables

All tables — the web console provides management interfaces for the entire system.

## API Routes

All backend API routes are consumed by the web console.

## Business Rules

### Sections (26 total)

| Section | Primary Users | Key Functions |
|---|---|---|
| Dashboard | Supervisors, Managers | KPIs, alerts, pending approvals, live inventory count progress |
| Devices | IT Admin, Supervisors | Assign, revoke, monitor heartbeat, push commands |
| Users & Roles | Managers | Invite, assign roles, manage profiles |
| Capabilities | Managers | Create/edit capability profiles, assign to users/devices |
| Stores & Terminals | Managers | Store config, terminal setup, printer assignment, shelf register |
| Products | Managers | Product CRUD, pricing, stock levels, Cloudinary media |
| Reconciliations | Supervisors | Review discrepancies, view evidence, resolve |
| Inventory Counts | Supervisors | Create sessions, register devices, live progress dashboard, dispute resolution |
| Requests | Supervisors | Stationery, pickup, customer item approvals |
| Staff Ops | Supervisors | Attendance review, leave approval, expense approval |
| Shifts | Managers | Shift templates, selections, approval, holiday calendar, QR station config |
| Customers & Loyalty | Managers | Customer lookup, wallet management, voucher management, consent audit |
| Campaigns | Managers | Create/edit campaigns, audience estimation, delivery preview |
| Reports | Managers | All report views with filters, export to CSV/PDF |
| Audit Trail | Managers, Compliance | Searchable audit log with filters |
| Data Compliance | Managers | Customer data deletion requests, consent audit, DPA reporting |
| AI Task Center | Managers | Agent task queue, command approvals, execution log |
| AI Setup | Managers | Configure auto-execute vs approval-required agent actions |
| Logistics | Managers, Drivers | Shipment management, driver assignment, package tracking, delivery templates |
| Operational Supplies | Managers | Non-resale inventory, reorder alerts, warehouse dispatch |
| Procurement | Purchasers, Managers | Sourcing requirements, RFQ management, vendor comparison, PO creation/approval, freight document tracking, pipeline dashboard |
| OTB Planning | Merchandiser, Managers | Selling period calendar, OTB budget entry per category/period, OTB burn-down chart, revised OTB in-season tracker |
| Stock Cover | Merchandiser, Managers, Supervisors | Stock months heatmap per store x category, warehouse forward cover, category-level stock cover targets |
| Arrival Timeline | Merchandiser, Purchasers, Managers | Gantt-style PO arrival chart, must-order-by alerts, ETA slip warnings, period-tagged color coding |
| Vendors | Purchasers, Managers | Vendor directory, verification status, AI augmentation panel, order history, payment terms |
| Exchange Rates | Managers, Accountant | Currency rate management, historical rates, rate source tracking |
| Redemption Marketplace | Managers | Catalog item management, redemption transactions, commission reports, featured placement |
| Financial Overview | Accountant, Managers | Cost reports, landed cost breakdowns, margin analysis, loyalty liability |

### Phased Rollout

**MVP (Phase 2-3):** Dashboard, Devices, Users & Roles, Stores, Products, Reconciliations, Inventory Counts, Customers & Loyalty, Reports, Audit Trail

**Phase 4:** Staff Ops, Shifts, Campaigns, AI Task Center, Data Compliance, AI Setup, Procurement, Vendors, OTB Planning, Stock Cover, Arrival Timeline

**Post-MVP:** Capabilities (merged into Users & Roles initially), Requests (merged into Staff Ops initially), Exchange Rates, Redemption Marketplace, Financial Overview

**Note:** OTB Planning, Stock Cover, and Arrival Timeline can be implemented as sub-tabs within a single "Merchandise Planning" section.

## UX Flows

### Section 14: UI and UX Direction

- **Android Home Screen:** Role-first, capability-driven tile visibility
- **Product Display:** Two view modes (compact list / visual grid), persistent search, stock indicator bars, frequent items chip, category color accents

## Dependencies

- Backend platform (all API endpoints)
- Supabase Realtime (live dashboard updates)
- Cloudinary (media display)

## Implementation Notes

- **Phase 2:** Dashboard, devices, users, stores, products, reconciliation, inventory count live dashboard, customer/loyalty management
- **Phase 3:** Staff ops, shifts, campaigns, reports, audit trail, compliance, AI task center, logistics dashboard, containers, purchase orders, claims
