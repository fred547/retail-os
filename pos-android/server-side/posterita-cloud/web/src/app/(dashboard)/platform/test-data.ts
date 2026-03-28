export const TEST_SUITES = {
  android: {
    totalTests: 587,
    totalFiles: 29,
    allPassed: true,
    lastVerified: "2026-03-29",
    version: "Room v30, Kotlin, multi-module",
    files: [
      { name: "CartItemTest", tests: 12, area: "Tax calc, discount, clone" },
      { name: "CartRecalculationTest", tests: 24, area: "Totals, discount on total, qty tracking" },
      { name: "CartSerializationTest", tests: 24, area: "JSON serialize/restore, modifiers" },
      { name: "CloudSyncFieldMappingTest", tests: 17, area: "Camel→snake field mapping" },
      { name: "CloudSyncIntegrationTest", tests: 6, area: "Full sync round-trip" },
      { name: "DateUtilsTest", tests: 11, area: "UTC parsing, timezone-independence (Mauritius UTC+4), hoursElapsedSinceUtc, hoursBetweenUtc" },
      { name: "DeliveryEntityTest", tests: 15, area: "Status lifecycle, customer/driver fields, cart JSON" },
      { name: "DiscountCalculationTest", tests: 11, area: "Percentage, fixed, stacking" },
      { name: "HoldOrderFlowTest", tests: 19, area: "Hold/recall/delete, table assignment" },
      { name: "InventoryCountTest", tests: 24, area: "Session/entry lifecycle, variance, scan accumulation" },
      { name: "KitchenOrderFlowTest", tests: 27, area: "Status cycle, split, merge, stations" },
      { name: "LoyaltyRepositoryTest", tests: 34, area: "Points, cache, offline queue, tiers" },
      { name: "MenuScheduleFilterTest", tests: 22, area: "Time range, day-of-week, category ID parsing" },
      { name: "NumberUtilsTest", tests: 16, area: "Price/qty formatting, parsing" },
      { name: "OrderDetailsTest", tests: 15, area: "OrderDetails build, JSON round-trip" },
      { name: "OrderFormattingTest", tests: 44, area: "Receipt, kitchen copy, till receipt" },
      { name: "PaymentCalculationTest", tests: 25, area: "Cash/card/split, change, rounding" },
      { name: "PosOrderJourneyTest", tests: 17, area: "Full order, serialized products, stock validation, refund, split, inventory" },
      { name: "PromotionServiceTest", tests: 16, area: "Percentage/fixed/BOGO, max cap, product targeting, promo code" },
      { name: "SecurityTest", tests: 10, area: "PIN validation, session timeout" },
      { name: "ShiftEntityTest", tests: 16, area: "Clock in/out, break tracking, hours worked" },
      { name: "ShoppingCartTest", tests: 31, area: "Add/remove/clear, qty update" },
      { name: "StockPropertiesTest", tests: 31, area: "Low/out-of-stock, expiry, shelf/batch, cart integration" },
      { name: "SyncContractTest", tests: 12, area: "Request/response schema" },
      { name: "SyncRegressionTest", tests: 16, area: "Field mapping bugs, null handling" },
      { name: "SyncStatusManagerTest", tests: 24, area: "State transitions, summary" },
      { name: "TableManagementTest", tests: 19, area: "Table CRUD, occupancy, sections" },
      { name: "TaxCalculationTest", tests: 26, area: "Inclusive/exclusive, fixed, multi-rate" },
      { name: "WarehouseWorkflowTest", tests: 23, area: "Picking, put-away, transfer, multi-store stock, reconciliation" },
    ],
  },
  smoke: {
    totalTests: 42,
    totalFiles: 1,
    allPassed: true,
    lastVerified: "2026-03-24",
    version: "Vitest 4.1, hits production",
    files: [
      { name: "smoke-test.test.ts", tests: 42, area: "API health, DB tables, data integrity, sync contract, web pages, edge cases, SQL injection" },
    ],
  },
  render: {
    totalTests: 16,
    totalFiles: 1,
    allPassed: true,
    lastVerified: "2026-03-24",
    version: "Vitest 4.1, hits Render backend",
    files: [
      { name: "render-backend.test.ts", tests: 16, area: "Health, monitoring (errors/sync/accounts), WhatsApp webhook verify+payload, CORS, security, cross-service monitor" },
    ],
  },
  adb: {
    totalTests: 8,
    totalFiles: 1,
    allPassed: true,
    lastVerified: "2026-03-24",
    version: "ADB + uiautomator, XML hierarchy",
    files: [
      { name: "adb-smoke-test.sh", tests: 8, area: "App launch, crash detection, connectivity, UI nodes, ANR, memory, DB, logcat" },
    ],
  },
  firebase: {
    totalTests: 106,
    totalFiles: 10,
    allPassed: false,
    lastVerified: "2026-03-28",
    version: "Firebase Test Lab, MediumPhone.arm Android 14",
    videoUrl: "https://console.firebase.google.com/project/posterita-retail-os/testlab/histories/bh.a6c51873ad5e7aff/matrices/5339810472576948854",
    files: [
      { name: "HoldOrderDaoTest", tests: 15, area: "Room DB: hold order CRUD, JSON persistence, kitchen flags, split bill" },
      { name: "RestaurantTableDaoTest", tests: 17, area: "Room DB: table CRUD, occupancy lifecycle, store scoping" },
      { name: "HomeScreenTest", tests: 11, area: "App launch, 6 tiles visible, context bar, greeting" },
      { name: "POSFlowTest", tests: 12, area: "Add to cart, qty change, discount, payment completion" },
      { name: "NavigationFlowTest", tests: 7, area: "Home→Settings→WebView→POS→Cart→Kitchen, rapid nav" },
      { name: "SettingsFlowTest", tests: 13, area: "Store config, printer setup, sync, brand management" },
      { name: "RestaurantModeTest", tests: 9, area: "Table selection, dine-in order, kitchen routing" },
      { name: "EdgeCaseTest", tests: 15, area: "Empty cart, offline mode, large qty, special chars, rapid taps" },
      { name: "LoginFlowTest", tests: 3, area: "Welcome screen, login form, credential entry (needs test account)" },
      { name: "SignupFlowTest", tests: 4, area: "First launch wizard, brand creation (needs network)" },
    ],
  },
  web: {
    totalTests: 303,
    totalFiles: 27,
    allPassed: true,
    lastVerified: "2026-03-27",
    version: "Vitest 4.1, Next.js 16",
    files: [
      { name: "ai-import.test.ts", tests: 2, area: "AI product discovery" },
      { name: "business-logic.test.ts", tests: 14, area: "FK ordering, precision, filtering" },
      { name: "data-api.test.ts", tests: 15, area: "Table whitelist, batch, filters" },
      { name: "e2e-integration.test.ts", tests: 27, area: "Full signup→login→sync→OTT→enroll" },
      { name: "mra-ebs.test.ts", tests: 15, area: "MRA encryption, hashing, invoice building, credentials" },
      { name: "owner-accounts.test.ts", tests: 4, area: "Owner listing, update, delete" },
      { name: "platform-create-account.test.ts", tests: 6, area: "Super admin, validation" },
      { name: "register-edge-cases.test.ts", tests: 16, area: "Empty arrays, camelCase, re-register" },
      { name: "schema-validation.test.ts", tests: 7, area: "Field mapping, UUID preservation" },
      { name: "security.test.ts", tests: 5, area: "Missing fields, malformed JSON" },
      { name: "serial-items.test.ts", tests: 17, area: "Serial item CRUD, lifecycle, VIN fields" },
      { name: "signup.test.ts", tests: 13, area: "Owner+brand creation, auth linking" },
      { name: "sync.test.ts", tests: 15, area: "Push/pull, validation, payments" },
      { name: "sync-edge-cases.test.ts", tests: 21, area: "Batch, null fields, insertOrUpdate" },
      { name: "sync-hardening.test.ts", tests: 23, area: "Conflict detection, checksum, retry, context" },
      { name: "sync-register.test.ts", tests: 10, area: "Registration, demo accounts" },
      { name: "stock.test.ts", tests: 9, area: "Stock adjustment, journal, auth, validation" },
      { name: "z-report.test.ts", tests: 5, area: "Z-report generation, CSV export, empty data" },
      { name: "loyalty.test.ts", tests: 14, area: "Loyalty config, earn, redeem, wallets, transactions" },
      { name: "suppliers.test.ts", tests: 8, area: "Supplier CRUD, PO create, PO list, auth" },
      { name: "menu-schedules.test.ts", tests: 8, area: "Menu schedule CRUD, active filter by time/day" },
      { name: "shifts.test.ts", tests: 7, area: "Shift clock in/out, hours computation, validation" },
      { name: "deliveries.test.ts", tests: 7, area: "Delivery CRUD, status workflow, driver assignment" },
      { name: "promotions.test.ts", tests: 11, area: "Promotion CRUD, validate, promo codes, min order, usage counts" },
      { name: "warehouse.test.ts", tests: 12, area: "Stock GET/POST, auth, filters, journal, transfer, reconciliation" },
      { name: "pos/cart-store.test.ts", tests: 20, area: "Cart: add/remove/qty/tax/tips/clear/price override/precision" },
      { name: "pos/escpos.test.ts", tests: 14, area: "ESC/POS: init/text/align/bold/cut/drawer/receipt/BRN" },
      { name: "pos/barcode-listener.test.ts", tests: 5, area: "USB barcode scanner: scan detect, min length, input ignore" },
      { name: "pos/print-relay.test.ts", tests: 5, area: "Print relay: SSRF IP validation (private/public ranges)" },
      { name: "store-layout.test.ts", tests: 3, area: "Store layout zone CRUD, validation" },
      { name: "tags-advanced.test.ts", tests: 8, area: "Tag assign (product/customer/order), report, validation" },
      { name: "enroll.test.ts", tests: 7, area: "Device enrollment, terminal lock, re-enroll, 409 rejection" },
    ],
  },
  scenarios: {
    totalTests: 413,
    totalFiles: 53,
    allPassed: true,
    lastVerified: "2026-03-27",
    version: "Vitest 4.1, hits production API + Supabase",
    files: [
      { name: "01-signup-flow", tests: 5, area: "Full signup → owner + live + demo brand creation" },
      { name: "02-lookup-login", tests: 4, area: "Auth lookup, login, credential validation" },
      { name: "03-sync-push-orders", tests: 5, area: "Push orders/tills via sync, verify persistence" },
      { name: "04-product-lifecycle", tests: 5, area: "Draft → review → live status transitions" },
      { name: "05-till-reconciliation", tests: 5, area: "Open/close till, cash tracking, variance" },
      { name: "06-data-isolation", tests: 3, area: "Multi-brand data separation, no cross-tenant leaks" },
      { name: "07-ott-security", tests: 4, area: "OTT token generation, validation, expiry, replay" },
      { name: "08-sync-register", tests: 3, area: "Device registration, re-registration" },
      { name: "09-inventory-count", tests: 6, area: "Session CRUD, entries, barcode, finalize" },
      { name: "10-error-logging", tests: 6, area: "Log errors from web/API, severity, status" },
      { name: "11-device-enrollment", tests: 5, area: "QR enrollment flow, terminal assignment" },
      { name: "12-monitor-health", tests: 5, area: "Monitor endpoint, service checks, status" },
      { name: "13-account-lifecycle", tests: 6, area: "Status transitions: draft→active→archived" },
      { name: "14-soft-delete-sync", tests: 6, area: "Soft delete filtering, sync excludes deleted" },
      { name: "15-auth-check", tests: 5, area: "Email/phone uniqueness checking" },
      { name: "16-owner-accounts", tests: 5, area: "Owner account lookup and filtering" },
      { name: "17-restaurant-tables", tests: 9, area: "Table sections, table occupancy, zones" },
      { name: "18-store-terminal-user", tests: 7, area: "Store/terminal/user hierarchy CRUD" },
      { name: "19-modifier-management", tests: 7, area: "Product and category modifiers" },
      { name: "20-changelog-debug", tests: 6, area: "Changelog, debug session, infrastructure API" },
      { name: "21-preparation-stations", tests: 12, area: "Prep stations, category-station routing" },
      { name: "22-restaurant-orders", tests: 7, area: "Restaurant orders, table linking, order types" },
      { name: "23-customer-sync", tests: 8, area: "Customer sync push/pull, soft-delete, discount codes" },
      { name: "24-payment-sync", tests: 6, area: "Payment sync, order lines, split payments, upsert" },
      { name: "25-inventory-sessions", tests: 8, area: "Inventory sessions, entries, re-scan, aggregation" },
      { name: "26-discount-preference", tests: 9, area: "Discount codes and account preferences" },
      { name: "27-full-sync-integration", tests: 6, area: "Full sync push/pull with incremental" },
      { name: "28-account-management", tests: 5, area: "Account status, type, currency updates" },
      { name: "29-sync-error-logs", tests: 4, area: "Error log sync and status tracking" },
      { name: "30-device-registration", tests: 6, area: "Device registration via sync, metadata, logging" },
      { name: "31-sync-incremental", tests: 7, area: "Delta sync, change detection, request logging" },
      { name: "32-preference-modifier-sync", tests: 7, area: "Preference + modifier sync pull, deactivation" },
      { name: "33-printer-config", tests: 7, area: "Printer types, station linking, bluetooth" },
      { name: "34-data-crud-api", tests: 12, area: "/api/data insert, query, update, soft/hard delete" },
      { name: "35-account-lifecycle-api", tests: 6, area: "/api/account/lifecycle transitions + audit log" },
      { name: "36-inventory-api", tests: 9, area: "/api/inventory/sessions CRUD + entries upsert" },
      { name: "37-account-owner-crud", tests: 9, area: "Account/owner CRUD, auth guards, cascade delete" },
      { name: "38-catalogue-context", tests: 7, area: "PDF catalogue generation + context API redirect" },
      { name: "39-create-demo", tests: 6, area: "/api/account/create-demo with 15 seeded products" },
      { name: "40-owner-accounts-api", tests: 5, area: "/api/owner/accounts PATCH/DELETE with identity" },
      { name: "41-intake-pipeline", tests: 7, area: "Intake batch, items, review approve/reject" },
      { name: "42-ai-import-save", tests: 7, area: "/api/ai-import/save categories + products + taxes" },
      { name: "43-admin-auth-guards", tests: 10, area: "Auth guards: platform, super-admin, blink, reset" },
      { name: "45-stock-deduction", tests: 7, area: "Stock columns, adjustment, journal CRUD, filter by reason" },
      { name: "46-customer-loyalty", tests: 6, area: "Loyalty config, earn, redeem, insufficient points, adjust, wallets" },
      { name: "47-supplier-purchase-orders", tests: 5, area: "Supplier create, PO create, send, GRN receive, cancelled PO" },
      { name: "48-warehouse-workflows", tests: 7, area: "Stock adjustment, journal, low/out/expiring filters, shelf/batch" },
      { name: "49-promotion-delivery-shift", tests: 13, area: "Promotion CRUD, delivery lifecycle, shift clock in/out, menu schedules" },
      { name: "50-table-existence", tests: 29, area: "All 11 feature tables exist, all GET/POST endpoints return 200, zero schema errors" },
      { name: "51-nested-categories", tests: 16, area: "3-level hierarchy, parent/child queries, leaf detection, subtree filtering, soft delete, account isolation" },
      { name: "51-tags", tests: 15, area: "Tag groups, product tagging, bulk assign, soft-delete cascade" },
      { name: "52-sync-field-mapping", tests: 14, area: "Sync pull field completeness: tax, store, terminal, product, customer, user, modifier, Phase 3 entities" },
    ],
  },
};

// ── API Route Coverage Analysis ──────────────────────────────

export type RouteStatus = "tested" | "not-tested";

export interface ApiRoute {
  path: string;
  method: string;
  purpose: string;
  status: RouteStatus;
  testedBy: string; // which test file(s)
}

export const API_ROUTE_COVERAGE: ApiRoute[] = [
  // Auth
  { path: "/api/auth/signup", method: "POST", purpose: "Create owner + live/demo brands", status: "tested", testedBy: "signup.test, scenario-01, e2e" },
  { path: "/api/auth/login", method: "POST", purpose: "Authenticate user", status: "tested", testedBy: "e2e, scenario-02" },
  { path: "/api/auth/check", method: "POST", purpose: "Email/phone uniqueness", status: "tested", testedBy: "scenario-15" },
  { path: "/api/auth/reset", method: "POST", purpose: "Delete all account data", status: "not-tested", testedBy: "destructive" },
  { path: "/api/auth/reset-password", method: "POST", purpose: "Send password reset email", status: "tested", testedBy: "scenario-43, e2e" },
  { path: "/api/auth/ott", method: "POST", purpose: "Generate OTT token", status: "tested", testedBy: "scenario-07, e2e" },
  { path: "/api/auth/ott/validate", method: "POST", purpose: "Validate OTT token", status: "tested", testedBy: "scenario-07, e2e" },
  { path: "/api/auth/lookup", method: "POST", purpose: "Auth user lookup by email", status: "tested", testedBy: "scenario-02" },

  // Sync
  { path: "/api/sync", method: "GET", purpose: "Health check + version", status: "tested", testedBy: "sync.test, smoke, business-logic" },
  { path: "/api/sync", method: "POST", purpose: "Push/pull sync protocol", status: "tested", testedBy: "sync.test, sync-edge-cases, business-logic, scenarios 03-33" },
  { path: "/api/sync/register", method: "POST", purpose: "Register device for sync", status: "tested", testedBy: "sync-register.test, register-edge-cases, scenario-08" },
  { path: "/api/sync/replay", method: "POST", purpose: "Replay failed sync inbox", status: "tested", testedBy: "scenario-43" },

  // Enroll
  { path: "/api/enroll", method: "GET", purpose: "Enrollment form", status: "tested", testedBy: "scenario-11" },
  { path: "/api/enroll", method: "POST", purpose: "Device enrollment (QR)", status: "tested", testedBy: "e2e, scenario-11" },

  // Data proxy
  { path: "/api/data", method: "POST", purpose: "Data proxy for web reads", status: "tested", testedBy: "data-api.test" },
  { path: "/api/data/insert", method: "POST", purpose: "Insert records from web", status: "tested", testedBy: "scenario-34" },
  { path: "/api/data/update", method: "POST", purpose: "Update records from web", status: "tested", testedBy: "data-api.test" },
  { path: "/api/data/delete", method: "POST", purpose: "Soft/hard delete records", status: "tested", testedBy: "scenario-34" },

  // Account
  { path: "/api/account/[id]", method: "DELETE", purpose: "Delete brand (cascade)", status: "tested", testedBy: "scenario-37" },
  { path: "/api/account/[id]", method: "PATCH", purpose: "Update brand status/name", status: "tested", testedBy: "scenario-37" },
  { path: "/api/account/create-demo", method: "POST", purpose: "Create demo brand", status: "tested", testedBy: "scenario-39" },
  { path: "/api/account/lifecycle", method: "GET", purpose: "Get lifecycle status", status: "tested", testedBy: "scenario-35" },
  { path: "/api/account/lifecycle", method: "PATCH", purpose: "Status transition", status: "tested", testedBy: "scenario-13" },

  // Owner
  { path: "/api/owner/[id]", method: "GET", purpose: "Owner details", status: "tested", testedBy: "scenario-37" },
  { path: "/api/owner/[id]", method: "PATCH", purpose: "Update owner info", status: "tested", testedBy: "scenario-37" },
  { path: "/api/owner/accounts", method: "GET", purpose: "List owner accounts", status: "tested", testedBy: "owner-accounts.test, scenario-16" },
  { path: "/api/owner/accounts/[id]", method: "PATCH", purpose: "Owner-scoped update", status: "tested", testedBy: "owner-accounts.test" },
  { path: "/api/owner/accounts/[id]", method: "DELETE", purpose: "Owner-scoped delete", status: "tested", testedBy: "owner-accounts.test" },

  // Errors
  { path: "/api/errors/log", method: "POST", purpose: "Log error to DB", status: "tested", testedBy: "scenario-10" },

  // Context
  { path: "/api/context", method: "GET", purpose: "Resolve session context", status: "tested", testedBy: "e2e" },
  { path: "/api/context", method: "POST", purpose: "Set session context", status: "tested", testedBy: "scenario-38" },

  // Inventory
  { path: "/api/inventory/sessions", method: "GET", purpose: "List sessions", status: "tested", testedBy: "scenario-09, scenario-25" },
  { path: "/api/inventory/sessions", method: "POST", purpose: "Create session", status: "tested", testedBy: "scenario-09, scenario-25" },
  { path: "/api/inventory/sessions/[id]", method: "GET", purpose: "Session details", status: "tested", testedBy: "scenario-09, scenario-25" },
  { path: "/api/inventory/sessions/[id]", method: "PATCH", purpose: "Update session", status: "tested", testedBy: "scenario-09, scenario-25" },
  { path: "/api/inventory/sessions/[id]/entries", method: "GET", purpose: "List entries", status: "tested", testedBy: "scenario-09, scenario-25" },
  { path: "/api/inventory/sessions/[id]/entries", method: "POST", purpose: "Add entries", status: "tested", testedBy: "scenario-09, scenario-25" },

  // Intake
  { path: "/api/intake", method: "GET", purpose: "List intake batches", status: "tested", testedBy: "scenario-41" },
  { path: "/api/intake", method: "POST", purpose: "Create intake batch", status: "tested", testedBy: "scenario-41" },
  { path: "/api/intake/[id]", method: "GET", purpose: "Batch details", status: "tested", testedBy: "scenario-41" },
  { path: "/api/intake/[id]/process", method: "POST", purpose: "AI matching", status: "not-tested", testedBy: "needs Claude API" },
  { path: "/api/intake/[id]/review", method: "POST", purpose: "Approve/reject items", status: "tested", testedBy: "scenario-41" },

  // AI Import
  { path: "/api/ai-import", method: "POST", purpose: "AI product discovery", status: "tested", testedBy: "ai-import.test" },
  { path: "/api/ai-import/save", method: "POST", purpose: "Save AI products", status: "tested", testedBy: "scenario-42" },

  // Blink payments
  { path: "/api/blink/dynamic-qr", method: "POST", purpose: "Generate payment QR", status: "tested", testedBy: "scenario-43" },
  { path: "/api/blink/till", method: "POST", purpose: "Blink till integration", status: "not-tested", testedBy: "needs Blink sandbox" },

  // Catalogue
  { path: "/api/catalogue", method: "POST", purpose: "Generate PDF catalogue", status: "tested", testedBy: "scenario-38" },

  // Platform admin
  { path: "/api/super-admin/status", method: "GET", purpose: "Super admin check", status: "tested", testedBy: "smoke" },
  { path: "/api/super-admin/switch", method: "POST", purpose: "Account impersonation", status: "tested", testedBy: "scenario-43" },
  { path: "/api/platform/create-account", method: "POST", purpose: "Create account from portal", status: "tested", testedBy: "platform-create-account.test" },
  { path: "/api/platform/delete-test-brands", method: "POST", purpose: "Bulk delete test brands", status: "not-tested", testedBy: "CI only" },
  { path: "/api/account-manager/.../assignment", method: "PATCH", purpose: "Assign account manager", status: "tested", testedBy: "scenario-43" },

  // Monitoring
  { path: "/api/monitor", method: "GET", purpose: "System health checks", status: "tested", testedBy: "scenario-12, smoke" },
  { path: "/api/infrastructure", method: "GET", purpose: "Infrastructure status", status: "tested", testedBy: "scenario-20, smoke" },

  // Utilities
  { path: "/api/serial-items", method: "GET", purpose: "List serial items", status: "tested", testedBy: "serial-items.test" },
  { path: "/api/serial-items", method: "POST", purpose: "Batch receive serial items", status: "tested", testedBy: "serial-items.test" },
  { path: "/api/serial-items/[id]", method: "GET", purpose: "Serial item detail", status: "tested", testedBy: "serial-items.test" },
  { path: "/api/serial-items/[id]", method: "PATCH", purpose: "Update serial item", status: "tested", testedBy: "serial-items.test" },

  { path: "/api/debug/session", method: "GET", purpose: "Debug session info", status: "tested", testedBy: "scenario-20" },
  { path: "/api/changelog", method: "GET", purpose: "Changelog commits", status: "tested", testedBy: "scenario-20" },

  // Deliveries
  { path: "/api/deliveries", method: "GET", purpose: "List deliveries", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/deliveries", method: "POST", purpose: "Create delivery", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/deliveries/[id]", method: "PATCH", purpose: "Update delivery status", status: "tested", testedBy: "scenario-49, stress" },

  // Shifts
  { path: "/api/shifts", method: "GET", purpose: "List shifts", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/shifts", method: "POST", purpose: "Clock in/out", status: "tested", testedBy: "scenario-49, scenario-50, stress" },

  // Suppliers
  { path: "/api/suppliers", method: "GET", purpose: "List suppliers", status: "tested", testedBy: "scenario-50, stress" },
  { path: "/api/suppliers", method: "POST", purpose: "Create supplier", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/suppliers/[id]", method: "PATCH", purpose: "Update supplier", status: "tested", testedBy: "stress" },
  { path: "/api/suppliers/[id]", method: "DELETE", purpose: "Soft delete supplier", status: "tested", testedBy: "stress" },

  // Purchase Orders
  { path: "/api/purchase-orders", method: "GET", purpose: "List POs", status: "tested", testedBy: "scenario-50, stress" },
  { path: "/api/purchase-orders", method: "POST", purpose: "Create PO with lines", status: "tested", testedBy: "stress" },
  { path: "/api/purchase-orders/[id]", method: "PATCH", purpose: "Update PO status", status: "tested", testedBy: "stress" },
  { path: "/api/purchase-orders/[id]/receive", method: "POST", purpose: "GRN receive", status: "tested", testedBy: "scenario-47" },

  // Promotions
  { path: "/api/promotions", method: "GET", purpose: "List promotions", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/promotions", method: "POST", purpose: "Create promotion", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { path: "/api/promotions/[id]", method: "PATCH", purpose: "Update promotion", status: "tested", testedBy: "stress" },
  { path: "/api/promotions/[id]", method: "DELETE", purpose: "Soft delete promotion", status: "tested", testedBy: "stress" },

  // Menu Schedules
  { path: "/api/menu-schedules", method: "GET", purpose: "List schedules", status: "tested", testedBy: "scenario-49, scenario-50" },
  { path: "/api/menu-schedules", method: "POST", purpose: "Create schedule", status: "tested", testedBy: "scenario-49, scenario-50" },
  { path: "/api/menu-schedules/[id]", method: "PATCH", purpose: "Update schedule", status: "tested", testedBy: "scenario-49" },

  // Loyalty
  { path: "/api/loyalty/config", method: "GET", purpose: "Get loyalty config", status: "tested", testedBy: "scenario-50, stress" },
  { path: "/api/loyalty/config", method: "POST", purpose: "Save loyalty config", status: "tested", testedBy: "scenario-50, stress" },
  { path: "/api/loyalty/wallets", method: "GET", purpose: "List wallets", status: "tested", testedBy: "scenario-50, stress" },
  { path: "/api/loyalty/transactions", method: "GET", purpose: "List transactions", status: "tested", testedBy: "scenario-50, stress" },

  // Stock
  { path: "/api/stock", method: "GET", purpose: "Multi-store stock overview", status: "tested", testedBy: "warehouse.test, scenario-50" },
  { path: "/api/stock", method: "POST", purpose: "Manual stock adjustment", status: "tested", testedBy: "warehouse.test, scenario-48" },

  // Tags
  { path: "/api/tags/groups", method: "GET", purpose: "List tag groups", status: "tested", testedBy: "scenario-51-tags" },
  { path: "/api/tags/groups", method: "POST", purpose: "Create tag group", status: "tested", testedBy: "scenario-51-tags" },
  { path: "/api/tags/groups/[id]", method: "PATCH", purpose: "Update tag group", status: "tested", testedBy: "scenario-51-tags" },
  { path: "/api/tags", method: "GET", purpose: "List tags", status: "tested", testedBy: "scenario-51-tags" },
  { path: "/api/tags", method: "POST", purpose: "Create tag", status: "tested", testedBy: "scenario-51-tags" },
  { path: "/api/tags/assign", method: "POST", purpose: "Assign tags to products", status: "tested", testedBy: "scenario-51-tags" },
];

// ── DB Table Coverage ──────────────────────────────────

export interface DbTable {
  name: string;
  status: RouteStatus;
  testedBy: string;
}

export const DB_TABLE_COVERAGE: DbTable[] = [
  { name: "account", status: "tested", testedBy: "signup, sync-register, scenario-01/13/28" },
  { name: "owner", status: "tested", testedBy: "signup, scenario-01/16" },
  { name: "product", status: "tested", testedBy: "smoke, sync, scenario-04" },
  { name: "productcategory", status: "tested", testedBy: "smoke, scenario-04" },
  { name: "orders", status: "tested", testedBy: "sync, scenario-03/22" },
  { name: "orderline", status: "tested", testedBy: "sync, scenario-03/24" },
  { name: "store", status: "tested", testedBy: "smoke, scenario-18" },
  { name: "terminal", status: "tested", testedBy: "smoke, scenario-18" },
  { name: "pos_user", status: "tested", testedBy: "signup, scenario-18" },
  { name: "tax", status: "tested", testedBy: "signup, smoke" },
  { name: "customer", status: "tested", testedBy: "sync, scenario-23" },
  { name: "till", status: "tested", testedBy: "sync, scenario-05" },
  { name: "payment", status: "tested", testedBy: "sync, scenario-24" },
  { name: "modifier", status: "tested", testedBy: "scenario-19/32" },
  { name: "preference", status: "tested", testedBy: "scenario-26/32" },
  { name: "discountcode", status: "tested", testedBy: "scenario-26" },
  { name: "restaurant_table", status: "tested", testedBy: "smoke, scenario-17" },
  { name: "table_section", status: "tested", testedBy: "smoke, scenario-17" },
  { name: "preparation_station", status: "tested", testedBy: "smoke, scenario-21" },
  { name: "category_station_mapping", status: "tested", testedBy: "smoke, scenario-21" },
  { name: "printer", status: "tested", testedBy: "scenario-33" },
  { name: "error_logs", status: "tested", testedBy: "smoke, scenario-10/29" },
  { name: "sync_request_log", status: "tested", testedBy: "smoke, scenario-30" },
  { name: "ci_report", status: "tested", testedBy: "smoke" },
  { name: "inventory_count_session", status: "tested", testedBy: "scenario-09/25" },
  { name: "inventory_count_entry", status: "tested", testedBy: "scenario-09/25" },
  { name: "registered_device", status: "tested", testedBy: "scenario-30" },
  { name: "account_lifecycle_log", status: "tested", testedBy: "scenario-13" },
  { name: "owner_account_session", status: "tested", testedBy: "signup" },
  { name: "serial_item", status: "tested", testedBy: "serial-items.test" },
  { name: "account_tax_config", status: "tested", testedBy: "mra-ebs.test" },
  { name: "mra_counter", status: "tested", testedBy: "mra-ebs.test" },
  { name: "delivery", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { name: "shift", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { name: "supplier", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { name: "promotion", status: "tested", testedBy: "scenario-49, scenario-50, stress" },
  { name: "promotion_usage", status: "tested", testedBy: "scenario-50" },
  { name: "purchase_order", status: "tested", testedBy: "scenario-50, stress" },
  { name: "purchase_order_line", status: "tested", testedBy: "stress" },
  { name: "menu_schedule", status: "tested", testedBy: "scenario-49, scenario-50" },
  { name: "loyalty_config", status: "tested", testedBy: "scenario-50, stress" },
  { name: "loyalty_transaction", status: "tested", testedBy: "scenario-50" },
  { name: "stock_journal", status: "tested", testedBy: "scenario-48, warehouse.test" },
  { name: "account_manager", status: "not-tested", testedBy: "" },
  { name: "tag_group", status: "tested", testedBy: "scenario-51-tags" },
  { name: "tag", status: "tested", testedBy: "scenario-51-tags" },
  { name: "product_tag", status: "tested", testedBy: "scenario-51-tags" },
  { name: "intake_batch", status: "tested", testedBy: "scenario-41" },
  { name: "intake_item", status: "tested", testedBy: "scenario-41" },
  { name: "ott_token", status: "tested", testedBy: "scenario-07" },
];

// ── Computed coverage stats ──────────────────────────────

export function computeCoverage() {
  const testedRoutes = API_ROUTE_COVERAGE.filter((r) => r.status === "tested").length;
  const totalRoutes = API_ROUTE_COVERAGE.length;
  const routePct = Math.round((testedRoutes / totalRoutes) * 100);

  const testedTables = DB_TABLE_COVERAGE.filter((t) => t.status === "tested").length;
  const totalTables = DB_TABLE_COVERAGE.length;
  const tablePct = Math.round((testedTables / totalTables) * 100);

  const notTestedRoutes = API_ROUTE_COVERAGE.filter((r) => r.status === "not-tested");

  // Categorize untested routes
  const gaps = {
    intake: notTestedRoutes.filter((r) => r.path.includes("/intake")),
    blink: notTestedRoutes.filter((r) => r.path.includes("/blink")),
    account: notTestedRoutes.filter((r) => r.path.includes("/account") && !r.path.includes("manager") && !r.path.includes("platform")),
    admin: notTestedRoutes.filter((r) => r.path.includes("/super-admin") || r.path.includes("/platform") || r.path.includes("manager")),
    other: notTestedRoutes.filter(
      (r) =>
        !r.path.includes("/intake") &&
        !r.path.includes("/blink") &&
        !r.path.includes("/account") &&
        !r.path.includes("/super-admin") &&
        !r.path.includes("/platform") &&
        !r.path.includes("manager")
    ),
  };

  return {
    routes: { tested: testedRoutes, total: totalRoutes, pct: routePct },
    tables: { tested: testedTables, total: totalTables, pct: tablePct },
    notTestedRoutes,
    gaps,
  };
}
