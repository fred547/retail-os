# Posterita Retail OS — Project TODO

## Database & Schema
- [x] Core schema: users (extended roles), stores, devices, device_sessions
- [x] Commerce schema: products, categories, product_variants, price_rules
- [x] Inventory schema: inventory_levels, stock_adjustments, stock_counts, warehouses
- [x] Customer schema: customers, customer_addresses, customer_preferences
- [x] Loyalty schema: loyalty_accounts, loyalty_transactions, loyalty_tiers, loyalty_milestones
- [x] Orders schema: orders, order_items, payments, refunds, till_sessions
- [x] Messaging schema: whatsapp_messages, whatsapp_templates, notification_log
- [x] Staff/HR schema: staff_profiles, shifts, leave_requests, expenses, warnings, tasks
- [x] Assets schema: assets, asset_assignments, maintenance_logs
- [x] Marketing schema: campaigns, campaign_products, vouchers, voucher_redemptions

## Backend API (tRPC Routers)
- [x] Inventory router (CRUD products, categories, stock adjustments, low-stock alerts)
- [x] Customer router (CRUD profiles, search, purchase history, preferences)
- [x] Loyalty router (points balance, earn/redeem, milestones, tier management)
- [x] Order router (create order, list orders, order details, refunds, till sessions)
- [x] Device router (register device, list devices, revoke, QR provisioning)
- [x] Staff router (list staff, assign roles, device permissions, shifts)
- [x] Analytics router (sales summary, top products, revenue trends, customer insights)
- [x] WhatsApp router (send receipt, send loyalty update, log messages, templates)
- [x] RBAC middleware (admin/manager/staff/customer)

## Frontend — Admin Dashboard
- [x] Dashboard layout with sidebar navigation and dark professional theming
- [x] Analytics overview page (KPIs, charts, recent activity)
- [x] Inventory management page (product table, filters, add/edit product dialog)
- [x] Stock levels page (real-time stock, low-stock alerts, adjustment history)
- [x] Customer CRM page (customer list, search, profile detail with tabs)
- [x] Loyalty management page (points overview, tier config, milestone notifications)
- [x] Order management page (order list, order detail, status tracking)
- [x] POS / Till management page (till sessions, close-till, reconciliation)
- [x] Device management page (device list, QR provisioning, revoke access)
- [x] Staff management page (staff list, role assignment, shifts)
- [x] WhatsApp integration page (message logs, templates, conversation view)
- [x] Settings page (store config, notification preferences)

## Testing
- [x] Vitest tests for inventory procedures
- [x] Vitest tests for customer/loyalty procedures
- [x] Vitest tests for order procedures
- [x] Vitest tests for RBAC and authre
