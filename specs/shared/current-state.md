# Current State — Posterita Retail OS

> Last updated: 2026-03-28. Reflects actual production state, not aspirational plans.

---

## Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Android | Kotlin, Room v35, Hilt, Coroutines, WorkManager, ZXing | Production |
| Web Console | Next.js 16, App Router, Vercel | Production |
| Web POS | PWA, IndexedDB (Dexie v3), offline-first | Production |
| Backend | Express/Node.js on Render | Production |
| Database | Supabase Postgres, RLS on all tables | Production |
| Auth | Supabase Auth + OTT tokens + PIN | Production |
| AI | Claude Haiku 4.5 + Sonnet 4.6 | Production |
| Images | Cloudinary | Production |
| Integrations | Xero (OAuth 2.0, granular scopes) | Production |
| CI/CD | GitHub Actions (web + Android + E2E) | Production |

## Database Tables (49 migrations, 45+ tables)

### Core
| Table | PK | Purpose |
|-------|-----|---------|
| account | account_id (TEXT) | Brand/business entity |
| owner | id (SERIAL) | Person who owns brands |
| store | store_id (SERIAL) | Physical location, has store_type (retail/warehouse) |
| terminal | terminal_id (SERIAL) | Device assignment, has terminal_type |
| pos_user | user_id (SERIAL) | Staff member with role + PIN |

### Products & Catalogue
| Table | Purpose |
|-------|---------|
| product | 30+ columns: price, cost, tax, stock, serial, shelf, expiry, batch |
| productcategory | Nested categories (parent_category_id, level) |
| tax | Tax rates per brand |
| modifier | Product/category modifiers |
| tag_group | Tag groups (Season, Margin, Dietary) |
| tag | Tags within groups |
| product_tag | Product ↔ tag (many-to-many) |
| customer_tag | Customer ↔ tag |
| order_tag | Order ↔ tag |

### Transactions
| Table | Purpose |
|-------|---------|
| orders | Sales orders with UUID, document_no, grand_total |
| orderline | Line items (now has account_id) |
| payment | Cash/card/split payments (now has account_id) |
| till | Till open/close lifecycle |

### Inventory & Warehouse
| Table | Purpose |
|-------|---------|
| inventory_count_session | Spot check / full count sessions |
| inventory_count_entry | Scanned items with variance |
| stock_journal | Audit trail for every stock change |
| serial_item | VIN/IMEI tracked items with warranty |
| store_layout_zone | Shelf ranges + height labels per store |

### Supply Chain
| Table | Purpose |
|-------|---------|
| supplier | Supplier directory |
| purchase_order | PO header with status workflow |
| purchase_order_line | PO line items |
| delivery | Delivery tracking (7-step status) |

### Operations
| Table | Purpose |
|-------|---------|
| promotion | 4 types: percentage, fixed, BOGO, promo code |
| promotion_usage | Usage tracking per order |
| menu_schedule | Time-based category filtering |
| shift | Staff clock in/out with break tracking |
| loyalty_config | Points earn/redeem rates per brand |
| loyalty_transaction | Points history (earn/redeem/adjust) |

### Restaurant
| Table | Purpose |
|-------|---------|
| restaurant_table | Table management with occupancy |
| table_section | Zones (Indoor, Patio, Bar, Takeaway) |
| preparation_station | Kitchen/bar/dessert stations |
| category_station_mapping | Category → station routing |

### Integrations
| Table | Purpose |
|-------|---------|
| integration_connection | OAuth tokens per provider (Xero) |
| integration_event_log | Audit trail of every push to external systems |

### System
| Table | Purpose |
|-------|---------|
| error_logs | All errors from all sources (Android, web, API) |
| sync_request_log | Sync request audit trail |
| registered_device | Device enrollment registry |
| account_lifecycle_log | Account status transition audit |
| owner_account_session | Owner ↔ brand session management |

## Android Architecture

```
:app (42 activities, 176 XML layouts)
  ├── 6-app home: POS, Warehouse, CRM, Logistics, Admin, Sync
  ├── Warehouse hub: picking, put-away, shelf browser, stock transfer, multi-store view
  ├── CRM hub: customers, loyalty
  ├── Logistics hub: delivery tracking
  └── Contextual help (? button on 8 screens)

:core:database (42 entities, 40 DAOs, Room v35, 31 migrations)
:core:common (SharedPreferencesManager, utilities)
:core:network (Retrofit APIs, request/response models)
:core:sync (CloudSyncService, CloudSyncWorker)
```

## Web Console Pages (148 routes)

### Sidebar Sections
- **Catalogue:** Products, Categories, Tags, Price Review, AI Import, Intake, PDF Catalogue
- **Sales:** Orders, Quotations, Tills, Customers, Loyalty, Shifts, Deliveries, Promotions, Reports
- **Restaurant:** Tables, Stations, Menu Schedules
- **Inventory:** Stock Counts, Serial Items, Suppliers, Purchase Orders, Store Layout
- **Setup:** Stores, Terminals, Users, Brands, Integrations, Settings
- **System:** Errors, Sync Inbox

### Key Features
- Collapsible sidebar with smart feature gating
- Drag-and-drop reordering (categories, zones)
- Bulk select + actions on products
- CSV export on Products + Orders
- Inline price editing
- Keyboard shortcuts (/ to search)
- Confirm dialogs on all destructive actions
- Toast feedback on all save/delete
- Multi-currency (brand-specific, not hardcoded)

## API Routes (32 domains)

| Domain | Key Endpoints |
|--------|-------------|
| auth | signup, login, check, reset, ott |
| sync | POST (push+pull), register, replay |
| data | POST (read proxy), insert, update, delete |
| account | CRUD, create-demo, lifecycle |
| owner | CRUD, accounts |
| tags | groups CRUD, tags CRUD, assign, report |
| stock | GET (overview), POST (adjustment) |
| store-layout | zones CRUD |
| integrations | list, xero/connect, xero/callback, xero/disconnect, xero/settings, xero/push |
| deliveries | CRUD, status transitions |
| shifts | clock in/out, list |
| suppliers | CRUD |
| purchase-orders | CRUD, GRN receive |
| promotions | CRUD, validate |
| menu-schedules | CRUD, active filter |
| loyalty | config, wallets, transactions |
| catalogue | PDF generation |
| monitor | health checks |

## Integrations

### Xero (Production)
- OAuth 2.0 with granular scopes (post-March 2026)
- Invoice push with line items, tax mapping, discounts, tips
- Payment push (cash → cash account, card → card clearing)
- Credit note for refunds
- Journal entry for cash variance
- Configurable account mapping (7 accounts + tax mapping)
- Token auto-refresh (30-min Xero expiry)

### Planned
- QuickBooks
- Shopify
- Webhook framework

## Test Suite (1,569 tests)

| Suite | Tests | Platform |
|-------|-------|----------|
| Android unit | 583 | JVM (Robolectric) |
| Web unit | 522 | Vitest (Node) |
| Scenario (journey) | 413 | Vitest → production Supabase |
| Playwright E2E | 45 | Chrome → production |
| Firebase Test Lab | 106 | Real Android 14 device |

### Key Test Types
- POS IndexedDB smoke test (catches missing Dexie indexes)
- Table existence test (catches un-applied migrations)
- Stress tests (concurrent API calls)
- Security tests (SQL injection, auth bypass)

## Security

- RLS enabled on all tables
- account_id scoping on every query
- CSRF protection (Origin header check)
- Rate limiting (30 req/min on sync)
- Soft delete on key tables
- HMAC sync authentication (optional)
- No secrets in code
- Error logging to DB (not just console)

## Infrastructure

| Service | Plan | Cost/mo |
|---------|------|---------|
| Vercel | Pro | $20 |
| Render | Starter | $19 |
| Supabase | Free | $0 |
| Anthropic | Pay-as-you-go | ~$5-25 |
| Firebase | Spark (free) | $0 |
| Cloudinary | Free | $0 |
| **Total** | | **~$44-64** |
