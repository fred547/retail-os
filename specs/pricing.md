# Posterita Retail OS — Pricing & Plan Gating

## Regions

| Tier | Name | Markets | Examples |
|------|------|---------|----------|
| 1 | Developing | Sub-Saharan Africa, South Asia, Southeast Asia | Kenya, India, Vietnam, Madagascar, Cambodia |
| 2 | Emerging | Indian Ocean, Latin America, Eastern Europe, Middle East, China, South Africa | Mauritius, Brazil, Turkey, Poland, UAE |
| 3 | Developed | North America, Western Europe, ANZ, Japan, Singapore | US, UK, France, Germany, Australia |

## Plans (monthly, per store)

| Plan | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| Free | $0 | $0 | $0 |
| Starter | $7 | $12 | $19 |
| Growth | $19 | $29 | $49 |
| Business | $39 | $59 | $99 |

Mauritius = Tier 2 → Starter $12/mo (~Rs 540)

## Store Add-on Pricing

Each additional store costs the same as your base plan price and doubles your per-store users & terminals.

| Plan | Tier 1/store | Tier 2/store | Tier 3/store |
|------|-------------|-------------|-------------|
| Free | $1 | $2 | $3 |
| Starter | $7 | $12 | $19 |
| Growth | $19 | $29 | $49 |
| Business | $39 | $59 | $99 |

## Individual Add-ons (all plans including Free)

| Add-on | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| +1 Terminal | $1/mo | $2/mo | $3/mo |
| +1 User | $0.50/mo | $1/mo | $1.50/mo |

## Limits (per store — each additional store doubles these)

| Limit | Free | Starter | Growth | Business |
|-------|------|---------|--------|----------|
| Users | 2 | 5 | 15 | 50 |
| Terminals | 2 | 3 | 10 | 30 |
| Products | Unlimited | Unlimited | Unlimited | Unlimited |
| Orders | Unlimited | Unlimited | Unlimited | Unlimited |
| Customers | Unlimited | Unlimited | Unlimited | Unlimited |
| Cloud Retention | 90 days | 1 year | 3 years | 5 years |
| Support | AI bot | Email + AI | Email + AI | Phone + Email + AI |

## Feature Gating

All constraints are stored in the `plan_constraint` table in Supabase — **never hardcoded**. Platform admin can modify any constraint from the admin portal without code changes.

### FREE — Micro-business starter

9 base features:
- `basic_pos` — checkout, cart, hold orders, refunds
- `offline` — full offline mode (Android + PWA)
- `receipt` — receipt printing
- `barcode` — barcode scanning
- `till` — till reconciliation
- `categories` — category management
- `basic_inventory` — stock levels, low stock alerts
- `basic_loyalty` — earn points
- `kitchen_printing` — kitchen ticket printing

### STARTER — Small shop essentials

Everything in Free, plus 6 features:
- `multi_user` — multiple users with roles (owner/cashier/supervisor)
- `customers` — customer profiles & purchase history
- `full_inventory` — full inventory tracking, stock history
- `shifts` — shift clock in/out
- `modifiers` — product modifiers & variants
- `csv_export` — CSV/Excel export

### GROWTH — Restaurants & growing retail

Everything in Starter, plus 14 features:
- `loyalty_advanced` — advanced earn/redeem/wallet
- `promotions` — promotions engine (% off, fixed, BOGO, promo codes)
- `restaurant` — table management
- `kds` — kitchen display system
- `stations` — preparation stations
- `menus` — menu scheduling
- `ai_import` — AI product import (Claude)
- `suppliers` — supplier directory
- `purchase_orders` — purchase orders + GRN
- `quotations` — quotation lifecycle (5 PDF templates)
- `pdf_catalogue` — PDF catalogue generation
- `tags` — product tags & auto-tagging rules
- `analytics` — advanced analytics, Z-report, tag-based reporting
- `delivery` — delivery tracking

### BUSINESS — Multi-store & enterprise

Everything in Growth, plus 8 features:
- `serialized_items` — VIN/IMEI, warranty, expiry tracking
- `warehouse` — warehouse zones, shelf labels, picking, put-away, stock transfers
- `xero` — Xero accounting integration
- `webhooks` — webhook subscriptions & API
- `tower_control` — live device sessions, fleet management, terminal locking
- `staff_scheduling` — staff scheduling & calendar
- `staff_leave` — timesheets, leave management
- `qr_actions` — QR scan actions (55 mappings)

## Plan Constraint Table Schema

```sql
plan_constraint (
  id BIGSERIAL PRIMARY KEY,
  plan TEXT NOT NULL,                    -- free | starter | growth | business
  constraint_key TEXT NOT NULL,          -- e.g. 'max_users', 'feature_kds', 'retention_days'
  constraint_value TEXT NOT NULL,        -- e.g. '5', 'true', '365'
  description TEXT,                      -- human-readable description for admin UI
  UNIQUE(plan, constraint_key)
)
```

**Key types:**
- `max_users` — integer, per-store user limit
- `max_terminals` — integer, per-store terminal limit
- `retention_days` — integer, cloud data retention in days
- `feature_*` — boolean ('true'/'false'), feature access flag

All 25 constraint keys × 4 plans = ~100 rows. Cached for 5 minutes in API layer.

## Trial System

### Database columns on `account`

| Column | Type | Purpose |
|--------|------|---------|
| `trial_plan` | TEXT | Which plan they're trialing (null = no trial) |
| `trial_ends_at` | TIMESTAMPTZ | When trial expires |
| `trial_granted_by` | TEXT | Who granted it (email or 'system') |

### Effective plan logic

```
getEffectivePlan(account):
  if trial_plan AND trial_ends_at > NOW():
    return trial_plan           // Active trial
  if subscription_status IN ('active', 'past_due', 'trialing'):
    return plan                 // Paid subscription
  if subscription_status = 'canceled' AND current_period_end > NOW():
    return plan                 // Canceled but period not over
  return 'free'                 // Default
```

### Signup flow

New accounts automatically receive a **14-day Growth trial** (granted by 'system'). Trial banner shows countdown.

### Platform admin actions

| Action | What it does |
|--------|-------------|
| Grant Trial | Set trial_plan + trial_ends_at (14/30/60 days) for any account |
| Extend Trial | Push trial_ends_at forward |
| Revoke Trial | Clear trial_plan and trial_ends_at |
| Override Plan | Manually set plan (for special deals, partners) |

## Enforcement Philosophy

**Soft walls, not hard blocks.**

| Scenario | Behavior |
|----------|----------|
| Locked feature page | Shows "Upgrade to [Plan]" card — not 404 |
| Exceeds user/terminal limit | Blocks new creation with upgrade prompt — existing data stays |
| Queries beyond retention | Returns data within retention window only (SQL filter) |
| Trial expires | Features hide, data preserved, banner shows "Trial ended" |
| POS checkout | **Always works — never blocked by plan** |
| Offline mode | **Always works regardless of plan** |
| Existing data after downgrade | **Never deleted — always accessible read-only** |

## 3 Layers of Enforcement

### Layer 1: UI Gating (Sidebar + Pages)
- Sidebar hides nav items not available on current plan
- Direct URL navigation → shows upgrade card (not 404)
- "Upgrade" badges on locked features

### Layer 2: Soft API Limits (Creation)
- Creating user/terminal/store beyond plan limits → `{ error: "limit_reached", upgrade_to: "starter", current: 5, limit: 5 }`
- Frontend shows friendly "You've reached your limit" modal with upgrade button
- **Never blocks reads** — only blocks new record creation
- Existing data that exceeds limits (from trial/downgrade) stays accessible

### Layer 3: Query-Level Retention (SQL)
- Applied automatically in `/api/data` proxy — adds date filter based on plan retention
- Sync endpoint: same filter (Android/PWA only gets data within retention window)
- Current day always works — POS never breaks

## Transaction Fees

**$0. Zero. None.** We don't take a cut of your sales. Unlike Square (2.6%), Toast (2.5%), or Shopify (2.4-2.7%).

## Competitor Comparison (1 store, 5 employees, full features)

| | Posterita Starter | Loyverse | Square Plus | Lightspeed | Shopify POS Pro |
|---|---|---|---|---|---|
| Monthly cost | $7-19 | $55 | $60 + tx fees | $89 | $128 |
| Transaction fees | $0 | Via processor | 2.6% + $0.10 | 2.6% + $0.10 | 2.4-2.7% |
| Offline mode | Full | No | No | No | No |
| Sales history | Included | +$5/store/mo | Included | Included | Included |
| Employee mgmt | Included | +$5/employee/mo | Included | Included | Included |
| Advanced inventory | Included | +$25/store/mo | Paid plan | Included | POS Pro |
| Restaurant & KDS | Growth plan | Basic KDS | Separate product | Separate product | No |
| Warehouse mgmt | Business plan | No | No | No | No |
| Xero accounting | Business plan | +$9/mo add-on | No | Yes | No |
| AI product import | Growth plan | No | No | No | No |
| Regional pricing | 3 tiers | No | No | No | No |

## Revenue Examples

| Scenario | Calculation | Monthly |
|----------|------------|---------|
| Single shop, Mauritius (T2) | Starter $12 | $12/mo |
| Restaurant, Mauritius (T2) | Growth $29 | $29/mo |
| 5-store chain, T1 | Growth $19 + 4×$19 | $95/mo |
| 5-store chain, Mauritius (T2) | Growth $29 + 4×$29 | $145/mo |
| 10-store chain, T2 | Business $59 + 9×$59 | $590/mo |
| 20-store chain, UK (T3) | Business $99 + 19×$99 | $1,980/mo |
| 50-store franchise, US (T3) | Business $99 + 49×$99 | $4,950/mo |

## Paddle Integration

**Payment processor:** Paddle (merchant of record)

### Products (9)

| Product | Paddle ID |
|---------|-----------|
| Posterita Starter | pro_01kmv731cq38mpatzs2rkp7768 |
| Posterita Growth | pro_01kmv7373p2tjc3rn2tee6faex |
| Posterita Business | pro_01kmv73cdarh5w74cdmkjbappg |
| Extra Store (Free) | pro_01kmv73km712ztcdqd8rc5f2sc |
| Extra Store (Starter) | pro_01kmv73yf939ny8058z3dtzwbf |
| Extra Store (Growth) | pro_01kmv743n892w22za4yas689by |
| Extra Store (Business) | pro_01kmv748v212fxqvx7xcvwq6a6 |
| Extra Terminal | pro_01kmv74de7nhp6gnngy9h10hvf |
| Extra User | pro_01kmv74jpky9sb863ajxe6h6xp |

### Prices (27)

9 products × 3 regional prices = 27 Paddle price IDs. See `lib/billing.ts` for full mapping.

### Webhook Events

All events logged to `billing_event` table. Key handlers:
- **Subscription:** created, activated, updated, canceled, past_due, paused, resumed, trialing → updates account plan & status
- **Transaction:** paid, completed, payment_failed → logs + flags past_due
- **Customer:** created, updated → syncs paddle_customer_id
- **Adjustment:** refund approved → logs to error_logs
- **Address/Business/PaymentMethod/Payout/Discount:** logged for audit

### Env Vars

| Variable | Purpose |
|----------|---------|
| `PADDLE_API_KEY` | Server-side API key |
| `PADDLE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client-side Paddle.js token |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | 'sandbox' or 'production' |
| `NEXT_PUBLIC_PADDLE_SELLER_ID` | Seller ID (308047) |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/billing/status` | GET | Current plan, usage, limits, events |
| `/api/billing/checkout` | POST | Create Paddle checkout transaction |
| `/api/billing/change-plan` | POST | Upgrade/downgrade subscription |
| `/api/billing/cancel` | POST | Cancel subscription (effective at period end) |
| `/api/billing/portal` | GET | Paddle customer portal URL |
| `/api/billing/webhook` | POST | Paddle webhook receiver (HMAC-SHA256) |
| `/api/billing/plan` | GET | Effective plan + all constraints for frontend |
| `/api/platform/plan-constraints` | GET/POST/PATCH | Admin CRUD for constraint table |
| `/api/platform/trial` | POST | Grant/extend/revoke trials |
