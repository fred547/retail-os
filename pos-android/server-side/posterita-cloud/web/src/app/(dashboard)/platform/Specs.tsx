"use client";

import { useState } from "react";
import {
  Layers, Database, RefreshCw, Shield, Globe, AlertTriangle,
  ChevronRight, ArrowRight, ArrowLeft, ArrowLeftRight, Check, Minus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

type SectionKey = "architecture" | "data-model" | "sync" | "roles" | "api" | "rules";

interface Section {
  key: SectionKey;
  label: string;
  icon: any;
  description: string;
}

const sections: Section[] = [
  { key: "architecture", label: "Architecture", icon: Layers, description: "Stack, diagram, design principles" },
  { key: "data-model", label: "Data Model", icon: Database, description: "Entities, schema decisions, column gotchas" },
  { key: "sync", label: "Sync Protocol", icon: RefreshCw, description: "Direction, hardening, till sync" },
  { key: "roles", label: "Roles & Permissions", icon: Shield, description: "3 active roles, 18 capabilities" },
  { key: "api", label: "API Routes", icon: Globe, description: "30 domains, key endpoints" },
  { key: "rules", label: "Architecture Rules", icon: AlertTriangle, description: "17 non-negotiable constraints" },
];

// ── Architecture Data ──────────────────────────────────────

const designPrinciples = [
  { name: "Offline-first", detail: "Every store-floor operation works without connectivity and reconciles cleanly when connectivity returns." },
  { name: "Capability-driven", detail: "What a user sees is a function of their role, device assignment, and store context. No hardcoded screen lists." },
  { name: "Auditable by default", detail: "Every mutation of business consequence produces an audit event. No silent writes." },
  { name: "AI-operable", detail: "The system exposes CLI, API, MCP, and queue-based interfaces so agents can participate in operations." },
  { name: "Architecture-first", detail: "Existing code is evaluated for reuse, but long-term architecture always wins over preserving short-term work." },
  { name: "Scan-only inventory", detail: "Inventory count is performed entirely by scanning. No manual data entry." },
  { name: "Catalogue-as-product", detail: "POS product selection doubles as the source for printed catalogue PDFs, barcode labels, and showroom materials." },
  { name: "QR-first acquisition", detail: "Every QR code in the physical environment funnels into WhatsApp for loyalty onboarding." },
  { name: "Super app architecture", detail: "Android is a shell hosting multiple modules (POS, Loyalty, Inventory, Staff). Users see a home grid filtered by role." },
];

const stackLayers = [
  { layer: "Android", tech: "Kotlin, Gradle, multi-module", responsibility: "Store-floor operations, offline-first, capability-driven UI" },
  { layer: "Web Console", tech: "Next.js 16 on Vercel", responsibility: "Admin CRUD, reports, campaigns, operations oversight" },
  { layer: "Backend API", tech: "Express/Node.js on Render", responsibility: "Business APIs, sync orchestration, webhooks, cron" },
  { layer: "Database", tech: "Supabase Postgres", responsibility: "Sole operational source of truth, RLS, Auth, Realtime" },
  { layer: "Auth", tech: "Supabase Auth + OTT + PIN", responsibility: "Web login, Android login, WebView OTT, device PIN unlock" },
  { layer: "Media", tech: "Cloudinary", responsibility: "Product images (800x800, auto-transform w_400,h_400,c_fill)" },
  { layer: "AI", tech: "Claude Haiku 4.5 + Sonnet 4.6", responsibility: "AI product import/discovery, intake processing" },
  { layer: "Payments", tech: "Blink SDK", responsibility: "QR code payment integration at POS" },
  { layer: "CI/Testing", tech: "Firebase Test Lab", responsibility: "Android instrumented tests on real devices" },
];

const keyBoundaries = [
  { rule: "Android never talks to Supabase directly", detail: "All data flows through /api/sync" },
  { rule: "Server is source of truth for master data", detail: "Products, categories, taxes, stores flow one way: server to device (pull only)" },
  { rule: "Web console reads Supabase directly", detail: "All mutations go through API routes" },
  { rule: "Context = account_id + store_id + terminal_id", detail: "Every query is scoped to this triple" },
  { rule: "AI agents use CLI/MCP/API/queues", detail: "Never Android UI automation" },
  { rule: "All errors logged to error_logs table", detail: "Android via AppErrorLogger, web via error-logger.ts, never silent catch" },
];

const architectureDiagram = `
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502                         CONTROL PLANE                       \u2502
\u2502  Users \u00B7 Devices \u00B7 Stores \u00B7 Terminals \u00B7 Audit \u00B7 Shifts    \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
              \u2502                               \u2502
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510        \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502   ANDROID SHELL     \u2502        \u2502   WEB CONSOLE           \u2502
   \u2502   (Store Floor)     \u2502        \u2502   (Back Office)          \u2502
   \u2502                     \u2502        \u2502                          \u2502
   \u2502  Offline-First DB   \u2502        \u2502  Device Allocation       \u2502
   \u2502  Sync Engine        \u2502        \u2502  Reports & Analytics     \u2502
   \u2502  POS + Payments     \u2502        \u2502  Campaigns & Vouchers    \u2502
   \u2502  Inventory Count    \u2502        \u2502  Loyalty & Consent       \u2502
   \u2502  Kitchen / KDS      \u2502        \u2502  Supplier & PO Mgmt     \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518        \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
              \u2502                               \u2502
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502                 BACKEND PLATFORM (Render)                \u2502
   \u2502                                                          \u2502
   \u2502  API Routes         Webhooks           Cron Jobs         \u2502
   \u2502  Sync orchestration WhatsApp relay      Error cleanup    \u2502
   \u2502  Auth + OTT         Payment callbacks   Sync log purge   \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
              \u2502                   \u2502                 \u2502
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u25BC\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502  Supabase Postgres  \u2502  \u2502 Cloudinary \u2502  \u2502  Firebase      \u2502
   \u2502  (source of truth)  \u2502  \u2502 (media)    \u2502  \u2502  (Test Lab)    \u2502
   \u2502  Auth \u00B7 RLS \u00B7 RT     \u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`;

// ── Data Model Data ────────────────────────────────────────

const entityGroups = [
  { name: "Organization & Structure", color: "bg-blue-100 text-blue-700", entities: ["owner", "account", "store", "terminal", "printer", "table_section", "preparation_station", "category_station_mapping"] },
  { name: "Identity & Access", color: "bg-purple-100 text-purple-700", entities: ["pos_user", "account_manager", "owner_account_session"] },
  { name: "POS & Transactions", color: "bg-green-100 text-green-700", entities: ["orders", "orderline", "payment", "till", "cash_movement"] },
  { name: "Customer & Loyalty", color: "bg-pink-100 text-pink-700", entities: ["customer", "loyalty_config"] },
  { name: "Products & Catalogue", color: "bg-amber-100 text-amber-700", entities: ["product", "productcategory", "tax", "modifier", "modifier_option", "product_intake", "serial_item"] },
  { name: "Inventory & Warehouse", color: "bg-teal-100 text-teal-700", entities: ["stock_journal", "inventory_count_session", "inventory_count_entry"] },
  { name: "Suppliers & Procurement", color: "bg-orange-100 text-orange-700", entities: ["supplier", "purchase_order", "purchase_order_line"] },
  { name: "Operations", color: "bg-indigo-100 text-indigo-700", entities: ["promotion", "delivery", "shift", "menu_schedule", "menu_schedule_category"] },
  { name: "Compliance & Audit", color: "bg-red-100 text-red-700", entities: ["error_logs", "sync_request_log", "audit_event", "ci_report", "mra_invoice"] },
];

const schemaDecisions = [
  "account_id is TEXT everywhere (not UUID) — legacy compatibility.",
  "Soft deletes on key tables: is_deleted + deleted_at instead of hard DELETE.",
  "Immutable orders — once completed, only refundable via linked refund order.",
  "Temporal columns on all tables: created_at, updated_at, deleted_at.",
  "idempotency_key on mutation-accepting tables for offline push replay.",
  "RLS policies enforce tenant isolation at the Supabase level.",
  "Cloud-authoritative IDs — server assigns all PKs, Android uses server-assigned IDs.",
  "Wallet balance is denormalized — loyalty_wallet.balance = SUM(points_change). Nightly reconciliation verifies.",
  "No PostgREST FK joins — cross-tenant FKs dropped. Use separate queries and map manually.",
  "Passwords never stored locally — only Supabase Auth holds passwords. Room DB stores PINs only.",
  "till.status exists only in Supabase — Android derives open/closed from dateClosed.",
  "serial_item.warranty_expiry is auto-computed (delivered_date + warranty_months).",
];

const columnGotchas: { table: string; has: string; doesNotHave: string }[] = [
  { table: "store", has: "name, address, city, state, zip, country, currency, isactive", doesNotHave: "phone, email, tax_number" },
  { table: "productcategory", has: "name, position, isactive, display", doesNotHave: "description" },
  { table: "pos_user", has: "user_id, username, firstname, pin, role, email", doesNotHave: "store_id" },
  { table: "owner", has: "id, auth_uid, email, phone, name", doesNotHave: "owner_id (PK is id)" },
  { table: "orders", has: "order_id, document_no, grand_total, uuid, till_uuid", doesNotHave: "ordernumber, documentno" },
  { table: "orderline", has: "orderline_id, order_id, qtyentered, priceentered, lineamt, linenetamt", doesNotHave: "qty, priceactual, tax_amount, discount" },
  { table: "error_logs", has: "message, stack_trace, device_info, created_at, status", doesNotHave: "stacktrace, device_id, timestamp, screen" },
  { table: "terminal", has: "terminal_id, store_id, account_id, name, terminal_type", doesNotHave: "type" },
  { table: "till", has: "till_id, uuid, documentno, status (Supabase only)", doesNotHave: "status in Room (derives from dateClosed)" },
];

// ── Sync Protocol Data ─────────────────────────────────────

type SyncDir = "push" | "pull" | "both";

const syncEntities: { entity: string; direction: SyncDir; owner: string }[] = [
  { entity: "product", direction: "pull", owner: "Server" },
  { entity: "productcategory", direction: "pull", owner: "Server" },
  { entity: "tax", direction: "pull", owner: "Server" },
  { entity: "modifier / modifier_option", direction: "pull", owner: "Server" },
  { entity: "store", direction: "pull", owner: "Server" },
  { entity: "terminal", direction: "pull", owner: "Server" },
  { entity: "pos_user", direction: "pull", owner: "Server" },
  { entity: "customer", direction: "pull", owner: "Server" },
  { entity: "promotion", direction: "pull", owner: "Server" },
  { entity: "menu_schedule", direction: "pull", owner: "Server" },
  { entity: "loyalty_config", direction: "pull", owner: "Server" },
  { entity: "orders", direction: "push", owner: "Device" },
  { entity: "orderline", direction: "push", owner: "Device" },
  { entity: "till", direction: "push", owner: "Device" },
  { entity: "customer (new)", direction: "push", owner: "Device" },
  { entity: "error_logs", direction: "push", owner: "Device" },
  { entity: "inventory_count", direction: "push", owner: "Device" },
  { entity: "shift (clock in/out)", direction: "push", owner: "Device" },
];

const syncHardening = [
  { name: "Error surfacing", how: "Sync errors written to error_logs, nav drawer shows pending + failure count" },
  { name: "Retry with backoff", how: "5 retries, exponential (30s to 240s). Failed items stay unsynced via syncErrorMessage" },
  { name: "Sync receipt", how: "Synchronizer screen shows SENT / RECEIVED / PENDING / ERRORS counts" },
  { name: "Context hardening", how: "Store/terminal resolved per-brand from Room DB, not shared prefs" },
  { name: "Conflict detection", how: "Server insertOrUpdate() checks updated_at — skips stale overwrites" },
  { name: "Payload checksum", how: "SHA-256 of order/till UUIDs+totals. Warning-only (Kotlin/JS float serialization differs)" },
];

// ── Roles & Permissions Data ───────────────────────────────

// DB constraint: CHECK (LOWER(role) IN ('owner', 'admin', 'staff'))
// Spec envisions 8 roles (Purchaser, Merchandiser, Accountant, Supervisor, Driver, Cashier)
// but current DB only enforces 3. Table shows actual + planned.
const roles = ["Owner", "Admin", "Staff"] as const;
const plannedRoles = ["Purchaser", "Merchandiser", "Accountant", "Supervisor", "Driver", "Cashier"];

const permissions: { capability: string; access: boolean[] }[] = [
  { capability: "Create brands/stores", access: [true, false, false] },
  { capability: "Invite admins", access: [true, false, false] },
  { capability: "Invite staff", access: [true, true, false] },
  { capability: "Manage products", access: [true, true, false] },
  { capability: "Run AI enrichment", access: [true, true, false] },
  { capability: "Manage purchase orders", access: [true, true, false] },
  { capability: "Configure loyalty", access: [true, true, false] },
  { capability: "View all stores", access: [true, true, false] },
  { capability: "Approve discrepancies", access: [true, true, false] },
  { capability: "Logistics / deliveries", access: [true, true, false] },
  { capability: "POS operations", access: [true, true, true] },
  { capability: "Inventory count", access: [true, true, true] },
  { capability: "Barcode My Store", access: [true, true, false] },
  { capability: "Manage suppliers / POs", access: [true, true, false] },
  { capability: "View financials / reports", access: [true, true, false] },
  { capability: "Platform portal", access: [true, false, false] },
  { capability: "Brand management", access: [true, true, false] },
  { capability: "View own data", access: [true, true, true] },
];

// ── API Routes Data ────────────────────────────────────────

const apiDomains = [
  { domain: "auth", routes: ["signup", "login", "check", "reset", "reset-password", "ott", "ott/validate", "lookup"], notes: "OTT for Android WebView, Supabase Auth" },
  { domain: "sync", routes: ["POST (push+pull)", "GET (health)", "register", "replay"], notes: "Core Android sync, v2 protocol" },
  { domain: "data", routes: ["POST (read proxy)", "insert", "update", "delete"], notes: "Web console CRUD, auto-injects account_id" },
  { domain: "account", routes: ["[accountId] (PATCH/DELETE)", "create-demo", "lifecycle"], notes: "Brand management" },
  { domain: "account-manager", routes: ["GET", "POST", "PATCH"], notes: "Account manager CRUD" },
  { domain: "owner", routes: ["[ownerId] (GET/PATCH)", "accounts", "accounts/[accountId]"], notes: "Owner CRUD" },
  { domain: "ai-import", routes: ["POST (discover)", "save"], notes: "Claude Haiku product discovery" },
  { domain: "intake", routes: ["POST", "review", "approve", "reject"], notes: "Product intake pipeline" },
  { domain: "loyalty", routes: ["earn", "redeem", "adjust", "config", "wallets", "transactions"], notes: "Points system" },
  { domain: "suppliers", routes: ["CRUD", "search"], notes: "Supplier directory" },
  { domain: "purchase-orders", routes: ["CRUD", "[id]/receive (GRN)"], notes: "PO management + goods received" },
  { domain: "stock", routes: ["GET (levels)", "journal"], notes: "Stock queries + audit journal" },
  { domain: "serial-items", routes: ["CRUD", "lifecycle"], notes: "VIN/IMEI serial tracking" },
  { domain: "inventory", routes: ["sessions", "entries"], notes: "Inventory count sessions" },
  { domain: "promotions", routes: ["CRUD", "validate"], notes: "Promotion engine, 4 types" },
  { domain: "deliveries", routes: ["CRUD", "status"], notes: "Delivery tracking, 7-step workflow" },
  { domain: "shifts", routes: ["clock-in", "clock-out", "history"], notes: "Shift clock in/out" },
  { domain: "menu-schedules", routes: ["CRUD", "active"], notes: "Breakfast/lunch/dinner scheduling" },
  { domain: "reports", routes: ["z-report"], notes: "Z-report / daily summary" },
  { domain: "platform", routes: ["create-account", "delete-test-brands"], notes: "Admin portal actions" },
  { domain: "super-admin", routes: ["impersonate", "accounts"], notes: "Super admin operations" },
  { domain: "errors", routes: ["log"], notes: "Unified error logging" },
  { domain: "monitor", routes: ["GET (health check)"], notes: "All-services health" },
  { domain: "changelog", routes: ["GET (git log)"], notes: "Recent commits" },
  { domain: "infrastructure", routes: ["GET (service status)"], notes: "Cost, DB row counts" },
  { domain: "context", routes: ["GET (session context)"], notes: "Account/store/terminal resolution" },
  { domain: "catalogue", routes: ["GET (PDF generation)"], notes: "Grid/list/price-list/loyalty cards" },
  { domain: "enroll", routes: ["POST (device enrollment)"], notes: "QR-based device setup" },
  { domain: "blink", routes: ["create-payment", "check-status"], notes: "QR payment integration" },
  { domain: "debug", routes: ["session"], notes: "Debug session info" },
];

// ── Architecture Rules Data ────────────────────────────────

type Severity = "critical" | "important" | "convention";

const architectureRules: { id: number; rule: string; detail: string; severity: Severity }[] = [
  { id: 1, rule: "Android never talks to Supabase directly", detail: "All data through /api/sync", severity: "critical" },
  { id: 2, rule: "Server is source of truth for master data", detail: "Products, categories, taxes, stores flow server to device (pull only). Android only pushes transactional data.", severity: "critical" },
  { id: 3, rule: "Web console reads Supabase directly", detail: "Mutations through API routes only", severity: "critical" },
  { id: 4, rule: "Context = account_id + store_id + terminal_id", detail: "Every query scoped to this triple", severity: "critical" },
  { id: 5, rule: "Offline-first", detail: "Every POS operation works without connectivity", severity: "critical" },
  { id: 6, rule: "Three-layer rule", detail: "Every feature needs: migration + API route + UI (web or Android)", severity: "important" },
  { id: 7, rule: "No CRUD scaffolds", detail: "Every screen must feel designed", severity: "convention" },
  { id: 8, rule: "All errors logged to error_logs table", detail: "Android via AppErrorLogger, web via error-logger.ts. Never console.error without also logging to DB.", severity: "critical" },
  { id: 9, rule: "Legacy workers disabled", detail: "Only CloudSyncWorker handles sync", severity: "important" },
  { id: 10, rule: "Capability-driven UI", detail: "Role-based visibility, not hardcoded screen lists", severity: "important" },
  { id: 11, rule: "Cloud-authoritative IDs", detail: "Server assigns all PKs. Android uses server-assigned IDs, never hardcodes 1.", severity: "critical" },
  { id: 12, rule: "Soft delete", detail: "Key tables use is_deleted + deleted_at instead of hard DELETE. Queries filter is_deleted = false.", severity: "important" },
  { id: 13, rule: "No standalone accounts", detail: "All accounts created via /api/auth/signup or /api/account/create-demo", severity: "important" },
  { id: 14, rule: "Demo brands are server-first", detail: "Create on Supabase via API, Android creates only an account shell in Room, then pulls via CloudSync.", severity: "important" },
  { id: 15, rule: "Passwords never stored locally", detail: "Only Supabase Auth holds passwords. Local Room DB stores PINs only.", severity: "critical" },
  { id: 16, rule: "No PostgREST FK joins", detail: "Cross-tenant FKs dropped. Never use .select('*, table(column)'). Use separate queries.", severity: "critical" },
  { id: 17, rule: "Validate column names against actual DB schema", detail: "See DB Column Gotchas — many columns are named differently than expected.", severity: "important" },
];

// ── Severity Config ────────────────────────────────────────

const severityConfig = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  important: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  convention: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-100 text-gray-600" },
};

// ── Component ──────────────────────────────────────────────

export default function Specs() {
  const [activeSection, setActiveSection] = useState<SectionKey>("architecture");

  const totalEntities = entityGroups.reduce((sum, g) => sum + g.entities.length, 0);
  const criticalRules = architectureRules.filter(r => r.severity === "critical").length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard value={stackLayers.length} label="Stack Layers" />
        <StatCard value={totalEntities} label="DB Entities" />
        <StatCard value={syncEntities.length} label="Sync Entities" />
        <StatCard value={roles.length} label="Roles" />
        <StatCard value={apiDomains.length} label="API Domains" />
        <StatCard value={`${criticalRules} / ${architectureRules.length}`} label="Critical Rules" />
      </div>

      {/* Section nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? "bg-posterita-blue text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {activeSection === "architecture" && <ArchitectureSection />}
      {activeSection === "data-model" && <DataModelSection />}
      {activeSection === "sync" && <SyncSection />}
      {activeSection === "roles" && <RolesSection />}
      {activeSection === "api" && <ApiSection />}
      {activeSection === "rules" && <RulesSection />}
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ── Architecture Section ───────────────────────────────────

function ArchitectureSection() {
  return (
    <div className="space-y-6">
      {/* Design Principles */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Design Principles</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          {designPrinciples.map((p, i) => (
            <div key={i} className="bg-blue-50 rounded-lg p-3">
              <p className="font-medium text-blue-900 text-sm">{p.name}</p>
              <p className="text-xs text-blue-700 mt-1">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Technology Stack</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Layer</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Technology</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {stackLayers.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-2 font-medium text-gray-900">{s.layer}</td>
                  <td className="px-4 py-2 text-gray-600">{s.tech}</td>
                  <td className="px-4 py-2 text-gray-600">{s.responsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">System Architecture</h3>
        </div>
        <div className="p-4">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
            {architectureDiagram}
          </pre>
        </div>
      </div>

      {/* Key Boundaries */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Key Boundaries</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {keyBoundaries.map((b, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-50 rounded-lg p-3 border border-red-100">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900 text-sm">{b.rule}</p>
                <p className="text-xs text-red-700 mt-0.5">{b.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Data Model Section ─────────────────────────────────────

function DataModelSection() {
  return (
    <div className="space-y-6">
      {/* Entity Groups */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Entity Groups</h3>
        </div>
        <div className="space-y-4 p-4">
          {entityGroups.map((g, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-gray-700 mb-1.5">{g.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.entities.map((e, j) => (
                  <span key={j} className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium ${g.color}`}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schema Design Decisions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Schema Design Decisions</h3>
        </div>
        <div className="p-4">
          <ol className="space-y-2">
            {schemaDecisions.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-posterita-blue text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-0.5">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* DB Column Gotchas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">DB Column Gotchas</h3>
          <p className="text-xs text-gray-500 mt-0.5">Columns that are frequently confused. Always verify against actual schema.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Table</th>
                <th className="text-left px-4 py-2 font-medium text-green-600">Has</th>
                <th className="text-left px-4 py-2 font-medium text-red-500">Does NOT Have</th>
              </tr>
            </thead>
            <tbody>
              {columnGotchas.map((c, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-2 font-mono font-medium text-gray-900">{c.table}</td>
                  <td className="px-4 py-2 text-green-700 font-mono text-xs">{c.has}</td>
                  <td className="px-4 py-2 text-red-500 font-mono text-xs line-through">{c.doesNotHave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sync Section ───────────────────────────────────────────

function SyncSection() {
  return (
    <div className="space-y-6">
      {/* Key Facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value="v2" label="Sync API Version" />
        <StatCard value="5 min" label="Sync Interval" />
        <StatCard value="5" label="Max Retries" />
        <StatCard value="SHA-256" label="Checksum" />
      </div>

      {/* Sync Direction Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Sync Direction Registry</h3>
          <p className="text-xs text-gray-500 mt-0.5">Server is source of truth for master data. Device only pushes transactional data.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Entity</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Direction</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Write Owner</th>
              </tr>
            </thead>
            <tbody>
              {syncEntities.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-2 font-mono text-gray-900">{s.entity}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.direction === "pull"
                        ? "bg-blue-100 text-blue-700"
                        : s.direction === "push"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {s.direction === "pull" && <><ArrowLeft size={10} /> Pull</>}
                      {s.direction === "push" && <><ArrowRight size={10} /> Push</>}
                      {s.direction === "both" && <><ArrowLeftRight size={10} /> Both</>}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{s.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Till Sync Flow */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Till Sync (Two-Pass)</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {["Open Till", "isSync=true", "Sync Pass 1", "Close Till", "isSync=false", "Sync Pass 2", "isSync=true"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-lg font-medium ${
                  i === 0 || i === 3 ? "bg-blue-100 text-blue-800" :
                  i === 2 || i === 5 ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {step}
                </span>
                {i < 6 && <ChevronRight size={14} className="text-gray-300" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Orders carry till_uuid. Server matches by UUID. If till hasn&apos;t synced yet, till_uuid is preserved and till_id is back-filled via reconcile_till_orders().
          </p>
        </div>
      </div>

      {/* Sync Hardening */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Sync Hardening</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {syncHardening.map((f, i) => (
            <div key={i} className="bg-green-50 rounded-lg p-3 border border-green-100">
              <p className="font-medium text-green-900 text-sm">{f.name}</p>
              <p className="text-xs text-green-700 mt-1">{f.how}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Roles Section ──────────────────────────────────────────

function RolesSection() {
  return (
    <div className="space-y-6">
      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Permissions Matrix</h3>
          <p className="text-xs text-gray-500 mt-0.5">{permissions.length} capabilities across {roles.length} active roles</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[180px]">Capability</th>
                {roles.map((r) => (
                  <th key={r} className="text-center px-2 py-2 font-medium text-gray-500 whitespace-nowrap">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-3 py-1.5 text-gray-700 sticky left-0 bg-inherit">{p.capability}</td>
                  {p.access.map((has, j) => (
                    <td key={j} className="text-center px-2 py-1.5">
                      {has ? (
                        <Check size={14} className="inline text-green-500" />
                      ) : (
                        <Minus size={14} className="inline text-gray-200" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DB constraint note */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 px-5 py-3">
        <p className="text-sm font-medium text-amber-800">DB Constraint</p>
        <p className="text-xs text-amber-700 mt-1">
          pos_user.role CHECK: <code className="bg-amber-100 px-1 rounded">LOWER(role) IN (&apos;owner&apos;, &apos;admin&apos;, &apos;staff&apos;)</code>.
          The spec envisions {plannedRoles.length} additional roles for future granularity:
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {plannedRoles.map((r, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              {r} (planned)
            </span>
          ))}
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Active Roles</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="font-medium text-blue-900 text-sm">Owner</p>
            <p className="text-xs text-blue-700 mt-1">Full access. Creates brands/stores, invites users, configures loyalty, manages platform portal. One per brand hierarchy.</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <p className="font-medium text-purple-900 text-sm">Admin</p>
            <p className="text-xs text-purple-700 mt-1">Full operational access. Manages products, POs, suppliers, reports, and users. Cannot create brands or access platform portal.</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="font-medium text-green-900 text-sm">Staff</p>
            <p className="text-xs text-green-700 mt-1">POS operations, inventory count, view own data. The general-purpose role covering cashier, supervisor, and floor staff.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── API Section ────────────────────────────────────────────

function ApiSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">API Routes by Domain</h3>
          <p className="text-xs text-gray-500 mt-0.5">All routes under /api/. Base: web.posterita.com (Vercel) + posterita-backend.onrender.com (Render)</p>
        </div>
        <div className="space-y-2 p-4">
          {apiDomains.map((d, i) => (
            <details key={i} className="bg-gray-50 rounded-lg overflow-hidden group">
              <summary className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100 transition">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-posterita-blue text-white text-xs font-mono font-medium min-w-[90px] justify-center">
                  /{d.domain}
                </span>
                <span className="text-sm text-gray-600 flex-1">{d.notes}</span>
                <span className="text-xs text-gray-400">{d.routes.length} routes</span>
                <ChevronRight size={14} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-4 pb-3 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {d.routes.map((r, j) => (
                    <span key={j} className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200 text-xs font-mono text-gray-700">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Backend routes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Render Backend</h3>
          <p className="text-xs text-gray-500 mt-0.5">posterita-backend.onrender.com</p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-4">
          {["/health", "/webhook/whatsapp", "/monitor/errors", "/monitor/sync", "/monitor/accounts"].map((r, i) => (
            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800">
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Rules Section ──────────────────────────────────────────

function RulesSection() {
  return (
    <div className="space-y-6">
      {/* Summary by severity */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{architectureRules.filter(r => r.severity === "critical").length}</p>
          <p className="text-xs text-red-600">Critical</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{architectureRules.filter(r => r.severity === "important").length}</p>
          <p className="text-xs text-amber-600">Important</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{architectureRules.filter(r => r.severity === "convention").length}</p>
          <p className="text-xs text-gray-500">Convention</p>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        {architectureRules.map((r) => {
          const c = severityConfig[r.severity];
          return (
            <div key={r.id} className={`${c.bg} rounded-xl border ${c.border} px-5 py-3 flex items-start gap-3`}>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 text-xs font-bold flex items-center justify-center text-gray-700">
                {r.id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium text-sm ${c.text}`}>{r.rule}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.badge}`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{r.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
