# Migration Context

> Extracted from Posterita Master Plan v3.9 — Sections 2, 10

---

## 2. Current State and Migration Context

### What Exists Today

| System | Role Today | Fate in Unified Platform |
|---|---|---|
| Posterita Android POS (playground) | Early-stage POS codebase with initial work done. Not production — no live stores, no historical transaction data to preserve. | Evaluate for reusable code (layouts, Blink integration patterns, scanner handling). Adopt good patterns into the new architecture. Rebuild what doesn't fit. Architecture > preservation. |
| Posterita Brand Portal (Next.js on Vercel) | Brand operations console: 13 sections (products, catalogue PDF, points, staff, shifts, campaigns, audience/consent, vouchers, operations health, billing), connected to 21 Zoho Creator reports | Absorbed into unified web console; Vercel portal instance retired |
| Zoho Creator | Source of truth for 21 operational reports: products, wallets, ledger, consent, staff, shifts, attendance, campaigns, vouchers, stores, holidays, admin log | All data modeled fresh in Supabase. Creator retired as data store. |
| Loyalty Flask API (Vercel) | Proxy layer between brand portal and Zoho Creator; blueprints for balance, award, consent, voucher | Retired. Business logic moves to NestJS backend modules. |
| Zobot WhatsApp scripts (SalesIQ) | 1,228-line customer-facing bot: enrollment, consent, points, name update, catalogue, agent transfer. Two variants (Posterita loyalty + Yadea showroom). | Bot logic moves to backend. SalesIQ stays as WhatsApp middleware. Zobot becomes a thin 50-line relay. |
| Zoho CRM | Contains test contact data, custom modules (Loyalty_Points, Loyalty_Transactions), and consent fields. NOT live production data — was a playground. | **Not a migration source.** Becomes one-way sync target: backend pushes customer/loyalty status so SalesIQ support team can see context. |
| Xero | Accounting system of record | No change; reconciliation exports built as needed |
| Cloudinary | Product images, catalogue assets | Retained; same role in unified platform |

### What the portal prototype reveals

The brand portal at loyalty.posterita.com is more sophisticated than initially described — it has 13 working sections with live Creator data. However, it's a **prototype/playground**, not production. Key evidence:

- Only 9 products (all Yadea electric vehicles, not Funky Fish retail)
- Only 2 loyalty wallets with small test balances (320 pts total)
- 1 staff record, 1 admin number
- Campaigns are drafts (queue tables "still need to go live")
- Billing is sandbox (Paddle keys missing)
- Voucher table is empty
- Audience shows only 4 consent rows, all for the same phone number

**This means:** We don't need to migrate data from Creator/CRM. We build the Supabase schema from scratch, informed by the portal's data model but not constrained by its test data. Fresh start.

### Migration Approach (simplified from v2)

Since there's no production loyalty/shift/campaign data in Creator or CRM:

1. **No data migration needed** from Zoho Creator or CRM — build fresh in Supabase
2. **Android app migration** follows the incremental refactor approach (wrap existing POS, build shell around it)
3. **Reference data seeding** — products, stores, staff, Mauritius public holidays entered fresh or imported via CSV
4. **Dual-write is unnecessary** — no legacy system to keep in sync during transition

### Remaining Migration Constraints

- **Stores are live.** The current Android app is running in production. Every refactoring step must keep the current app shippable.
- **Staff must not retrain twice.** The new app should feel familiar to cashiers. UX changes should be evolutionary.

---

## 10. Data Migration Strategy (simplified)

Since Zoho Creator and CRM contain only playground/test data, migration is dramatically simpler than v2 described.

### What Needs to Happen

| Step | Action | Effort |
|---|---|---|
| Supabase schema deployment | Run migration scripts against fresh database | Automated |
| Reference data seeding | Products, categories, stores, terminals from CSV or manual entry | 1-2 days |
| Staff records | Users, roles, capabilities from CSV or manual entry | 1 day |
| Public holidays | Seed 15 Mauritius 2026 holidays (data already available from portal) | Minutes |
| Shelf register | Bulk creation via API once store layout is mapped | Per-store setup |
| Android app transition | Incremental: wrap legacy -> add shell -> swap endpoints | Phased over weeks |

### What Does NOT Need to Happen

- ~~Migrate loyalty wallets from Creator~~ (only 2 test wallets)
- ~~Migrate customer contacts from CRM~~ (test data)
- ~~Migrate transaction history from Flask~~ (proxy layer, no local data)
- ~~Dual-write period~~ (no legacy system to keep in sync)
- ~~Data reconciliation reports~~ (nothing to reconcile)

### Android POS historical data

I haven't seen the Android POS codebase. There may be historical transaction data in the Android Room database or in whatever backend the current app talks to.

**Question for Fred:** Does the current POS Android app store order history anywhere besides the local Room database? Is there a server it syncs to today?
