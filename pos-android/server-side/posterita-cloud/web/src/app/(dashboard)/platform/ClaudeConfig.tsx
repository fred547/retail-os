"use client";

import { useState } from "react";
import {
  Bot, Zap, Shield, Bug, RefreshCw, BarChart3, Trash2,
  Rocket, Layers, TestTube, Smartphone, Globe, FlaskConical,
  Palette, ChevronDown, ChevronRight, Terminal, FileText,
  BookOpen, AlertTriangle, CheckCircle, Settings, Workflow,
} from "lucide-react";

// ── Data ────────────────────────────────────────────────

const skills = [
  {
    name: "/deploy",
    icon: Rocket,
    color: "bg-green-100 text-green-700",
    description: "Full deployment workflow to production",
    details: "Pre-flight checks (kill stale builds, TypeScript, Gradle), schema drift detection, test execution (unit + E2E), deploy web to Vercel + Android APK via Gradle, health verification.",
    when: "When you're ready to ship to production",
  },
  {
    name: "/schema-audit",
    icon: Layers,
    color: "bg-purple-100 text-purple-700",
    description: "Detect schema drift across Supabase ↔ Room ↔ TypeScript",
    details: "Reads all three schema sources, compares column names/types/nullability/defaults, flags mismatches, and fixes them. Produces a table showing status per column per platform.",
    when: "After any database changes, or periodically to catch drift",
  },
  {
    name: "/test-agent",
    icon: Bot,
    color: "bg-blue-100 text-blue-700",
    description: "Autonomous QA — runs ALL tests, fixes failures, repeats until 0 failures",
    details: "Runs Android unit, web unit, web E2E, Firebase DAO tests, and system health monitoring. Core rule: never stop at partial success — keeps fixing and re-running autonomously.",
    when: "Before any commit or deploy — the ultimate quality gate",
  },
  {
    name: "/test-android",
    icon: Smartphone,
    color: "bg-orange-100 text-orange-700",
    description: "Android production test pipeline (10 steps)",
    details: "Compile check → unit tests → device install → app launch → activity stack → network → sync verify → Firebase Test Lab → APK size → CI report.",
    when: "Before Android releases or after significant Android changes",
  },
  {
    name: "/test-web",
    icon: Globe,
    color: "bg-cyan-100 text-cyan-700",
    description: "Web console production test pipeline (7 steps)",
    details: "TypeScript check (0 errors) → build check (route count) → unit tests (Vitest) → E2E tests (Playwright) → API health → Supabase health → Render backend health.",
    when: "Before web deploys or after significant web changes",
  },
  {
    name: "/test-scenarios",
    icon: FlaskConical,
    color: "bg-yellow-100 text-yellow-700",
    description: "Journey tests against production Supabase",
    details: "Real-data integration tests exercising full business workflows: signup, login, sync, product lifecycle, till reconciliation, data isolation, OTT security, inventory, and more.",
    when: "After changes to API routes, sync logic, or business rules",
  },
  {
    name: "/posterita-ui",
    icon: Palette,
    color: "bg-pink-100 text-pink-700",
    description: "UI design reference — tokens, patterns, screen map",
    details: "Design tokens (colors, typography, spacing), screen patterns (top bars, cards, lists), prototype link, 10 design rules. Ensures visual consistency across all screens.",
    when: "When designing new screens or reviewing UI consistency",
  },
  {
    name: "/feature",
    icon: Zap,
    color: "bg-indigo-100 text-indigo-700",
    description: "Plan + scaffold a full feature (three-layer rule)",
    details: "Plans migration + Room entity + TS type + API route + web page + tests. Enforces the three-layer rule. Gets user approval before writing code. Runs builds after every step.",
    when: "Start here for every new feature — stock deduction, loyalty, Z-report, etc.",
  },
  {
    name: "/migration",
    icon: Layers,
    color: "bg-violet-100 text-violet-700",
    description: "Cross-platform migration (Supabase + Room + TypeScript)",
    details: "Creates Supabase SQL migration, Room migration (in BOTH getInstance AND buildDedicated — critical), entity, DAO, TypeScript type. Cross-checks all three layers.",
    when: "Any schema change — new table, new column, constraints",
  },
  {
    name: "/review",
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700",
    description: "Quality gate — security, schema, sync, error handling",
    details: "Reviews all recent changes for: schema consistency, sync correctness, OWASP security (injection, XSS, auth), error handling, code quality. Reports CRITICAL/HIGH/MEDIUM/LOW. Fixes issues immediately.",
    when: "Before every commit — the 'measure twice, cut once' check",
  },
  {
    name: "/sync-check",
    icon: RefreshCw,
    color: "bg-teal-100 text-teal-700",
    description: "Verify Android ↔ Web sync field mappings",
    details: "Compares four sources: Supabase columns, Room entity fields, sync API route, CloudSyncService mapping. Produces comparison table. Checks direction rules (master data = pull only).",
    when: "After touching any synced entity or adding new fields",
  },
  {
    name: "/debug",
    icon: Bug,
    color: "bg-red-100 text-red-700",
    description: "Production issue diagnosis",
    details: "Queries error_logs, sync_request_log, health endpoints. Traces stack traces to source code. Checks recent git changes. Root cause analysis with fix + prevention plan.",
    when: "When something breaks in production",
  },
  {
    name: "/report",
    icon: BarChart3,
    color: "bg-amber-100 text-amber-700",
    description: "Build a reporting feature (SQL → API → dashboard)",
    details: "Designs aggregation query, creates API route with CSV export, builds web dashboard with filters and summary cards. Includes templates for Z-report, daily sales, kitchen audit, price audit.",
    when: "Building Z-report, daily item sales, kitchen audit, price change audit, etc.",
  },
  {
    name: "/security-audit",
    icon: Shield,
    color: "bg-rose-100 text-rose-700",
    description: "OWASP vulnerability scan",
    details: "Checks for SQL/command injection, XSS, auth bypass, secrets exposure, multi-tenant isolation gaps, CORS misconfiguration, rate limiting gaps. Fixes CRITICAL/HIGH immediately.",
    when: "Periodically, or before deploying sensitive changes (auth, payments, sync)",
  },
  {
    name: "/cleanup",
    icon: Trash2,
    color: "bg-gray-100 text-gray-700",
    description: "Post-feature consistency check",
    details: "Verifies CLAUDE.md accuracy (entity counts, migration ranges, route tables, test counts, phase status). Checks build cleanliness, test passage, dead code, schema drift, git hygiene.",
    when: "After every feature — ensures nothing is left inconsistent",
  },
  {
    name: "/marathon",
    icon: Bot,
    color: "bg-purple-100 text-purple-700",
    description: "Autonomous overnight feature marathon",
    details: "Implements Phase 3 features one by one with full quality workflow: plan → implement (3-layer) → test → self-review → update docs → commit → next. Zero user interruption. Commits each feature individually. Skips blocked items. Runs 3-5 features per session.",
    when: "When you're going to sleep and want features implemented overnight",
  },
];

const workflowSteps = [
  { step: 1, command: "/feature", label: "Plan + scaffold", desc: "Three-layer implementation plan → get approval → scaffold" },
  { step: 2, command: "implement", label: "Build", desc: "Write code following the plan, type-check after every file" },
  { step: 3, command: "/review", label: "Quality gate", desc: "Security, schema, sync, error handling review" },
  { step: 4, command: "/sync-check", label: "Sync verify", desc: "If synced entity touched — verify field mappings" },
  { step: 5, command: "/test-agent", label: "Test everything", desc: "Autonomous: run all tests, fix failures, repeat until 0" },
  { step: 6, command: "/security-audit", label: "Security scan", desc: "OWASP top 10, multi-tenant isolation, auth checks" },
  { step: 7, command: "/cleanup", label: "Consistency", desc: "CLAUDE.md, test counts, dead code, build clean" },
  { step: 8, command: "/deploy", label: "Ship it", desc: "Vercel + Android, health verification" },
];

const reportWorkflow = [
  { step: 1, command: "/report", label: "Build report", desc: "SQL aggregation → API route → web dashboard" },
  { step: 2, command: "/review", label: "Quality gate", desc: "Check query correctness, column names, filters" },
  { step: 3, command: "/test-agent", label: "Test", desc: "Unit + scenario tests" },
  { step: 4, command: "/cleanup", label: "Consistency", desc: "Update docs, verify counts" },
  { step: 5, command: "/deploy", label: "Ship it", desc: "Deploy to production" },
];

const hooks = [
  {
    name: "Post-Edit Type Check",
    trigger: "After every file edit (Edit/Write tools)",
    action: "Auto-runs tsc --noEmit for .ts/.tsx files, ./gradlew compileDebugKotlin for .kt/.java files",
    why: "Catches type errors immediately — never batch errors to the end",
  },
];

const rules = [
  { num: 1, rule: "Android never talks to Supabase directly", detail: "All data through /api/sync" },
  { num: 2, rule: "Server is source of truth for master data", detail: "Products, categories, taxes flow server → device only" },
  { num: 3, rule: "Web console reads Supabase directly", detail: "Mutations through API routes" },
  { num: 4, rule: "Context = account_id + store_id + terminal_id", detail: "Every query scoped" },
  { num: 5, rule: "Offline-first", detail: "Every POS operation works without connectivity" },
  { num: 6, rule: "Three-layer rule", detail: "Every feature needs: migration + API route + UI" },
  { num: 7, rule: "No CRUD scaffolds", detail: "Every screen must feel designed" },
  { num: 8, rule: "All errors logged to error_logs", detail: "Never silent catch or console.error without DB logging" },
  { num: 9, rule: "Legacy workers disabled", detail: "Only CloudSyncWorker handles sync" },
  { num: 10, rule: "Capability-driven UI", detail: "Role-based visibility, not hardcoded" },
  { num: 11, rule: "Cloud-authoritative IDs", detail: "Server assigns all PKs" },
  { num: 12, rule: "Soft delete", detail: "is_deleted + deleted_at, never hard DELETE on key tables" },
  { num: 13, rule: "No standalone accounts", detail: "All via /api/auth/signup or /api/account/create-demo" },
  { num: 14, rule: "Demo brands are server-first", detail: "Never create demo products locally" },
  { num: 15, rule: "Passwords never stored locally", detail: "Only Supabase Auth holds passwords" },
  { num: 16, rule: "No PostgREST FK joins", detail: "Cross-tenant FKs dropped, use separate queries" },
  { num: 17, rule: "Validate column names against actual DB", detail: "Never assume — verify" },
];

// ── Components ──────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <Icon size={18} className="text-gray-600 shrink-0" />
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

function ToolCard({ name, icon: Icon, color, description, details, when }: {
  name: string;
  icon: any;
  color: string;
  description: string;
  details: string;
  when: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${color} shrink-0`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-bold text-gray-900">{name}</code>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500 leading-relaxed">{details}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-gray-700">When:</span>
                <span className="text-gray-500">{when}</span>
              </div>
            </div>
          )}
        </div>
        <span className="text-gray-300 shrink-0 mt-1">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>
    </div>
  );
}

function WorkflowStep({ step, command, label, desc, isLast }: {
  step: number;
  command: string;
  label: string;
  desc: string;
  isLast: boolean;
}) {
  const isCode = command.startsWith("/");
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-posterita-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">{label}</span>
          {isCode ? (
            <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{command}</code>
          ) : (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{command}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────

export default function ClaudeConfig() {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">16</div>
          <div className="text-xs text-gray-500 mt-1">Skills</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">17</div>
          <div className="text-xs text-gray-500 mt-1">Project Rules</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">1</div>
          <div className="text-xs text-gray-500 mt-1">Auto Hook</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">~600</div>
          <div className="text-xs text-gray-500 mt-1">CLAUDE.md Lines</div>
        </div>
      </div>

      {/* Workflow */}
      <Section title="Development Workflow — Per Feature" icon={Workflow} defaultOpen={true}>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Standard Feature</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {workflowSteps.map((s, i) => (
                <WorkflowStep key={s.step} {...s} isLast={i === workflowSteps.length - 1} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reports & Dashboards</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {reportWorkflow.map((s, i) => (
                <WorkflowStep key={s.step} {...s} isLast={i === reportWorkflow.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Skills */}
      <Section title="Skills (16 Slash Commands)" icon={Zap} defaultOpen={true}>
        <p className="text-xs text-gray-500 mb-4">
          Each skill is defined in <code className="bg-gray-100 px-1 rounded">.claude/skills/*/SKILL.md</code>.
          Invoke with <code className="bg-gray-100 px-1 rounded">/name</code>. Click to expand.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {skills.map((s) => <ToolCard key={s.name} {...s} />)}
        </div>
      </Section>

      {/* Hooks */}
      <Section title="Automation Hooks" icon={Settings} defaultOpen={false}>
        <p className="text-xs text-gray-500 mb-3">
          Hooks run automatically in response to Claude Code events. Configured in <code className="bg-gray-100 px-1 rounded">.claude/settings.json</code>.
        </p>
        {hooks.map((h) => (
          <div key={h.name} className="border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-sm text-gray-900">{h.name}</div>
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-2 text-xs">
                <span className="font-medium text-gray-600 w-14 shrink-0">Trigger:</span>
                <span className="text-gray-500">{h.trigger}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="font-medium text-gray-600 w-14 shrink-0">Action:</span>
                <span className="text-gray-500">{h.action}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="font-medium text-gray-600 w-14 shrink-0">Why:</span>
                <span className="text-gray-500">{h.why}</span>
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* Project Rules */}
      <Section title="Project Rules (from CLAUDE.md)" icon={BookOpen} defaultOpen={false}>
        <p className="text-xs text-gray-500 mb-3">
          These 17 rules are enforced by Claude Code on every interaction. Defined in the project&apos;s <code className="bg-gray-100 px-1 rounded">CLAUDE.md</code>.
        </p>
        <div className="space-y-1.5">
          {rules.map((r) => (
            <div key={r.num} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                {r.num}
              </span>
              <div>
                <span className="text-sm font-medium text-gray-900">{r.rule}</span>
                <span className="text-sm text-gray-400"> — </span>
                <span className="text-sm text-gray-500">{r.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CLAUDE.md overview */}
      <Section title="CLAUDE.md Configuration File" icon={FileText} defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            The <code className="bg-gray-100 px-1 rounded">CLAUDE.md</code> file is the master configuration document.
            It&apos;s loaded into every Claude Code conversation and governs all AI behavior in this project.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: "Build & Verification", desc: "Type-check after every edit, never batch errors" },
              { label: "Database & Sync", desc: "Always verify schema before writing queries" },
              { label: "Repository Map", desc: "5 core modules, web console, backend, migrations" },
              { label: "Module Architecture", desc: "32 entities, 32 DAOs, v29, 25 migrations" },
              { label: "API Routes", desc: "40+ endpoints across sync, auth, data, AI, intake" },
              { label: "Sync Protocol", desc: "Multi-brand, per-account timestamps, 6 hardening features" },
              { label: "Auth Flow", desc: "Signup wizard, PIN lock, OTT WebView, session recovery" },
              { label: "Kitchen & Restaurant", desc: "Table sections, prep stations, KDS, station routing" },
              { label: "DB Column Reference", desc: "Exact column names to prevent common mistakes" },
            ].map((item) => (
              <div key={item.label} className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              CLAUDE.md is ~600 lines. It&apos;s the single source of truth for how Claude Code operates in this project.
              Every edit to the codebase is governed by these instructions.
            </p>
          </div>
        </div>
      </Section>

      {/* File locations */}
      <Section title="File Locations" icon={Terminal} defaultOpen={false}>
        <div className="font-mono text-xs space-y-2 text-gray-600">
          <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-1.5">
            <span className="text-gray-400">CLAUDE.md</span>
            <span>/CLAUDE.md</span>
            <span className="text-gray-400">Settings</span>
            <span>/.claude/settings.json</span>
            <span className="text-gray-400">Skills (7)</span>
            <span>/.claude/skills/*/SKILL.md</span>
            <span className="text-gray-400">Commands (8)</span>
            <span>/.claude/commands/*.md</span>
            <span className="text-gray-400">Memory</span>
            <span>~/.claude/projects/*/memory/</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
