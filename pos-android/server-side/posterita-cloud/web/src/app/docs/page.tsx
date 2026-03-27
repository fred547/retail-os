import {
  Building2, Users, AlertTriangle, RefreshCw, FlaskConical, Gauge,
  Server, GitCommit, Map, Shield, Archive, Bot, FileText,
  ShoppingCart, Package, Smartphone, BarChart3, Truck, Clock, Utensils,
  CreditCard, Receipt, Globe, Layers, Database, Lock, Wifi, ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Posterita Retail OS</h1>
              <p className="text-sm text-gray-500">Platform Documentation</p>
            </div>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Unified retail management platform: one Android POS app, one web console, one backend, one database.
            This guide explains how each part of the system works.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-16">
        {/* Table of contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tocItems.map((item, i) => (
              <a key={i} href={`#${item.id}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition group">
                <item.icon size={16} className="text-gray-400 group-hover:text-blue-600 transition" />
                <div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.subtitle}</p>
                </div>
              </a>
            ))}
          </div>
        </nav>

        {/* 1. Overview */}
        <Section id="overview" icon={Layers} title="System Overview" subtitle="How all the pieces fit together">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card color="blue" icon={Smartphone} title="Android POS App" description="Kotlin app for store-floor operations. Offline-first with Room DB, syncs via CloudSyncWorker every 5 minutes. Supports retail, restaurant, KDS, and staff terminal types." />
            <Card color="purple" icon={Globe} title="Web Console" description="Next.js admin dashboard on Vercel. CRUD for products, stores, users, suppliers. Real-time reports, order history, loyalty management, and platform admin portal." />
            <Card color="green" icon={Server} title="Backend API" description="Express/Node.js on Render. Handles sync orchestration, webhooks, cron jobs (error cleanup, sync log purge), and monitoring endpoints." />
            <Card color="amber" icon={Database} title="Supabase Database" description="PostgreSQL with Row Level Security. Single source of truth. 40+ migrations, RLS on all tables, Auth for web/Android login." />
          </div>
          <pre className="bg-gray-900 text-green-400 p-5 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto">
{`  Android POS App                    Web Console (Vercel)
  (Store Floor)                      (Back Office)
  ┌──────────────────┐               ┌──────────────────┐
  │ Offline Room DB  │               │ Products CRUD    │
  │ POS + Payments   │               │ Reports          │
  │ Kitchen / KDS    │               │ Loyalty Mgmt     │
  │ Inventory Count  │               │ Suppliers / POs  │
  └────────┬─────────┘               └────────┬─────────┘
           │ /api/sync                        │ /api/data
           ▼                                  ▼
  ┌─────────────────────────────────────────────────────┐
  │              Backend API (Render)                    │
  │  Sync · Auth · Webhooks · Cron · Monitoring         │
  └────────────────────┬────────────────────────────────┘
                       │
  ┌────────────────────▼────────────────────────────────┐
  │           Supabase Postgres (Source of Truth)        │
  │           Auth · RLS · 40 migrations                │
  └─────────────────────────────────────────────────────┘`}
          </pre>
        </Section>

        {/* 2. Android POS */}
        <Section id="android" icon={Smartphone} title="Android POS App" subtitle="Offline-first store operations">
          <p className="text-gray-600 text-sm mb-4">
            The Android app is a multi-module Kotlin application with 4 core modules: <code className="bg-gray-100 px-1 rounded">:core:database</code> (Room DB, 37 entities),
            <code className="bg-gray-100 px-1 rounded">:core:common</code> (shared utilities), <code className="bg-gray-100 px-1 rounded">:core:network</code> (Retrofit APIs),
            and <code className="bg-gray-100 px-1 rounded">:core:sync</code> (CloudSyncWorker).
          </p>

          <h4 className="font-semibold text-gray-900 mb-3">Home Dashboard — 6 App Tiles</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <TilePreview color="blue" icon={ShoppingCart} title="POS" description="Full point-of-sale: product grid, cart, barcode scanning, multi-payment, hold orders, refunds, customer selection, order types (dine-in/takeaway/delivery)" />
            <TilePreview color="amber" icon={Package} title="Warehouse" description="Inventory counts (spot check + full), stock levels, variance tracking, low-stock alerts, picking lists, put-away workflows, multi-warehouse view, CSV export" />
            <TilePreview color="purple" icon={Users} title="CRM" description="Customer directory, loyalty wallets, transaction history. Browse and manage customer relationships from the device." />
            <TilePreview color="teal" icon={Truck} title="Logistics" description="Delivery tracking with 7-step workflow, driver assignment, address/phone capture. Manage last-mile operations." />
            <TilePreview color="gray" icon={Gauge} title="Admin" description="Settings, WebView links to web console, sync controls, printer configuration, brand management (owner only)" />
            <TilePreview color="cyan" icon={RefreshCw} title="Synchronizer" description="Manual sync trigger, sync receipt showing SENT/RECEIVED/PENDING/ERRORS counts, connectivity status" />
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">Terminal Types</h4>
          <p className="text-gray-600 text-sm mb-3">Each terminal has a type that controls its UI and startup behavior:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Purpose</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Startup</th>
              </tr></thead>
              <tbody>
                <tr className="border-t"><td className="px-4 py-2 font-mono text-blue-700">pos_retail</td><td className="px-4 py-2">Standard retail register (default)</td><td className="px-4 py-2 text-gray-500">PIN &rarr; Home &rarr; POS</td></tr>
                <tr className="border-t bg-gray-50/50"><td className="px-4 py-2 font-mono text-blue-700">pos_restaurant</td><td className="px-4 py-2">Restaurant POS with tables/kitchen</td><td className="px-4 py-2 text-gray-500">PIN &rarr; Home &rarr; POS + order type</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-mono text-blue-700">kds</td><td className="px-4 py-2">Kitchen Display System</td><td className="px-4 py-2 text-gray-500">PIN &rarr; KDS full-screen</td></tr>
                <tr className="border-t bg-gray-50/50"><td className="px-4 py-2 font-mono text-blue-700">mobile_staff</td><td className="px-4 py-2">Staff device (orders, inventory)</td><td className="px-4 py-2 text-gray-500">PIN &rarr; Home (limited)</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 3. Web Console */}
        <Section id="web-console" icon={Globe} title="Web Console" subtitle="Admin dashboard at web.posterita.com">
          <p className="text-gray-600 text-sm mb-4">
            The web console is a Next.js 16 (App Router) application deployed on Vercel. It provides admin CRUD, reporting,
            and operations oversight. Two portals: <strong>Customer Portal</strong> (business owners) and <strong>Manager Portal</strong> (account managers / super admins).
          </p>

          <h4 className="font-semibold text-gray-900 mb-3">Customer Portal — Main Navigation</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <NavItem icon={ShoppingCart} title="Products" description="CRUD, categories, modifiers, AI import, intake pipeline" />
            <NavItem icon={Users} title="Customers" description="Directory, loyalty wallets, points, transactions" />
            <NavItem icon={Receipt} title="Orders" description="Order history, filters, MRA fiscal status" />
            <NavItem icon={CreditCard} title="Tills" description="Till sessions, cash reconciliation, close receipt" />
            <NavItem icon={Package} title="Inventory" description="Stock levels, journal, serial items, counts" />
            <NavItem icon={Truck} title="Suppliers" description="Directory, purchase orders, goods received (GRN)" />
            <NavItem icon={BarChart3} title="Reports" description="Z-report, daily summary, CSV export" />
            <NavItem icon={Gauge} title="Settings" description="Store config, users, terminals, taxes, loyalty" />
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">Additional Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeatureCard title="AI Product Import" description="Upload photos or describe products. Claude Haiku discovers products, Sonnet processes intake. Draft → Review → Live pipeline." />
            <FeatureCard title="PDF Catalogue" description="Generate professional product catalogues with 4 templates: grid, list, price-list, loyalty cards. QR codes on every page." />
            <FeatureCard title="Promotions Engine" description="4 promotion types with auto-apply, time/day rules, min-order thresholds, usage tracking, and coupon code management." />
          </div>
        </Section>

        {/* 4. Platform Portal */}
        <Section id="platform" icon={Shield} title="Platform Portal" subtitle="Account manager admin view — 13 tabs">
          <p className="text-gray-600 text-sm mb-4">
            The platform portal at <code className="bg-gray-100 px-1 rounded">/platform</code> is restricted to account managers and super admins.
            It provides a comprehensive view of the entire multi-tenant system. 13 tabs organized with the first 6 inline and the rest in a &ldquo;More&rdquo; dropdown.
          </p>

          <div className="space-y-4">
            <TabDoc icon={Building2} name="Brands" description="Owner-grouped account list with type/status filters, search, and stats (stores, products, users, orders per brand). Create new accounts, assign account managers. Summary cards show total/demo/live/trial/testing/onboarding/active counts." />
            <TabDoc icon={Users} name="Owners" description="Owner directory with account counts. Edit owner details, reset passwords via Supabase Auth. Each owner can have multiple brands." />
            <TabDoc icon={AlertTriangle} name="Errors" description="Unified error log dashboard. All errors from Android (AppErrorLogger), web client (error-logger.ts), API routes, and React error boundaries land here. Filter by severity (ERROR/WARN/FATAL), tag, status. View stack traces, device info, timestamps." />
            <TabDoc icon={RefreshCw} name="Sync" description="Sync request log monitor. Shows the last 100 sync requests with account names, timestamps, push/pull entity counts, and HTTP status. Diagnose sync failures and track device activity." />
            <TabDoc icon={Shield} name="MRA" description="Mauritius Revenue Authority e-invoicing dashboard. Tracks fiscal invoice submissions: filed, pending, failed. RSA+AES encryption, hash chain linking (SHA-256), BRN+TAN validation, async filing with 15-min cron retry." />
            <TabDoc icon={FlaskConical} name="Tests" description="CI test results from ci_report table. Shows test suite runs with pass/fail counts, duration, and failure details. Covers Android unit tests, web console tests, scenario tests, and Playwright E2E." />
            <TabDoc icon={Gauge} name="Benchmark" description="Performance benchmarks. Tracks API response times, build durations, and deployment metrics. Helps identify regressions." />
            <TabDoc icon={GitCommit} name="Changelog" description="Recent git commits fetched from /api/changelog. Grouped by date with commit type categorization (feature, fix, refactor, test, docs). Shows the development velocity and recent changes." />
            <TabDoc icon={Map} name="Roadmap" description="Product roadmap with 37 modules across 4 phases. Each module lists features with status (done/in-progress/planned/future). Summary cards show completion percentage. Expandable module cards with feature checklists." />
            <TabDoc icon={FileText} name="Specs" description="Technical specification viewer with 6 sections: Architecture (stack, diagram, principles), Data Model (entities, schema decisions, column gotchas), Sync Protocol (direction registry, hardening), Roles & Permissions (matrix), API Routes (30 domains), Architecture Rules (17 rules, severity-coded)." />
            <TabDoc icon={Server} name="Infrastructure" description="Live infrastructure status. Shows all services (Vercel, Render, Supabase, Cloudinary, Firebase) with status checks, cost breakdown ($44-64/mo total), and database row counts across all tables." />
            <TabDoc icon={Archive} name="Legacy" description="Legacy system review. Catalogs 7 legacy projects with verdicts (extracted, retired, replaced) and lists which features were ported vs abandoned. Ensures nothing critical was lost during migration." />
            <TabDoc icon={Bot} name="Claude" description="Claude AI configuration. Shows current AI model settings (Haiku 4.5 for discovery, Sonnet 4.6 for intake), API key status, and usage patterns for the AI product import feature." />
          </div>
        </Section>

        {/* 5. Sync Protocol */}
        <Section id="sync" icon={Wifi} title="Sync Protocol" subtitle="How Android and server exchange data">
          <p className="text-gray-600 text-sm mb-4">
            The sync engine is the backbone of offline-first operation. Android devices sync every 5 minutes via CloudSyncWorker.
            The protocol is versioned (v2) and supports multi-brand sync — each brand has its own Room database.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatBox value="v2" label="Protocol Version" />
            <StatBox value="5 min" label="Sync Interval" />
            <StatBox value="5" label="Max Retries" />
            <StatBox value="SHA-256" label="Checksum" />
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">Data Flow Direction</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="font-semibold text-blue-900 text-sm mb-2">Server &rarr; Device (Pull)</p>
              <p className="text-xs text-blue-700">Master data flows one way: server to device. Products, categories, taxes, stores, terminals, users, customers, promotions, menu schedules, loyalty config.</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="font-semibold text-green-900 text-sm mb-2">Device &rarr; Server (Push)</p>
              <p className="text-xs text-green-700">Transactional data flows device to server. Orders, order lines, tills, new customers, error logs, inventory counts, shift clock in/out.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">Sync Hardening (6 Features)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureCard title="Error Surfacing" description="Sync errors written to error_logs table. Nav drawer shows pending count + failure count." />
            <FeatureCard title="Retry with Backoff" description="5 retries with exponential backoff (30s → 240s). Failed items stay unsynced via syncErrorMessage." />
            <FeatureCard title="Sync Receipt" description="Synchronizer screen shows SENT / RECEIVED / PENDING / ERRORS counts per sync cycle." />
            <FeatureCard title="Context Hardening" description="Store/terminal resolved per-brand from Room DB, not shared prefs. Prevents multi-brand contamination." />
            <FeatureCard title="Conflict Detection" description="Server insertOrUpdate() checks updated_at timestamp. Skips stale overwrites to prevent data loss." />
            <FeatureCard title="Payload Checksum" description="SHA-256 of order/till UUIDs + totals. Warning-only mode (Kotlin/JS float serialization differs)." />
          </div>
        </Section>

        {/* 6. Auth */}
        <Section id="auth" icon={Lock} title="Authentication" subtitle="Multi-layer auth: password, PIN, OTT">
          <p className="text-gray-600 text-sm mb-4">
            Three authentication mechanisms serve different contexts. Passwords are never stored locally.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-gray-900 text-sm">Supabase Auth</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">Email + password login</p>
              <p className="text-xs text-gray-600">Used for web console login and Android first-device login. Passwords stored only in Supabase Auth, never in Room DB.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-gray-900 text-sm">PIN Unlock</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">4-digit device unlock</p>
              <p className="text-xs text-gray-600">Mandatory after first login. 30-minute idle timeout triggers lock screen. PIN synced via pos_user.pin field. Fast re-entry for cashier handoff.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-gray-900 text-sm">OTT (One-Time Token)</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">WebView bridge</p>
              <p className="text-xs text-gray-600">60-second token for Android WebView sessions. POST /api/auth/ott generates token, middleware validates and sets httpOnly cookie. Enables seamless web features inside the app.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">Login Flows</h4>
          <FlowDiagram
            title="First Launch (Setup Wizard)"
            steps={["Welcome", "Email + Password + Phone", "Name", "Brand", "Country", "Category", "Set PIN", "POST /api/auth/signup", "CloudSync pulls demo", "Home"]}
          />
          <FlowDiagram
            title="Returning User (PIN)"
            steps={["Welcome", "LockScreen (PIN)", "Home"]}
          />
          <FlowDiagram
            title="New Device Login"
            steps={["Welcome", "LoginActivity (email+password)", "POST /api/auth/login", "Supabase Auth", "CloudSync", "Home"]}
          />
        </Section>

        {/* 7. Kitchen & Restaurant */}
        <Section id="kitchen" icon={Utensils} title="Kitchen & Restaurant" subtitle="Tables, KDS, station routing, delivery">
          <p className="text-gray-600 text-sm mb-4">
            Restaurant features are activated by the <code className="bg-gray-100 px-1 rounded">pos_restaurant</code> terminal type.
            The system supports table sections, preparation stations, kitchen display systems (KDS), and delivery tracking.
          </p>

          <h4 className="font-semibold text-gray-900 mb-3">Station Routing Priority</h4>
          <FlowDiagram
            title="How items route to kitchen stations"
            steps={["product.station_override_id", "category_station_mapping", "Default kitchen station"]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FeatureCard title="Table Sections" description="Zones like Indoor, Patio, Bar, Takeaway. Tables have optional section_id. Takeaway sections auto-assign order numbers. Support table transfer and order merge." />
            <FeatureCard title="KDS (Kitchen Display)" description="LAN-only, no internet required. POS runs embedded HTTP server (NanoHTTPD, port 8321). KDS tablets discover via mDNS or manual IP. REST endpoints for orders, SSE stream, bump/recall." />
            <FeatureCard title="Station-Based Printing" description="Kitchen printers only print items for their assigned stations via category_station_mapping. No assignment = prints ALL items. Retail terminals ignore stations entirely." />
            <FeatureCard title="Delivery Tracking" description="7-step status workflow with driver assignment, address/phone capture. Full delivery dashboard on web console." />
          </div>
        </Section>

        {/* 8. Data Model */}
        <Section id="data-model" icon={Database} title="Data Model" subtitle="40+ tables, multi-tenant, soft delete">
          <p className="text-gray-600 text-sm mb-4">
            All data is scoped by <code className="bg-gray-100 px-1 rounded">account_id</code> (TEXT type). Row Level Security enforces tenant isolation.
            Key design decisions: soft deletes, immutable orders, cloud-authoritative IDs, no PostgREST FK joins.
          </p>

          <h4 className="font-semibold text-gray-900 mb-3">Data Hierarchy</h4>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm font-mono mb-6">
{`Owner → Brand (Account) → Store → Terminal (login context)
                        → Users (owner / admin / staff)
                        → Products, Categories, Taxes
                        → Customers, Loyalty
                        → Orders, Tills`}
          </pre>

          <h4 className="font-semibold text-gray-900 mb-3">Key Schema Rules</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureCard title="Soft Delete" description="Key tables use is_deleted + deleted_at. Queries always filter is_deleted = false. No hard DELETEs in application code." />
            <FeatureCard title="Cloud-Authoritative IDs" description="Server assigns all primary keys. Android uses server-assigned IDs, never hardcodes. Prevents ID collisions across devices." />
            <FeatureCard title="No PostgREST FK Joins" description="Cross-tenant foreign keys have been dropped. Never use .select('*, table(column)'). Use separate queries and map manually." />
            <FeatureCard title="Immutable Orders" description="Once an order is completed, it can only be refunded via a linked refund order. No edits to completed orders." />
          </div>
        </Section>

        {/* 9. Deployment */}
        <Section id="deployment" icon={Server} title="Deployment & Infrastructure" subtitle="$44-64/mo total stack cost">
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Service</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Platform</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Cost/mo</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Purpose</th>
              </tr></thead>
              <tbody>
                <tr className="border-t"><td className="px-4 py-2 font-medium">Web Console</td><td className="px-4 py-2">Vercel Pro</td><td className="px-4 py-2">$20</td><td className="px-4 py-2 text-gray-600">Next.js app + serverless API routes</td></tr>
                <tr className="border-t bg-gray-50/50"><td className="px-4 py-2 font-medium">Backend</td><td className="px-4 py-2">Render Starter</td><td className="px-4 py-2">$19</td><td className="px-4 py-2 text-gray-600">Express API, webhooks, cron jobs</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-medium">Database</td><td className="px-4 py-2">Supabase Free</td><td className="px-4 py-2">$0</td><td className="px-4 py-2 text-gray-600">Postgres, Auth, Realtime</td></tr>
                <tr className="border-t bg-gray-50/50"><td className="px-4 py-2 font-medium">AI</td><td className="px-4 py-2">Anthropic</td><td className="px-4 py-2">~$5-25</td><td className="px-4 py-2 text-gray-600">Claude Haiku + Sonnet for product import</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-medium">Images</td><td className="px-4 py-2">Cloudinary Free</td><td className="px-4 py-2">$0</td><td className="px-4 py-2 text-gray-600">Product images (800x800, auto-transform)</td></tr>
                <tr className="border-t bg-gray-50/50"><td className="px-4 py-2 font-medium">Testing</td><td className="px-4 py-2">Firebase Spark</td><td className="px-4 py-2">$0</td><td className="px-4 py-2 text-gray-600">Android instrumented tests on real devices</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-gray-900 mb-3">URLs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm">
              <span className="text-gray-400">Production:</span> <span className="text-blue-700">web.posterita.com</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm">
              <span className="text-gray-400">Backend:</span> <span className="text-blue-700">posterita-backend.onrender.com</span>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm">
              <span className="text-gray-400">Docs:</span> <span className="text-blue-700">web.posterita.com/docs</span>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          Posterita Retail OS Documentation &middot; Generated {new Date().toISOString().split("T")[0]}
        </footer>
      </main>
    </div>
  );
}

// ── Table of Contents Data ─────────────────────────────────

const tocItems = [
  { id: "overview", icon: Layers, title: "System Overview", subtitle: "Architecture diagram" },
  { id: "android", icon: Smartphone, title: "Android POS App", subtitle: "6 app tiles, terminal types" },
  { id: "web-console", icon: Globe, title: "Web Console", subtitle: "Customer portal navigation" },
  { id: "platform", icon: Shield, title: "Platform Portal", subtitle: "13 admin tabs" },
  { id: "sync", icon: Wifi, title: "Sync Protocol", subtitle: "Offline-first data exchange" },
  { id: "auth", icon: Lock, title: "Authentication", subtitle: "Password, PIN, OTT" },
  { id: "kitchen", icon: Utensils, title: "Kitchen & Restaurant", subtitle: "KDS, stations, delivery" },
  { id: "data-model", icon: Database, title: "Data Model", subtitle: "40+ tables, multi-tenant" },
  { id: "deployment", icon: Server, title: "Deployment", subtitle: "Infrastructure & costs" },
];

// ── Reusable Components ────────────────────────────────────

function Section({ id, icon: Icon, title, subtitle, children }: { id: string; icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-center gap-3 mb-1">
        <Icon size={20} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-8">{subtitle}</p>
      {children}
    </section>
  );
}

function Card({ color, icon: Icon, title, description }: { color: string; icon: any; title: string; description: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    green: "bg-green-50 border-green-100 text-green-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-xl border p-4 ${c}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  );
}

function TilePreview({ color, icon: Icon, title, description }: { color: string; icon: any; title: string; description: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50", purple: "border-purple-200 bg-purple-50",
    amber: "border-amber-200 bg-amber-50", teal: "border-teal-200 bg-teal-50",
    gray: "border-gray-200 bg-gray-50", cyan: "border-cyan-200 bg-cyan-50",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className="text-gray-600" />
        <p className="font-semibold text-sm text-gray-900">{title}</p>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}

function NavItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-gray-400" />
        <p className="font-medium text-sm text-gray-900">{title}</p>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function TabDoc({ icon: Icon, name, description }: { icon: any; name: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon size={16} className="text-gray-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{name}</p>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="font-medium text-sm text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function FlowDiagram({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-700">
              {step}
            </span>
            {i < steps.length - 1 && <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
