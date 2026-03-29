/**
 * Knowledge base for the Posterita AI chat assistant.
 * Contains product information, pricing, features, and FAQ answers.
 */

export const KNOWLEDGE_BASE = `
## About Posterita

Posterita POS (also called Posterita Retail OS) is a cloud-based point of sale and business management platform for retail stores, restaurants, and warehouses.

**Company:** Posterita Ltd, 2 Royal Road, Coromandel, Mauritius
**Phone:** +230 232 1079
**Email:** support@posterita.com
**Website:** https://www.posterita.com
**Sign up:** https://web.posterita.com/customer/signup

## Platforms

- **Android** — Native app for phones and tablets. Offline-first (works without internet).
- **Windows / Mac / Linux** — Progressive Web App (PWA) installable from Chrome or Edge. Full offline support.
- **Web Console** — Browser-based admin dashboard for inventory, reports, users, and settings.

## Key Features

1. **POS & Checkout** — Fast product search, barcode scanning, modifiers, split payments, receipts, returns/refunds.
2. **Offline Mode** — Every POS operation works without internet. Data syncs when connectivity returns.
3. **Inventory Management** — Real-time stock levels, low stock alerts, expiry tracking, stock transfers, inventory counts.
4. **Loyalty Program** — Points-based loyalty. Earn and redeem at checkout. Customer wallet and transaction history.
5. **Kitchen Display System (KDS)** — Restaurant order routing to kitchen/bar stations. Bump bar support. LAN-only, no internet needed.
6. **Promotions Engine** — Percentage/fixed discounts, buy-X-get-Y, happy hour, min purchase. Auto-apply at checkout.
7. **Quotations** — Create, send (PDF via email), and convert quotes to orders. 5 professional PDF templates.
8. **Xero Integration** — Sync invoices, payments, credit notes, and journal entries to Xero accounting.
9. **Warehouse Management** — Shelf zones, picking lists, put-away workflows, stock transfers, label printing.
10. **Staff Management** — Shifts (clock in/out), role-based access (owner/admin/supervisor/cashier/staff), PIN unlock.
11. **Multi-Store** — Manage multiple stores from one account. Each store has its own terminals and stock.
12. **Suppliers & Purchase Orders** — Supplier directory, create POs, receive goods (GRN), track deliveries.
13. **Serialized Inventory** — Track items by serial number (VIN, IMEI). Warranty tracking.
14. **Reports** — Z-reports, sales by product/category/tag, revenue charts, stock valuation.
15. **AI Product Import** — Describe your business and AI finds and imports your products automatically.
16. **Customer Management** — Customer directory, purchase history, loyalty points, tags.
17. **Multi-Currency** — Regional pricing support. Currency set per store.
18. **Catalogue PDF** — Generate branded product catalogues as PDF.
19. **Delivery Tracking** — Track delivery status (pending, in-transit, delivered).
20. **Tags & Auto-Tagging** — Classify products/customers/orders with custom tags. Auto-tag rules engine.

## Pricing

Posterita uses regional pricing — the same plan costs less in developing markets.

### Free Plan — $0/month
- 1 user, 1 terminal, 1 store
- Unlimited products, orders, customers
- Offline POS with modifiers
- CSV export, customer management, kitchen printing
- 7-day order history
- "Powered by Posterita" on receipts

### Starter Plan — from $7/month (developing) to $15/month (developed)
- 3 users, 2 terminals per store
- Unlimited everything
- Full inventory management
- Customer management with history
- Shift management (clock in/out)
- 1-year order history
- No Posterita branding on receipts

### Growth Plan — from $19/month (developing) to $39/month (developed)
- 8 users, 5 terminals per store
- Everything in Starter plus:
- Loyalty program
- Promotions engine
- Restaurant mode with table management
- Kitchen Display System (KDS)
- AI product import
- Suppliers & purchase orders
- Quotations
- 3-year order history

### Business Plan — from $39/month (developing) to $79/month (developed)
- 20 users, 10 terminals per store
- Everything in Growth plus:
- Warehouse management
- Xero accounting integration
- Serialized inventory (VIN/IMEI tracking)
- Staff scheduling & roster
- Tower control (multi-store dashboard)
- Priority support
- 5-year order history

### Additional Stores
Each additional store costs the same as your plan price and doubles users & terminals.

## Pricing Comparison

| Feature | Posterita | Square | Shopify POS | Loyverse |
|---------|-----------|--------|-------------|----------|
| Starting price | $0/mo | $0/mo | $89/mo/loc | $0/mo |
| Full POS price | $7/mo | $60/mo/loc | $89/mo/loc | $55/store |
| Transaction fees | 0% | 2.6%+10c | 2.4%-2.7% | 0% |
| Offline mode | Full | Limited | Limited | Yes |
| KDS included | Yes (Growth) | No (add-on) | No | No |
| Warehouse | Yes (Business) | No | No | No |
| Xero integration | Yes (Business) | Limited | No | No |

Posterita charges zero transaction fees. Competitors like Square charge 2.6% + 10 cents per transaction.

## FAQ

**Q: Can I try Posterita for free?**
A: Yes! Sign up at https://web.posterita.com/customer/signup. You get a free plan with unlimited products and orders, plus a demo brand with sample data to explore.

**Q: Does it work offline?**
A: Yes, fully. Every POS operation works without internet on both Android and desktop (PWA). Data syncs automatically when you reconnect.

**Q: What hardware do I need?**
A: Any Android phone/tablet or any computer with Chrome/Edge. For receipts, any ESC/POS-compatible thermal printer (80mm or 58mm). Barcode scanners work via USB or Bluetooth.

**Q: Can I use it for my restaurant?**
A: Yes. The Growth plan includes table management, order types (dine-in, takeaway, delivery), kitchen display system, and preparation station routing.

**Q: How do I migrate from another POS?**
A: You can import products via CSV or use our AI import feature (Growth plan) which finds your products online automatically.

**Q: Is my data secure?**
A: Yes. Data is stored on Supabase (enterprise-grade PostgreSQL). All connections are encrypted. Role-based access control limits who can see what.

**Q: Do you support multiple locations?**
A: Yes. Each plan supports one store by default. Additional stores can be added for the same price as your plan.

**Q: Can I connect my accounting software?**
A: Yes, the Business plan includes Xero integration. QuickBooks and Shopify integrations are on our roadmap.

**Q: What countries do you support?**
A: Posterita works worldwide. Regional pricing makes it affordable everywhere. We have special support for Mauritius MRA e-invoicing compliance.

**Q: How do I get support?**
A: Email support@posterita.com or call +230 232 1079. Business plan customers get priority support.
`;
