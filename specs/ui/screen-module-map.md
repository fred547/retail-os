# Screen to Module Map

Quick reference mapping of all UI screens to their parent module spec and current build status.

## Status Key
- **built** — Exists in manus-retail-os production codebase
- **prototype-only** — Exists in prototypes but not yet in production
- **spec-only** — Defined in specs but no prototype or build

## Mobile App Screens

| Screen | Spec File | Module | Status | Source |
|--------|-----------|--------|--------|--------|
| Welcome | screens/onboarding-welcome.md | 01-onboarding | prototype-only | App.jsx, v3.8.1 |
| Phone Entry | screens/onboarding-phone.md | 01-onboarding | prototype-only | App.jsx, v3.8.1 |
| OTP Verification | screens/onboarding-otp.md | 01-onboarding | prototype-only | App.jsx, v3.8.1 |
| Profile Setup | screens/onboarding-profile.md | 01-onboarding | prototype-only | App.jsx |
| PIN Creation | screens/onboarding-pin.md | 01-onboarding | prototype-only | App.jsx, v3.8.1 |
| Device Enrollment | screens/onboarding-enroll.md | 01-onboarding | prototype-only | App.jsx |
| AI Store Setup | screens/onboarding-ai-setup.md | 01-onboarding | prototype-only | v3.8.1 only |
| Login (PIN) | screens/login.md | 01-onboarding | prototype-only | App.jsx, v3.8.1 |
| Home Dashboard | screens/home.md | 02-home-nav | built | App.jsx, v3.8.1, Home.tsx |
| Notifications | screens/notifications.md | 02-home-nav | prototype-only | App.jsx |
| POS Product Selection | screens/pos-main.md | 04-pos | built (partial) | App.jsx, brand-preview, v3.8.1 |
| POS Cart Sheet | screens/pos-cart.md | 04-pos | prototype-only | App.jsx, brand-preview |
| POS Payment | screens/pos-payment.md | 04-pos | prototype-only | App.jsx, v3.8.1 |
| POS Receipt | screens/pos-receipt.md | 04-pos | prototype-only | App.jsx, v3.8.1 |
| POS Product Detail | screens/pos-product-detail.md | 04-pos | prototype-only | App.jsx |
| POS Refund | screens/pos-refund.md | 04-pos | prototype-only | App.jsx |
| POS Held Orders | screens/pos-holds.md | 04-pos | prototype-only | App.jsx |
| POS Order History | screens/pos-order-history.md | 04-pos | built (partial) | App.jsx, Orders.tsx |
| POS Tablet Split | screens/pos-tablet.md | 04-pos | prototype-only | brand-preview |
| Till Open | screens/till-open.md | 05-till-recon | built (partial) | App.jsx, TillSessions.tsx |
| Till Close/Recon | screens/till-close.md | 05-till-recon | built (partial) | App.jsx, TillSessions.tsx |
| Inventory Main | screens/inventory-list.md | 06-inventory | built (partial) | App.jsx, Inventory.tsx |
| Inventory Count | screens/inventory-count.md | 06-inventory | prototype-only | v3.8.1 |
| Barcode My Store | screens/barcode-my-store.md | 06-inventory | prototype-only | v3.8.1 only |
| Loyalty Lookup | screens/loyalty-lookup.md | 07-loyalty | prototype-only | App.jsx |
| Loyalty Wallet | screens/loyalty-wallet.md | 07-loyalty | built (partial) | App.jsx, v3.8.1, Loyalty.tsx |
| Staff Operations | screens/staff-ops.md | 08-staff | built (partial) | App.jsx, v3.8.1, Staff.tsx |
| Supervisor Approvals | screens/supervisor-approvals.md | 08-staff | prototype-only | App.jsx |
| Shift Planning | screens/shift-planning.md | 08-staff | prototype-only | v3.8.1 only |
| WhatsApp Templates | screens/whatsapp-templates.md | 09-whatsapp | built (partial) | v3.8.1, WhatsApp.tsx |
| Catalogue Browser | screens/catalogue-browser.md | 10-catalogue | prototype-only | v3.8.1 only |
| AI Chat | screens/ai-chat.md | 15-ai | prototype-only | v3.8.1 only |
| Logistics | screens/logistics.md | 16-logistics | prototype-only | v3.8.1 only |
| Cash Collection | screens/cash-collection.md | 05-till-recon | prototype-only | v3.8.1 only |
| Warehouse | screens/warehouse.md | 17-warehouse | prototype-only | v3.8.1 only |
| Procurement | screens/procurement.md | 18-procurement | prototype-only | v3.8.1 only |
| Marketplace | screens/marketplace.md | 07-loyalty | prototype-only | v3.8.1 only |
| Financials | screens/financials.md | 19-financials | built (partial) | v3.8.1, Analytics.tsx |
| Settings | screens/settings.md | 13-settings | built | App.jsx, v3.8.1, Settings.tsx |
| Sync Status | screens/sync-status.md | 03-sync | prototype-only | App.jsx |
| Printer Setup | screens/printer-setup.md | 13-settings | prototype-only | App.jsx |

## Web Console Screens

| Screen | Spec File | Module | Status | Source |
|--------|-----------|--------|--------|--------|
| Web Dashboard | screens/web-dashboard.md | 02-home-nav | built | App.jsx, brand-preview, Dashboard.tsx |
| Web Devices | screens/web-devices.md | 12-devices | built | App.jsx, Devices.tsx |
| Web Reconciliation | screens/web-reconciliation.md | 05-till-recon | prototype-only | App.jsx |
| Web Audit Trail | screens/web-audit-trail.md | 14-audit | prototype-only | App.jsx |
| Web AI Setup | screens/web-ai-setup.md | 15-ai | prototype-only | App.jsx |
| OTB Dashboard | screens/otb-dashboard.md | 11-otb | prototype-only | otb-dashboard.jsx |

## Production Pages Without Specs (in manus-retail-os)

These pages exist in production but do not have corresponding prototype screens:

| Page | File | Notes |
|------|------|-------|
| Customers | Customers.tsx | Customer list/management |
| Customer Detail | CustomerDetail.tsx | Individual customer view |
| Stores | Stores.tsx | Multi-store management |
| Component Showcase | ComponentShowcase.tsx | Dev tool for component preview |
| Not Found | NotFound.tsx | 404 error page |

## Screen Count Summary

| Category | Count |
|----------|-------|
| Mobile screens specced | 38 |
| Web console screens specced | 6 |
| **Total screens specced** | **44** |
| Built in production | 17 pages |
| Prototype-only | ~30 screens |
| v3.8.1 exclusive | 12 screens |
