# Roles and Permissions

> Extracted from Posterita Master Plan v3.9 — Section 6 (Roles & Permissions)

---

## Roles & Permissions Matrix

| Capability | Owner | Admin | Purchaser | Merchandiser | Accountant | Supervisor | Driver | Cashier |
|---|---|---|---|---|---|---|---|---|
| Create brands/stores | Y | | | | | | | |
| Invite admins | Y | | | | | | | |
| Invite staff | Y | Y | | | | | | |
| Manage products | Y | Y | | Y | | | | |
| Run AI enrichment | Y | Y | | Y | | | | |
| Approve AI suggestions | Y | Y | | Y | | | | |
| Container receiving & inspection | Y | Y | | Y | | | | |
| Manage purchase orders | Y | Y | Y | Y | | | | |
| Upload container documents | Y | Y | Y | Y | | | | |
| Release stock to stores | Y | Y | | Y | | | | |
| Configure loyalty | Y | Y | | | | | | |
| View all stores | Y | Y | Y | Y | Y | | | |
| Approve leave/expense | Y | Y | | | | Y | | |
| Resolve discrepancies | Y | Y | | | | Y | | |
| Logistics / deliveries | Y | Y | | | | Y | Y | |
| Cash collection transport | Y | | | | | | Y | |
| POS operations | Y | Y | | | | Y | | Y |
| Inventory count | Y | Y | | Y | | Y | | Y |
| Barcode My Store | Y | Y | | Y | | | | |
| Create sourcing requirements | Y | Y | Y | | | | | |
| Send RFQs | Y | Y | Y | | | | | |
| Accept quotes -> create PO | Y | Y | Y | | | | | |
| Approve purchase orders | Y | Y | | | | | | |
| Create/edit selling periods | Y | Y | | Y | | | | |
| Set OTB budgets | Y | Y | | Y | | | | |
| View OTB burn-down | Y | Y | Y | Y | Y | | | |
| View stock cover dashboard | Y | Y | Y | Y | Y | Y | | |
| View arrival timeline | Y | Y | Y | Y | | | | |
| Override OTB warning on PO | Y | Y | | | | | | |
| Lock/close selling period | Y | Y | | | | | | |
| View financials / cost reports | Y | Y | | | Y | | | |
| Manage redemption catalog | Y | Y | | | | | | |
| View own data | Y | Y | Y | Y | Y | Y | Y | Y |

---

## Role Descriptions

**Merchandiser** is the person who manages the product pipeline: receiving containers, inspecting goods, processing import documents, maintaining product data quality, managing cost prices, and releasing stock to stores. They are the gatekeeper between the warehouse and the retail floor. They also own the OTB planning process: setting selling periods, defining budgets per category/period, monitoring stock cover across stores, and adjusting intake plans based on sell-through performance.

**Purchaser** is responsible for the procurement pipeline: identifying sourcing needs, requesting quotes from vendors, evaluating vendor proposals, converting accepted quotes into purchase orders, and managing the vendor communication lifecycle. They work closely with the Merchandiser (who handles the physical goods once they arrive) and the Owner/Admin (who approves purchase orders above threshold).

**Accountant** has read-only access to financial data: cost reports, landed cost breakdowns, margin analysis, container cost summaries, PO totals, and loyalty liability reports. They cannot create or modify operational records. This role exists so the finance team can access Retail OS data without export-only workflows via Xero.
