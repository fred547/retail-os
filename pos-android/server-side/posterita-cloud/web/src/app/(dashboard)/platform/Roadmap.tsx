"use client";

type Status = "done" | "partial" | "planned" | "future";

interface Feature {
  name: string;
  status: Status;
  detail?: string;
}

interface Module {
  id: number;
  name: string;
  status: Status;
  features: Feature[];
}

interface Phase {
  name: string;
  label: string;
  modules: Module[];
}

const phases: Phase[] = [
  {
    name: "Phase 1",
    label: "Retail Core",
    modules: [
      {
        id: 1, name: "POS & Checkout", status: "done",
        features: [
          { name: "Product grid with category tabs", status: "done" },
          { name: "Cart with qty/price/discount editing", status: "done" },
          { name: "Barcode scanner (camera + BT HID)", status: "done" },
          { name: "Hold orders / park sale", status: "done" },
          { name: "Refund / credit flow", status: "done" },
          { name: "Multi-payment split (cash + card)", status: "done" },
          { name: "Customer selection at checkout", status: "done" },
          { name: "Order type dialog (dine-in/takeaway/delivery)", status: "done" },
        ],
      },
      {
        id: 2, name: "Product & Catalogue", status: "done",
        features: [
          { name: "Products CRUD (web console)", status: "done" },
          { name: "Categories with tax mapping", status: "done" },
          { name: "Modifiers & variants (walkthrough dialog)", status: "done" },
          { name: "AI product import (Claude Haiku)", status: "done" },
          { name: "Product intake pipeline (draft→review→live)", status: "done" },
          { name: "PDF catalogue (grid/list/price-list/loyalty cards)", status: "done" },
          { name: "QR codes on catalogue", status: "done" },
          { name: "Square product images (800x800, cover crop)", status: "done" },
          { name: "Serialized products (VIN/IMEI tracking)", status: "done" },
          { name: "Product image on Cloudinary", status: "done" },
        ],
      },
      {
        id: 3, name: "Inventory & Stock Control", status: "done",
        features: [
          { name: "Inventory count sessions (spot check)", status: "done" },
          { name: "Barcode scan during count", status: "done" },
          { name: "Serial item tracking (VIN/IMEI)", status: "done" },
          { name: "Stock deduction on sale", status: "done", detail: "Auto-decrement quantity_on_hand on sync, stock_journal audit trail, manual adjustments" },
          { name: "Qty difference display (counted vs booked)", status: "done", detail: "Variance tracking: system_qty vs counted, per-item display" },
          { name: "Expiry & batch tracking", status: "done", detail: "Product expiry_date + batch_number columns, expiry index" },
          { name: "Low stock alerts & reorder points", status: "done", detail: "Warehouse hub with low-stock filtering and alerts" },
          { name: "Export count to XLS/CSV", status: "done", detail: "CSV export from inventory count sessions" },
          { name: "Audio beep on scan confirmation", status: "done", detail: "Scan beep feedback on barcode confirmation" },
          { name: "Stock transfer between stores", status: "done", detail: "Inter-store stock transfer workflow" },
          { name: "Picking list workflow", status: "done", detail: "Load picking doc → scan items → complete" },
          { name: "Put-away workflow", status: "done", detail: "Scan item → assign shelf location" },
          { name: "Multi-warehouse stock view", status: "done", detail: "Browse all products with filters across stores" },
          { name: "Cycle count (full stock count)", status: "done", detail: "Full count sessions with variance tracking and reconciliation" },
          { name: "Stock adjustment (manual +/-)", status: "done", detail: "Manual stock adjustments with journal audit trail" },
        ],
      },
      {
        id: 3.5, name: "Product Tags & Classification", status: "done",
        features: [
          { name: "Tag groups (Season, Margin, Dietary)", status: "done", detail: "CRUD, color-coded, accordion UI" },
          { name: "Tags within groups (many-to-many)", status: "done", detail: "Product ↔ tag, customer ↔ tag, order ↔ tag junctions" },
          { name: "Bulk assign/remove tags", status: "done", detail: "POST /api/tags/assign with entity_type + entity_ids" },
          { name: "Sales by tag report", status: "done", detail: "Revenue/qty/orders breakdown by tag with date range" },
          { name: "Tag sync to Android", status: "done", detail: "TagGroup, Tag, ProductTag Room entities + CloudSync pull" },
        ],
      },
      {
        id: 4, name: "Payments & Tendering", status: "partial",
        features: [
          { name: "Cash payment with change calculation", status: "done" },
          { name: "Card payment recording", status: "done" },
          { name: "Blink QR code payment", status: "done" },
          { name: "Multi-tender split payments", status: "done" },
          { name: "Voucher / on-account payment", status: "done" },
          { name: "Forex payment (foreign currency)", status: "done" },
          { name: "Juice MCB mobile payment", status: "planned", detail: "MCB Juice QR integration" },
          { name: "MAUCAS QR payment", status: "planned" },
          { name: "Peach Payments card terminal SDK", status: "planned", detail: "Physical card terminal integration" },
        ],
      },
      {
        id: 5, name: "Invoicing, Fiscalisation & MRA", status: "done",
        features: [
          { name: "MRA EBS client (RSA+AES encryption)", status: "done" },
          { name: "Authenticated invoice transmission", status: "done" },
          { name: "Invoice hash chain linking (SHA-256)", status: "done" },
          { name: "BRN + TAN on every receipt", status: "done" },
          { name: "Fiscal ID on receipt (reprint)", status: "done" },
          { name: "Tax settings page (web console)", status: "done" },
          { name: "MRA dashboard (platform tab)", status: "done" },
          { name: "MRA status on orders page", status: "done" },
          { name: "Async filing with cron retry (15 min)", status: "done" },
          { name: "Offline resilience (90-day filing window)", status: "done" },
          { name: "Credit note / debit note support", status: "planned" },
          { name: "BRN format validation", status: "planned" },
        ],
      },
      {
        id: 6, name: "Receipts & Billing", status: "partial",
        features: [
          { name: "Thermal receipt (ESC/POS network)", status: "done" },
          { name: "Bluetooth receipt printing", status: "done" },
          { name: "Kitchen ticket with station header", status: "done" },
          { name: "Queue ticket (order number)", status: "done" },
          { name: "Close till receipt", status: "done" },
          { name: "WhatsApp QR on receipt", status: "done" },
          { name: "WhatsApp receipt sharing (send after sale)", status: "planned", detail: "Blocked: need phone + Meta verification" },
          { name: "Network print relay (HTTP → printer)", status: "planned", detail: "From legacy print-server: consolidate with KDS NanoHTTPD server" },
          { name: "Automatic printer discovery", status: "planned", detail: "From legacy print-server: detect available printers on network" },
          { name: "Shelf label printing (ZPL/EPL)", status: "partial", detail: "Android shelf browser + print stub, Zebra integration pending" },
          { name: "SMS receipt", status: "future" },
          { name: "Email receipt", status: "future" },
        ],
      },
      {
        id: 7, name: "Staff & Workforce", status: "partial",
        features: [
          { name: "Users CRUD (owner/admin/supervisor/cashier/staff)", status: "done" },
          { name: "PIN login + lock screen (30-min timeout)", status: "done" },
          { name: "Role-based UI visibility", status: "done" },
          { name: "Owner email shown on home screen", status: "done" },
          { name: "Shift clock in/out", status: "done", detail: "Clock in/out API, hours computation, break tracking, dashboard" },
          { name: "Staff scheduling", status: "future" },
          { name: "Commission tracking", status: "future" },
        ],
      },
      {
        id: 8, name: "Customer & Loyalty", status: "partial",
        features: [
          { name: "Customer CRUD (search, create, link to order)", status: "done" },
          { name: "Customer on POS drawer", status: "done" },
          { name: "Customer on web console", status: "done" },
          { name: "Loyalty points (earn on purchase)", status: "done", detail: "Auto-earn on sync, config, wallet dashboard" },
          { name: "Loyalty redeem at POS", status: "done", detail: "API + web console redeem flow" },
          { name: "Loyalty cards (PDF catalogue template)", status: "done" },
          { name: "Customer-facing display", status: "future" },
        ],
      },
      {
        id: 9, name: "Promotions & Discounts", status: "partial",
        features: [
          { name: "Discount codes on orders", status: "done" },
          { name: "Per-line discount (amount/percentage)", status: "done" },
          { name: "Promotions engine (auto-apply, time-based)", status: "done", detail: "4 types, validate endpoint, time/day/min-order rules, usage tracking" },
          { name: "Coupon management", status: "done", detail: "Promo codes with max uses + per-customer limits" },
        ],
      },
      {
        id: 10, name: "Reporting & Business Intelligence", status: "partial",
        features: [
          { name: "Dashboard with order/revenue/customer summary", status: "done" },
          { name: "Orders list with filters", status: "done" },
          { name: "Till history with cash reconciliation", status: "done" },
          { name: "Error logs dashboard", status: "done" },
          { name: "Sync monitor", status: "done" },
          { name: "Z-report / daily summary", status: "done", detail: "End-of-day summary: payment breakdown, till sessions, tax/discount/void totals, CSV export" },
          { name: "Daily item sales report", status: "planned", detail: "From legacy restaurant: top sellers, qty, revenue per product" },
          { name: "Kitchen order report (KOT audit)", status: "planned", detail: "From legacy restaurant: full print history with reprint tracking" },
          { name: "Price change audit", status: "planned", detail: "From legacy restaurant: who changed what price when" },
          { name: "Sales analytics (trends, best sellers)", status: "planned" },
          { name: "Export to CSV/Excel", status: "done", detail: "CSV export on Products + Orders pages, shared downloadCsv utility" },
        ],
      },
      {
        id: 11, name: "Offline Architecture & Sync Engine", status: "done",
        features: [
          { name: "Room DB (offline-first, per-brand)", status: "done" },
          { name: "CloudSyncWorker (periodic 5-min)", status: "done" },
          { name: "Multi-brand sync (active first, then others)", status: "done" },
          { name: "Sync hardening (6 features)", status: "done" },
          { name: "Till UUID linking (survives sync failures)", status: "done" },
          { name: "Integrity check (reset on empty DB)", status: "done" },
          { name: "Payload checksum (SHA-256)", status: "done" },
          { name: "Conflict detection (stale overwrite prevention)", status: "done" },
          { name: "Batch sync push (N+1 elimination)", status: "done", detail: "Stock deduction + loyalty earn via RPC, bulk upsert for order lines + payments" },
          { name: "Paginated sync pull", status: "done", detail: "Products + customers paginated (1000/page), has_more flags, Android auto-loops pages" },
          { name: "Room Paging 3 for products", status: "done", detail: "PagingSource queries for large catalogs (5000+ products), category + search paging" },
        ],
      },
      {
        id: 12, name: "Mobile Experience & Device Support", status: "done",
        features: [
          { name: "Android POS (Kotlin, Room, Hilt)", status: "done" },
          { name: "Multi-module Gradle (:core:database/common/network/sync)", status: "done" },
          { name: "Terminal types (retail/restaurant/KDS/staff)", status: "done" },
          { name: "Connectivity monitor (green/red dot)", status: "done" },
          { name: "6-app dashboard (POS/Warehouse/CRM/Logistics/Admin/Sync)", status: "done" },
          { name: "WebView integration (OTT auth)", status: "done" },
        ],
      },
      {
        id: 13, name: "Admin, Config & Localisation", status: "done",
        features: [
          { name: "Settings page (store, currency, AI key, tax config)", status: "done" },
          { name: "Brand management (create demo, switch brands)", status: "done" },
          { name: "Store/terminal CRUD", status: "done" },
          { name: "Platform portal (14 tabs)", status: "done" },
          { name: "Account manager portal", status: "done" },
          { name: "Super admin impersonation", status: "done" },
        ],
      },
      {
        id: 14, name: "User Management, Permissions & Audit", status: "partial",
        features: [
          { name: "Role-based access (owner/admin/supervisor/cashier)", status: "done" },
          { name: "Audit events table", status: "done" },
          { name: "createdby/updatedby tracking on products", status: "done" },
          { name: "Granular permissions UI", status: "planned" },
          { name: "Audit trail viewer", status: "planned" },
        ],
      },
      {
        id: 15, name: "Customer-Facing Experiences", status: "planned",
        features: [
          { name: "Customer display (cart mirror)", status: "planned", detail: "terminal_type = customer_display" },
          { name: "Self-service ordering kiosk", status: "future", detail: "terminal_type = self_service" },
        ],
      },
      {
        id: 16, name: "Real-Time Fraud Monitoring", status: "planned",
        features: [
          { name: "Void tracking & alerts", status: "planned" },
          { name: "Discount abuse detection", status: "planned" },
          { name: "Cash discrepancy alerts", status: "partial", detail: "Till close shows discrepancy amount" },
          { name: "Cash drawer open log", status: "planned", detail: "From legacy restaurant: OPEN_DRAWER table — who opened, reason, when" },
          { name: "Receipt reprint audit trail", status: "planned", detail: "From legacy restaurant: RE_PRINT table — who reprinted what order when" },
          { name: "Cashier control reconciliation", status: "planned", detail: "From legacy restaurant: beginning balance → cash entered → difference" },
        ],
      },
      {
        id: 17, name: "Integrations & API Framework", status: "partial",
        features: [
          { name: "REST sync API (v2)", status: "done" },
          { name: "Blink payment integration", status: "done" },
          { name: "Cloudinary image hosting", status: "done" },
          { name: "MRA EBS e-invoicing API", status: "done" },
          { name: "Xero accounting integration", status: "done", detail: "OAuth 2.0, invoice/payment push, credit notes, journal entries, account mapping config" },
          { name: "Rate limiting on API routes", status: "done", detail: "30 req/min per IP on sync, 429 with Retry-After" },
          { name: "Open API documentation", status: "planned" },
          { name: "Webhook framework", status: "partial" },
          { name: "QuickBooks integration", status: "planned" },
          { name: "Shopify integration", status: "planned" },
        ],
      },
      {
        id: 18, name: "Supplier & Purchase Order Management", status: "partial",
        features: [
          { name: "Supplier directory", status: "done", detail: "CRUD, search, soft delete" },
          { name: "Purchase order creation", status: "done", detail: "PO with lines, status workflow" },
          { name: "Goods received note (GRN)", status: "done", detail: "Receive → stock update + journal" },
          { name: "Cost price tracking from PO", status: "planned" },
          { name: "Supplier performance metrics", status: "future" },
        ],
      },
    ],
  },
  {
    name: "Phase 2",
    label: "Restaurant & F&B",
    modules: [
      {
        id: 19, name: "Table & Floor Management", status: "done",
        features: [
          { name: "Table sections/zones (Indoor, Patio, Bar, Takeaway)", status: "done" },
          { name: "Table management with occupancy", status: "done" },
          { name: "Table transfer (move order between tables)", status: "done" },
          { name: "Order merge (combine two tables)", status: "done" },
          { name: "Table reservation system", status: "planned", detail: "From legacy restaurant: reserve → cancel, waiter assignment, status (A/R/O/B)" },
          { name: "Visual floor map", status: "planned" },
        ],
      },
      {
        id: 20, name: "Kitchen Order Ticket (KOT) & KDS", status: "done",
        features: [
          { name: "KOT printing with station routing", status: "done" },
          { name: "Station resolver (product override → category mapping → default)", status: "done" },
          { name: "KDS display (full-screen, bump/recall, timers)", status: "done" },
          { name: "KDS via LAN (mDNS discovery, NanoHTTPD server)", status: "done" },
          { name: "Station name on kitchen receipts", status: "done" },
        ],
      },
      {
        id: 21, name: "Menu, Modifiers & Scheduling", status: "done",
        features: [
          { name: "Modifier walkthrough dialog", status: "done" },
          { name: "Category-based modifiers", status: "done" },
          { name: "Product-level modifiers", status: "done" },
          { name: "Menu scheduling (breakfast/lunch/dinner)", status: "done", detail: "CRUD, day-of-week, priority, active endpoint" },
        ],
      },
      {
        id: 22, name: "QSR Speed Mode", status: "partial",
        features: [
          { name: "Queue ticket printing (order number)", status: "done" },
          { name: "Takeaway section auto-numbering", status: "done" },
          { name: "Speed checkout mode", status: "planned" },
        ],
      },
      {
        id: 23, name: "Order Types & Delivery", status: "partial",
        features: [
          { name: "Dine-in / takeaway / delivery selection", status: "done" },
          { name: "Delivery address + phone capture", status: "done" },
          { name: "Driver assignment & status tracking", status: "done", detail: "Full delivery dashboard with 7-step status workflow" },
          { name: "Delivery zone management", status: "future" },
        ],
      },
      {
        id: 24, name: "Batch Production Module (Bakery)", status: "planned",
        features: [
          { name: "Production recipes (BOM)", status: "planned" },
          { name: "Batch planning & scheduling", status: "planned" },
          { name: "Ingredient deduction on production", status: "planned" },
        ],
      },
      {
        id: 25, name: "Café Modifier & Loyalty Pack", status: "partial",
        features: [
          { name: "Size/milk/extra modifiers", status: "done", detail: "Handled by modifier walkthrough" },
          { name: "Café-specific loyalty tiers", status: "planned" },
        ],
      },
    ],
  },
  {
    name: "Phase 3",
    label: "Segment Extensions",
    modules: [
      { id: 26, name: "Pharmacy — Prescription & Compliance", status: "future", features: [
        { name: "Prescription tracking", status: "future" },
        { name: "Controlled substance logging", status: "future" },
        { name: "Drug interaction warnings", status: "future" },
      ]},
      { id: 27, name: "Spa & Salon — Appointments & Commissions", status: "future", features: [
        { name: "Appointment calendar", status: "future" },
        { name: "Staff commissions", status: "future" },
        { name: "Service duration tracking", status: "future" },
      ]},
      { id: 28, name: "Freelancers — Quote, Invoice & Calendar", status: "future", features: [
        { name: "Quote generation", status: "future" },
        { name: "Invoice from quote", status: "future" },
        { name: "Calendar integration", status: "future" },
      ]},
      { id: 29, name: "Vehicle Services — Plate CRM & Job Billing", status: "partial", features: [
        { name: "VIN/serial number tracking", status: "done" },
        { name: "Warranty tracking (starts at delivery)", status: "done" },
        { name: "Serial item lifecycle (received→in_stock→sold→delivered)", status: "done" },
        { name: "Plate CRM (vehicle registration lookup)", status: "planned" },
        { name: "Job card / service billing", status: "planned" },
      ]},
      { id: 30, name: "Field Sales — Mobile Catalogue & Credit", status: "future", features: [
        { name: "Mobile product catalogue", status: "future" },
        { name: "Credit limit management", status: "future" },
        { name: "Route planning", status: "future" },
      ]},
      { id: 31, name: "Contractors — Job Card & Van Stock", status: "future", features: [
        { name: "Job card management", status: "future" },
        { name: "Van stock tracking", status: "future" },
      ]},
      { id: 32, name: "Mobile Vans — Van Ops & Replenishment", status: "future", features: [
        { name: "Van inventory", status: "future" },
        { name: "Replenishment orders", status: "future" },
      ]},
      { id: 33, name: "Event Sales — Setup Wizard & Recap", status: "future", features: [
        { name: "Event setup wizard", status: "future" },
        { name: "Event recap/summary", status: "future" },
      ]},
      { id: 34, name: "Microentrepreneurs — Simple POS", status: "future", features: [
        { name: "Simplified single-screen POS", status: "future" },
        { name: "Basic reporting", status: "future" },
      ]},
      { id: 35, name: "Multi-Store & Franchise Operations", status: "partial", features: [
        { name: "Multi-store management (web console)", status: "done" },
        { name: "Multi-brand support (per-brand Room DB)", status: "done" },
        { name: "Cross-store analytics", status: "planned" },
        { name: "Franchise royalty reporting", status: "future" },
      ]},
    ],
  },
  {
    name: "Phase 4",
    label: "Future",
    modules: [
      { id: 36, name: "QR Scan Actions", status: "planned", features: [
        { name: "ScanActionRouter (central dispatcher)", status: "planned", detail: "Routes posterita:// URIs to handlers by prefix" },
        { name: "Staff badge (clock in/out, break)", status: "planned", detail: "Badge UUID on pos_user, context-aware in/out toggle" },
        { name: "Switch cashier (badge + PIN)", status: "planned", detail: "Lock current user, scan badge, verify PIN" },
        { name: "Supervisor auth (void/refund/drawer/discount)", status: "planned", detail: "Badge + PIN replaces password prompt for high-risk actions" },
        { name: "Customer loyalty card link", status: "planned", detail: "Scan loyalty card → attach customer to cart" },
        { name: "Coupon/promo QR apply", status: "planned", detail: "Scan promo code → auto-apply discount with expiry validation" },
        { name: "Recall hold order by QR", status: "planned", detail: "Print QR on park receipt, scan to resume cart" },
        { name: "Receipt QR recall for refund", status: "planned", detail: "Scan receipt → load original order for return" },
        { name: "Table QR (open order / claim table)", status: "planned", detail: "Restaurant: skip floor map, auto-select table" },
        { name: "KDS/queue bump by scan", status: "planned", detail: "Scan order ticket → mark ready / collected" },
        { name: "Warehouse scan flows (put-away, pick, transfer, GRN)", status: "partial", detail: "Shelf/picking/transfer QRs — partially built, needs router" },
        { name: "Logistics (assign driver, delivery confirm)", status: "planned", detail: "Driver scans order QR at pickup and delivery" },
        { name: "Device setup (printer, KDS, WiFi, config QR)", status: "planned", detail: "Scan-to-pair for printers, KDS, WiFi, batch terminal config" },
        { name: "Customer-facing (product info, catalogue, digital receipt)", status: "planned", detail: "Customer phone scans shelf/receipt/store QRs" },
        { name: "Scan action audit log", status: "planned", detail: "scan_action_log table with WiFi SSID for location proof" },
        { name: "Anti-fraud (rate limit, geo-check, dual-store alert)", status: "planned", detail: "Prevent buddy punching and badge sharing" },
      ]},
      { id: 37, name: "PWA Offline POS (Windows/Mac)", status: "done", features: [
        { name: "PWA manifest + service worker", status: "done", detail: "Installable from Chrome/Edge, standalone window, offline app shell" },
        { name: "IndexedDB data layer (Dexie.js)", status: "done", detail: "21 tables mirroring Room schema, full CRUD" },
        { name: "Sync engine (bidirectional)", status: "done", detail: "Same /api/sync endpoint as Android, push orders + pull products, paginated, 5-min cycle" },
        { name: "POS checkout UI", status: "done", detail: "Product grid + cart + payment dialog, dark theme, all from IndexedDB" },
        { name: "USB barcode scanner", status: "done", detail: "Keyboard event listener, auto-detect rapid input + Enter" },
        { name: "Till open/close lifecycle", status: "done", detail: "Two-pass sync, session totals, cash discrepancy" },
        { name: "Network receipt printing", status: "done", detail: "ESC/POS builder → TCP relay API → thermal printer (SSRF-protected)" },
        { name: "PIN lock screen", status: "done", detail: "4-digit numpad, 30-min idle timeout, validates against IndexedDB" },
        { name: "Offline integrity checks", status: "done", detail: "Startup validation: products vs sync timestamp, orphaned data cleanup" },
        { name: "Download page", status: "done", detail: "/download — APK link + PWA install guide for Windows/Mac" },
        { name: "Keyboard shortcuts", status: "done", detail: "F1 search, F2 pay, F3 till, Esc cancel" },
      ]},
      { id: 37.5, name: "Warehouse & Store Layout", status: "done", features: [
        { name: "Store layout zones (shelf ranges + height labels)", status: "done", detail: "Configurable per store, web UI with interactive grid" },
        { name: "Store type (retail/warehouse)", status: "done", detail: "store.store_type column, UI in stores page" },
        { name: "Shelf browser (Android)", status: "done", detail: "Browse by shelf number, chip filters, long-press to print" },
        { name: "Drag-and-drop reordering (categories + zones)", status: "done", detail: "Native HTML5 DnD, position updates persist to DB" },
      ]},
      { id: 37.6, name: "Web Console UX Polish", status: "done", features: [
        { name: "Collapsible sidebar sections", status: "done", detail: "Chevron toggles, auto-expand active section" },
        { name: "Smart sidebar (feature-gated)", status: "done", detail: "Auto-hides Restaurant/Serial/Delivery if unused, Show All toggle" },
        { name: "Confirm dialogs on all destructive actions", status: "done", detail: "Promotions, tags, deliveries, store layout" },
        { name: "Toast feedback on save/delete", status: "done", detail: "Auto-dismiss green banner on 4 pages" },
        { name: "Consistent accent colors (posterita-blue)", status: "done", detail: "All primary buttons standardized across 5 pages" },
        { name: "Consistent modal pattern (bottom sheet)", status: "done", detail: "Drag handle + rounded corners on all 5 edit modals" },
        { name: "Breadcrumbs on all pages", status: "done", detail: "Added to 10 pages that were missing them" },
        { name: "Orders search + date range picker", status: "done", detail: "Search by doc#/customer, from/to dates, combinable with status" },
        { name: "CSV export (Products + Orders)", status: "done", detail: "Shared downloadCsv utility, configurable columns" },
        { name: "Bulk actions on Products", status: "done", detail: "Checkboxes, select all, floating bar, bulk deactivate/delete" },
        { name: "Inline price editing", status: "done", detail: "Click price in product table → edit in place → Enter to save" },
        { name: "Keyboard shortcuts (/ to search)", status: "done", detail: "Global hook, skips when in input fields" },
        { name: "Pagination (Previous/Next)", status: "done", detail: "Replaced 100-button pagination with clean prev/next" },
        { name: "Error banners on pages", status: "done", detail: "Visible error state on deliveries, promotions, tags, store layout" },
        { name: "Improved empty states", status: "done", detail: "Rich icon + heading + description on 3 pages" },
        { name: "Multi-currency support", status: "done", detail: "Shared formatCurrency() uses brand currency, not hardcoded MUR" },
        { name: "Download POS App link", status: "done", detail: "Sidebar link → GitHub Releases /latest, auto-updates on new version" },
      ]},
      { id: 37.7, name: "Contextual Help System", status: "done", features: [
        { name: "Help bottom sheet (Android)", status: "done", detail: "? button on 8 screens, bullet-point help, no training needed" },
        { name: "HelpContent.kt (16 screens)", status: "done", detail: "Home, POS, cart, payment, warehouse, picking, put-away, stock, CRM, logistics" },
      ]},
      { id: 37.8, name: "Quality & DevOps", status: "done", features: [
        { name: "1,569 automated tests", status: "done", detail: "583 Android + 522 web + 413 scenario + 45 E2E + 106 Firebase" },
        { name: "POS smoke test (IndexedDB schema validation)", status: "done", detail: "Catches missing Dexie indexes before deploy" },
        { name: "39 API routes with DB error logging", status: "done", detail: "Every catch block logs to error_logs table" },
        { name: "GitHub Actions CI/CD", status: "done", detail: "Web tests + Android tests + E2E on every push to main" },
        { name: "Dexie version management (v1→v3)", status: "done", detail: "Proper IndexedDB migrations, no data loss on upgrade" },
        { name: "Test account isolation (type=testing)", status: "done", detail: "41 scenario files fixed, CHECK constraint enforced" },
        { name: "account_id on orderline/payment", status: "done", detail: "Migration 00049, backfilled, indexed, RLS enabled" },
      ]},
      { id: 38, name: "Self-Checkout Kiosks", status: "future", features: [
        { name: "Customer-facing checkout UI", status: "future" },
        { name: "Payment integration", status: "future" },
      ]},
      { id: 39, name: "Experimental Features", status: "future", features: [
        { name: "AI chat assistant (Claude tool-use)", status: "future" },
        { name: "WhatsApp AI support channel", status: "planned", detail: "Blocked: phone + Meta verification" },
        { name: "Shelf labels (Zebra ZPL + Epson EPL)", status: "planned", detail: "Legacy barcode app logic ready to port" },
        { name: "Google Sign-In", status: "future" },
      ]},
    ],
  },
];

const statusConfig = {
  done:    { bg: "bg-green-100", text: "text-green-700", label: "Done", dot: "bg-green-500" },
  partial: { bg: "bg-blue-100",  text: "text-blue-700",  label: "In Progress", dot: "bg-blue-500" },
  planned: { bg: "bg-amber-100", text: "text-amber-700", label: "Planned", dot: "bg-amber-500" },
  future:  { bg: "bg-gray-100",  text: "text-gray-400",  label: "Future", dot: "bg-gray-300" },
};

function StatusBadge({ status }: { status: Status }) {
  const c = statusConfig[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

function FeatureCheck({ f }: { f: Feature }) {
  const icon = f.status === "done" ? "✓" : f.status === "partial" ? "◐" : f.status === "planned" ? "○" : "·";
  const color = f.status === "done" ? "text-green-600" : f.status === "partial" ? "text-blue-600" : f.status === "planned" ? "text-amber-600" : "text-gray-300";
  return (
    <li className="flex items-start gap-2 text-sm py-0.5">
      <span className={`${color} mt-0.5 font-bold w-4 text-center flex-shrink-0`}>{icon}</span>
      <div>
        <span className={f.status === "future" ? "text-gray-400" : "text-gray-700"}>{f.name}</span>
        {f.detail && <span className="text-gray-400 text-xs ml-1">— {f.detail}</span>}
      </div>
    </li>
  );
}

export default function Roadmap() {
  // Stats
  const allModules = phases.flatMap(p => p.modules);
  const allFeatures = allModules.flatMap(m => m.features);
  const doneFeatures = allFeatures.filter(f => f.status === "done").length;
  const totalFeatures = allFeatures.length;

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{allModules.length}</p>
          <p className="text-xs text-gray-500">Modules</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{doneFeatures}</p>
          <p className="text-xs text-gray-500">Features Done</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{allFeatures.filter(f => f.status === "planned").length}</p>
          <p className="text-xs text-gray-500">Planned</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{allFeatures.filter(f => f.status === "future").length}</p>
          <p className="text-xs text-gray-500">Future</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-posterita-blue">{Math.round((doneFeatures / totalFeatures) * 100)}%</p>
          <p className="text-xs text-gray-500">Complete</p>
        </div>
      </div>

      {/* Phases */}
      {phases.map((phase) => (
        <div key={phase.name}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {phase.name} — {phase.label}
          </h2>
          <div className="space-y-3">
            {phase.modules.map((mod) => (
              <details key={mod.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusConfig[mod.status].dot}`} />
                  <span className="font-medium text-gray-900 flex-1">
                    <span className="text-gray-400 text-sm mr-2">#{mod.id}</span>
                    {mod.name}
                  </span>
                  <StatusBadge status={mod.status} />
                  <span className="text-xs text-gray-400">
                    {mod.features.filter(f => f.status === "done").length}/{mod.features.length}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </summary>
                <div className="px-5 pb-4 pt-1 border-t border-gray-50">
                  <ul className="space-y-0.5">
                    {mod.features.map((f, i) => <FeatureCheck key={i} f={f} />)}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
