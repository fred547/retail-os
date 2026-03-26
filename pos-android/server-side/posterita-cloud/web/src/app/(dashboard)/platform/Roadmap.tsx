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
        id: 3, name: "Inventory & Stock Control", status: "partial",
        features: [
          { name: "Inventory count sessions (spot check)", status: "done" },
          { name: "Barcode scan during count", status: "done" },
          { name: "Serial item tracking (VIN/IMEI)", status: "done" },
          { name: "Stock deduction on sale", status: "done", detail: "Auto-decrement quantity_on_hand on sync, stock_journal audit trail, manual adjustments" },
          { name: "Qty difference display (counted vs booked)", status: "planned", detail: "From legacy spotcheck: show expected vs actual per item" },
          { name: "Expiry & batch tracking", status: "planned", detail: "Track expiry dates, batch/lot numbers" },
          { name: "Low stock alerts & reorder points", status: "planned", detail: "From legacy warehouse: auto-generate replenishment orders" },
          { name: "Export count to XLS/CSV", status: "planned", detail: "From legacy inventory-count: JExcelAPI export pattern" },
          { name: "Audio beep on scan confirmation", status: "planned", detail: "From legacy spotcheck: haptic/audio feedback" },
          { name: "Stock transfer between stores", status: "planned", detail: "From legacy warehouse: move item between locations" },
          { name: "Shelf/location barcode mapping", status: "future", detail: "From legacy warehouse: assign products to shelf locations" },
          { name: "Picking list workflow", status: "future", detail: "From legacy warehouse: load picking doc → scan items → complete" },
          { name: "Put-away workflow", status: "future", detail: "From legacy warehouse: scan item → assign shelf location" },
          { name: "Multi-warehouse stock view", status: "future", detail: "From legacy warehouse: query stock across all stores" },
          { name: "Cycle count (full stock count)", status: "future", detail: "From legacy warehouse: scheduled full inventory count" },
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
          { name: "Shelf label printing (ZPL/EPL)", status: "planned", detail: "From legacy barcode app: Zebra thermal label generation" },
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
          { name: "Shift clock in/out", status: "planned", detail: "From legacy restaurant: clock_in_out table with user, terminal, time_in, time_out, sync" },
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
          { name: "Loyalty points (earn on purchase)", status: "planned", detail: "Wallet, points, balance display" },
          { name: "Loyalty redeem at POS", status: "planned" },
          { name: "Loyalty cards (PDF catalogue template)", status: "done" },
          { name: "Customer-facing display", status: "future" },
        ],
      },
      {
        id: 9, name: "Promotions & Discounts", status: "partial",
        features: [
          { name: "Discount codes on orders", status: "done" },
          { name: "Per-line discount (amount/percentage)", status: "done" },
          { name: "Promotions engine (auto-apply, time-based)", status: "planned", detail: "Buy-X-get-Y, happy hour, promo codes with rules" },
          { name: "Coupon management", status: "planned" },
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
          { name: "Export to CSV/Excel", status: "planned", detail: "From legacy inventory-count: XLS generation pattern" },
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
        ],
      },
      {
        id: 12, name: "Mobile Experience & Device Support", status: "done",
        features: [
          { name: "Android POS (Kotlin, Room, Hilt)", status: "done" },
          { name: "Multi-module Gradle (:core:database/common/network/sync)", status: "done" },
          { name: "Terminal types (retail/restaurant/KDS/staff)", status: "done" },
          { name: "Connectivity monitor (green/red dot)", status: "done" },
          { name: "4-app dashboard (POS/Warehouse/Admin/Sync)", status: "done" },
          { name: "WebView integration (OTT auth)", status: "done" },
        ],
      },
      {
        id: 13, name: "Admin, Config & Localisation", status: "done",
        features: [
          { name: "Settings page (store, currency, AI key, tax config)", status: "done" },
          { name: "Brand management (create demo, switch brands)", status: "done" },
          { name: "Store/terminal CRUD", status: "done" },
          { name: "Platform portal (10 tabs)", status: "done" },
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
          { name: "Open API documentation", status: "planned" },
          { name: "Webhook framework", status: "partial" },
        ],
      },
      {
        id: 18, name: "Supplier & Purchase Order Management", status: "planned",
        features: [
          { name: "Supplier directory", status: "planned" },
          { name: "Purchase order creation", status: "planned" },
          { name: "Goods received note (GRN)", status: "planned" },
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
        id: 21, name: "Menu, Modifiers & Scheduling", status: "partial",
        features: [
          { name: "Modifier walkthrough dialog", status: "done" },
          { name: "Category-based modifiers", status: "done" },
          { name: "Product-level modifiers", status: "done" },
          { name: "Menu scheduling (breakfast/lunch/dinner)", status: "planned", detail: "Time-based menu activation" },
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
          { name: "Driver assignment & status tracking", status: "planned" },
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
      { id: 36, name: "Self-Checkout Kiosks", status: "future", features: [
        { name: "Customer-facing checkout UI", status: "future" },
        { name: "Payment integration", status: "future" },
      ]},
      { id: 37, name: "Experimental Features", status: "future", features: [
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
