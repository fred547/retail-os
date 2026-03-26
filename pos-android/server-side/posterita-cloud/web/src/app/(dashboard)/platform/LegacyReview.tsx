"use client";

type Verdict = "extracted" | "ideas-only" | "skip";

interface LegacyProject {
  name: string;
  source: string;
  tech: string;
  files: number;
  quality: "Good" | "Fair" | "Poor";
  verdict: Verdict;
  what: string;
  features: string[];
  issues: string[];
  extracted: string[];
}

const projects: LegacyProject[] = [
  {
    name: "MRA EBS (Java)",
    source: "Bitbucket",
    tech: "Java 1.8, Maven, Jackson, RSA/AES crypto",
    files: 18,
    quality: "Good",
    verdict: "extracted",
    what: "Mauritius Revenue Authority e-invoicing library. RSA+AES encrypted invoice submission.",
    features: [
      "Token authentication with AES key exchange",
      "Invoice encryption + transmission",
      "Invoice hash chain linking (SHA-256)",
      "Invoice, Seller, Buyer, Item data models",
      "RSA public certificate management",
    ],
    issues: [
      "No async support (synchronous HTTP)",
      "Custom HTTP client (no OkHttp/Retrofit)",
    ],
    extracted: [
      "✅ Full MRA client ported to TypeScript (backend/services/mra-ebs-client.ts)",
      "✅ Invoice models, encryption, hash chain — all integrated",
      "✅ Tax settings page, receipt BRN/TAN, fiscal ID, MRA dashboard",
    ],
  },
  {
    name: "MRA EBS (Node.js)",
    source: "Bitbucket",
    tech: "Node.js, crypto, moment.js",
    files: 4,
    quality: "Good",
    verdict: "extracted",
    what: "Server-side port of MRA client. Used as primary reference for TypeScript port.",
    features: [
      "Async/await pattern",
      "Native crypto module (AES-256-ECB, RSA)",
      "Test credentials included",
    ],
    issues: ["Token repository commented out", "RSA key hardcoded"],
    extracted: [
      "✅ Used as primary reference for mra-ebs-client.ts",
      "✅ Test credentials extracted for integration testing",
    ],
  },
  {
    name: "Print Barcode App",
    source: "Bitbucket",
    tech: "Electron, Angular 1.x, ZPL/EPL",
    files: 15,
    quality: "Fair",
    verdict: "ideas-only",
    what: "Desktop app for generating thermal shelf labels. ZPL + EPL printer command generation.",
    features: [
      "ZPL label template generator (modern Zebra)",
      "EPL label template generator (legacy Zebra)",
      "EAN-13 auto-detection (13 digits → EAN-13, else Code-128)",
      "CSV import (PapaParse)",
      "2-column label layout (4\" thermal roll)",
      "Printer selection from OS printer list",
    ],
    issues: [
      "Electron + Angular 1 — dead stack",
      "No barcode image generation — uses printer commands only",
      "node-printer requires native bindings per OS",
    ],
    extracted: [
      "📋 ZPL/EPL format logic ready to port to Kotlin (shelf labels feature)",
      "📋 EAN-13 detection logic reusable",
    ],
  },
  {
    name: "Warehouse App",
    source: "Bitbucket",
    tech: "Ionic 1, Angular 1, Cordova",
    files: 54,
    quality: "Poor",
    verdict: "ideas-only",
    what: "Full warehouse management: picking, put-away, stock moves, cycle count, replenishment.",
    features: [
      "Pick → Put Away → Move → Cycle Count workflow",
      "Multi-warehouse stock lookup",
      "Role-based visibility per user",
      "9 screens covering full warehouse lifecycle",
    ],
    issues: [
      "Hardcoded client logic (if/switch on ad_client_id)",
      "No offline support — requires constant server connection",
      "No barcode scanning — text input only",
      "Ionic 1 (EOL 2019), Angular 1 (EOL 2022)",
      "Security: credentials in localStorage, no encryption",
    ],
    extracted: [
      "📋 Warehouse workflow model (pick/put-away/move/count) — for future warehouse module",
      "📋 Role-based warehouse permissions concept",
    ],
  },
  {
    name: "Inventory Count Native",
    source: "Bitbucket",
    tech: "Java (Android), JExcelAPI",
    files: 8,
    quality: "Poor",
    verdict: "skip",
    what: "Simple scanner app: location + barcode + qty → export CSV/XLS. No server integration.",
    features: [
      "XLS export (WritableWorkbook)",
      "Audio beep confirmation",
      "In-memory scan list",
    ],
    issues: [
      "No barcode scanning — text input only (misleading name)",
      "No server sync — purely local file export",
      "No session model — can't resume counts",
      "RAM-only — app crash loses all data",
      "Pre-AndroidX, deprecated Support Library",
    ],
    extracted: ["📋 XLS export logic — useful for Z-report export feature"],
  },
  {
    name: "Inventory Spot Check",
    source: "Bitbucket",
    tech: "Java (Android), OkHttp 2, Fragments",
    files: 46,
    quality: "Fair",
    verdict: "ideas-only",
    what: "Load spot check document → edit quantities → complete + sync back. Has server integration.",
    features: [
      "Document load/complete lifecycle",
      "Qty difference calculation (counted vs booked)",
      "Fragment-based modular UI",
      "Server authentication + warehouse selection",
      "Audio feedback (beep on confirm)",
    ],
    issues: [
      "No barcode scanning — text input only",
      "OkHttp 2.7.5 (2015) — ancient, security issues",
      "Custom HTTP layer instead of Retrofit",
      "No offline support or sync queue",
      "Pre-AndroidX, deprecated Support Library",
      "File-based caching (no Room DB)",
    ],
    extracted: [
      "📋 Spot check API contract validates our inventory session approach",
      "📋 Document lifecycle (load → edit → complete) pattern",
    ],
  },
  {
    name: "Print Server",
    source: "Bitbucket",
    tech: "Java, Jetty 9, javax.print, AWT",
    files: 10,
    quality: "Fair",
    verdict: "ideas-only",
    what: "Desktop HTTP server relaying print jobs to OS printers. Base64 → ESC/POS conversion.",
    features: [
      "Embedded Jetty HTTP server",
      "Automatic printer discovery (PrintServiceLookup)",
      "Base64 → ESC/POS image conversion",
      "CORS headers for web clients",
      "System tray icon (minimize/exit)",
    ],
    issues: [
      "No authentication — anyone on network can print",
      "No job queue — direct send, no retry",
      "Jetty 9.0.4 (2013) — outdated",
      "Basic image handling",
      "No logging",
    ],
    extracted: [
      "📋 HTTP → printer relay pattern (similar to our KDS NanoHTTPD server)",
      "📋 Printer discovery + fallback logic",
    ],
  },
  {
    name: "Restaurant POS",
    source: "Bitbucket",
    tech: "Java Swing + Jetty 9 + Apache Derby + AngularJS 1.x",
    files: 99,
    quality: "Fair" as const,
    verdict: "ideas-only" as Verdict,
    what: "Standalone desktop restaurant POS. 18 DB tables, 15 servlets, WebSocket table locking. Full till reconciliation with 12 payment types.",
    features: [
      "12 payment types on till close (Cash, Card, Cheque, Gift, Voucher, Loyalty, Coupon, Deposit, MCB Juice, MYT Money, EMTEL, MIPS)",
      "Table locking via WebSocket (pessimistic, prevents concurrent edits)",
      "Table reservation system (reserve → cancel, waiter assignment)",
      "Table states: Available / Reserved / Ordered / Billed",
      "Clock in/out with DB table + sync",
      "Reprint audit trail (RE_PRINT table: who, what, when)",
      "Cash drawer open log (OPEN_DRAWER: user, reason, timestamp)",
      "Cashier control reconciliation (beginning → entered → difference)",
      "Draft order support (local only until sent to kitchen)",
      "Kitchen order audit (PRINTER_LOG with raw receipt bytes)",
      "Daily item sales report + price change report",
      "Hierarchical table merging (parent_table_id)",
      "Separate sequence counters per order type (dine-in vs takeaway)",
      "Online payment processing (card/voucher/loyalty via REST API)",
    ],
    issues: [
      "Java Swing desktop — not mobile",
      "Embedded Derby DB — single machine, no multi-terminal",
      "AngularJS 1.x (EOL 2022)",
      "100 hardcoded tables — no dynamic creation",
      "No station routing — all KOTs to one printer",
      "No KDS display — kitchen gets paper only",
      "No item-level status tracking",
      "Jetty 9.0.4 (2013) — outdated",
      "SQL injection risk (string concatenation in queries)",
      "Monolithic — 99 classes in single package",
    ],
    extracted: [
      "📋 12 payment type model for till reconciliation",
      "📋 Reprint audit trail (RE_PRINT table) for MRA compliance",
      "📋 Cash drawer open log for fraud monitoring",
      "📋 Cashier control reconciliation pattern",
      "📋 Clock in/out data model",
      "📋 Table reservation workflow",
      "📋 Kitchen order audit (printer log with raw receipt)",
      "📋 Daily item sales + price change reports",
    ],
  },
];

const verdictConfig = {
  "extracted": { bg: "bg-green-100", text: "text-green-700", label: "Extracted" },
  "ideas-only": { bg: "bg-blue-100", text: "text-blue-700", label: "Ideas Only" },
  "skip": { bg: "bg-gray-100", text: "text-gray-400", label: "Skip" },
};

const qualityConfig = {
  "Good": "bg-green-100 text-green-700",
  "Fair": "bg-amber-100 text-amber-700",
  "Poor": "bg-red-100 text-red-700",
};

export default function LegacyReview() {
  const extracted = projects.filter(p => p.verdict === "extracted").length;
  const ideas = projects.filter(p => p.verdict === "ideas-only").length;
  const skipped = projects.filter(p => p.verdict === "skip").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
          <p className="text-xs text-gray-500">Legacy Projects</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{extracted}</p>
          <p className="text-xs text-gray-500">Code Extracted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{ideas}</p>
          <p className="text-xs text-gray-500">Ideas Noted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{skipped}</p>
          <p className="text-xs text-gray-500">Skipped</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Legacy Posterita projects from Bitbucket, analyzed for reusable code and ideas.
        Our architecture (Room + CloudSync + Supabase + multi-module Gradle) is ahead of all legacy codebases.
      </p>

      {/* Projects */}
      {projects.map((p) => {
        const v = verdictConfig[p.verdict];
        return (
          <details key={p.name} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition">
              <span className="font-medium text-gray-900 flex-1">{p.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${qualityConfig[p.quality]}`}>
                {p.quality}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${v.bg} ${v.text}`}>
                {v.label}
              </span>
              <span className="text-xs text-gray-400">{p.files} files</span>
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-gray-50 space-y-4">
              <p className="text-sm text-gray-600">{p.what}</p>
              <p className="text-xs text-gray-400">
                <strong>Stack:</strong> {p.tech} · <strong>Source:</strong> {p.source}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Features</h4>
                  <ul className="space-y-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                        <span className="text-gray-300 mt-0.5">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-red-500 uppercase mb-2">Issues</h4>
                  <ul className="space-y-1">
                    {p.issues.map((f, i) => (
                      <li key={i} className="text-sm text-red-500 flex items-start gap-1.5">
                        <span className="mt-0.5">✗</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-green-600 uppercase mb-2">What We Took</h4>
                  <ul className="space-y-1">
                    {p.extracted.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600">{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
