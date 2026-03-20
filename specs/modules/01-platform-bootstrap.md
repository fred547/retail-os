# Platform Bootstrap
> References: shared/architecture.md, shared/data-model.md, shared/roles-and-permissions.md

## Overview

Platform bootstrapping covers the entire flow from zero to operational: owner signup, account/brand/store creation, AI product generation during onboarding, device enrollment, staff onboarding, and authentication for both owners and staff. This is the "Chapter 0" that gets a new retailer running on the platform.

## Relevant Tables

`owner`, `account`, `organization`, `store`, `terminal`, `device`, `user`, `role`, `capability_profile`, `device_assignment`, `device_heartbeat`, `revocation_version`, `capability_snapshot`, `product_enrichment`

## API Routes

### Accounts & Onboarding

- `POST /v1/accounts/signup` — Owner signup (phone -> create owner + account)
- `POST /v1/accounts/verify-otp` — Verify owner phone OTP
- `POST /v1/accounts/complete-profile` — Set owner name + create PIN
- `POST /v1/accounts/brands` — Create brand (name, category, location)
- `GET /v1/accounts/brands` — List owner's brands
- `POST /v1/accounts/brands/{id}/stores` — Create store under brand
- `GET /v1/accounts/brands/{id}/stores` — List stores for brand
- `POST /v1/accounts/brands/{id}/ai-products` — Trigger AI starter product generation
- `GET /v1/accounts/brands/{id}/ai-products` — List AI-generated products pending review
- `POST /v1/accounts/ai-products/{id}/accept` — Accept AI product -> moves to master
- `POST /v1/accounts/ai-products/{id}/edit` — Accept with edits -> moves to master
- `POST /v1/accounts/ai-products/{id}/skip` — Skip/discard AI product
- `POST /v1/accounts/ai-products/skip-all` — Skip all remaining
- `POST /v1/auth/owner-login` — Owner login (PIN/biometric -> 30-day refresh JWT)
- `POST /v1/auth/staff-login` — Staff login (staff picker + PIN -> 7-day refresh JWT)
- `GET /v1/auth/staff-list` — List staff assigned to this device's store (for login picker)

## Business Rules

### Entity Hierarchy

```
Owner (person)
  └── Account (billing entity)
        └── Brand (1..n)
              └── Store (1..n)
                    └── Terminal (1..n)
                          └── Device (1..1 per terminal)
```

An owner can operate multiple brands (e.g., Funky Fish retail + Yadea electric vehicles). Each brand has its own product catalogue, loyalty program, customer base, and branding.

### Flow A: Owner Signup (from zero to operational)

Works on both Android and web. Minimum friction — no business registration number required, AI does the heavy lifting.

**Android UX rule:** The keyboard must NEVER hide the input field. Split every form into single-field steps. Capture one piece of information at a time with large, clear inputs and prominent "Next" buttons.

**Steps:**
1. Phone number (with country code)
2. OTP verification (WhatsApp)
3. Name
4. Brand name
5. Location (first store)
6. Product category (Fashion, Footwear, Electronics, etc.)
7. AI builds catalogue (backend: create owner, account, org, store, loyalty config, trigger AI product generation)
8. Owner reviews AI products one by one (Accept/Edit/Skip/Skip All)
9. Create PIN
10. Setup complete

**What happens at Step 7 (backend):**
1. Create `owner` record (phone, name)
2. Create `account` record (linked to owner)
3. Create `organization` record (brand name)
4. **AI discovers all stores:** Using the brand name + location + category, AI searches for all known locations/branches of the business (via web search, social media, Google Maps data). For each location found, create a `store` record with name, address, city, country, and inferred currency. If AI finds no additional locations, create a single store from the user-provided location. Each store gets its own default `terminal` record.
5. **Always seed demo products first** so the owner can use the POS immediately. Demo products are category-appropriate (food items for F&B, generic retail items otherwise). This ensures the app is usable even if AI fails or is slow.

### Demo Account Behavior

- Demo account (`demo_account`) uses owner `demo@posterita.com` / password `000000`
- **Demo syncs to the cloud** like a real account — users can test multi-device sync
- **Hard reset every 24 hours** — all demo data (orders, till sessions, products) is wiped and re-seeded. This prevents demo pollution and keeps it fresh for new users.
- Same demo account is shared across all devices that skip signup. Each gets the same seeded data after reset.
- Demo owner cannot be edited (email, password, role are locked). Toast: "Can't edit the demo owner. Sign up to create your own account."
- Demo home screen shows a banner prompting signup for a persistent account.
6. Create `organization_loyalty_config` with defaults for this category
7. Trigger AI product generation job **in the background** (Claude API: brand name + location + category -> 15-30 starter products as `product_enrichment` suggestions, status `ai_generated`). AI products replace/augment demo data as they arrive. If AI fails, the owner still has demo products to work with.

**AI multi-store discovery rules:**
- AI should search for "[brand name] locations [country]", "[brand name] branches", "[brand name] stores" patterns
- Each discovered store gets: store name (e.g. "Funky Fish — Grand Baie"), address, city, country, currency (inferred from country)
- Owner can add/remove/edit stores later from Settings
- If AI finds 0 additional locations, fall back to single store from user input
- Maximum 20 stores during onboarding (prevent runaway for franchise brands)

### Flow B: Owner Reviews AI-Generated Products

- **Accept** -> product moves to master `product` table, `catalogue_ready = true`
- **Edit** -> owner modifies fields -> then product moves to master table
- **Skip** -> product is discarded (not added to master)
- **Skip All** -> skip remaining AI suggestions, go to dashboard
- Owner can always add more products later

### Flow D: Owner Login (returning)

Owner opens the app -> recognized by device token -> PIN or biometric -> JWT issued with 30-day refresh.

### Flow E: Device Login (staff)

Staff opens app on enrolled device -> device shows staff assigned to that store -> staff selects name -> enters PIN -> JWT issued with `user_id`, `store_id`, `role`, `capabilities` and 7-day refresh.

### Token Lifecycle

| Token | Lifetime | Storage | Revocation |
|---|---|---|---|
| Owner access JWT | 15 minutes | Android Keystore / browser httpOnly cookie | Short-lived, natural expiry |
| Owner refresh JWT | 30 days | Android Keystore / secure cookie | Server-side revocation |
| Staff access JWT | 15 minutes | Android Keystore | Short-lived, natural expiry |
| Staff refresh JWT | 7 days | Android Keystore | Server-side revocation list in Redis |
| Device Token | Until revoked | Android Keystore | `RevocationVersion` broadcast |
| Enrollment Token | 24 hours, single-use | Backend only | Consumed on use |

### Staff Onboarding

1. Owner invites staff by phone via web console or Android Settings -> `POST /v1/auth/invite-by-phone`
2. Staff receives WhatsApp OTP
3. Staff enters OTP on enrolled device -> `POST /v1/auth/verify-otp`
4. Staff completes profile + creates PIN
5. Staff can now log in on any enrolled device in their store

### Device Enrollment

1. Owner/admin creates enrollment QR in web console or Android Settings
2. QR contains: `{ enrollment_token, store_id, capability_profile_id }`
3. Android app scans QR -> `POST /v1/devices/enroll`
4. Backend validates, registers device, returns device session
5. Device downloads capability snapshot + initial data sync

### Single-Store Binding

A user works in exactly one store per day. The store context is established at device enrollment. The JWT includes `store_id` as a claim. **Exception:** owners can switch between their stores/brands from a brand switcher in the app.

### Device Revocation

Revoke via web console -> increment `RevocationVersion` -> device receives 403 on next call -> token wipe -> data wipe -> lock screen -> uninstall prompt.

### AI Product Generation During Signup

Uses the same Anthropic API pipeline as the catalogue enrichment (§29), but with a different prompt targeting 20-30 starter products. Products go into `product_enrichment` table, NOT directly into the `product` table. Cost: ~$0.02 per signup.

## UX Flows

See master plan Section 6 for full ASCII mockups of all signup steps, product review screens, PIN creation, owner login, staff login picker, and device enrollment flows.

## Dependencies

- AI Catalogue module (for product generation pipeline)
- Loyalty module (for creating loyalty config during signup)

## Implementation Notes

- **Phase 0:** Backend accounts module, auth, device, capability modules
- **Phase 1:** Android `:feature:onboarding`, `:core:auth`, `:core:device`
- Decision 21: Multi-step on Android + web. Single-field steps.
- Decision 22: Owner -> Account -> Brand -> Store -> Terminal -> Device hierarchy.
- Decision 24: Owner gets 30-day refresh, staff gets 7-day refresh.
