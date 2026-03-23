"use client";

import { useState } from "react";
import { Gauge, Play, Zap, Globe, Database, Server, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { RENDER_BACKEND_URL } from "@/lib/constants";

interface BenchmarkResult {
  name: string;
  category: string;
  ms: number;
  status: "pass" | "slow" | "fail";
  detail?: string;
}

const THRESHOLDS = {
  fast: 500,
  acceptable: 2000,
  slow: 5000,
};

function grade(ms: number): "pass" | "slow" | "fail" {
  if (ms <= THRESHOLDS.fast) return "pass";
  if (ms <= THRESHOLDS.acceptable) return "pass";
  if (ms <= THRESHOLDS.slow) return "slow";
  return "fail";
}

function scoreFromResults(results: BenchmarkResult[]): number {
  if (results.length === 0) return 0;
  let score = 100;
  for (const r of results) {
    if (r.status === "fail") score -= 15;
    else if (r.status === "slow") score -= 5;
    else if (r.ms > THRESHOLDS.fast) score -= Math.min(3, Math.floor(r.ms / 1000));
  }
  return Math.max(0, Math.min(100, score));
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-600";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Acceptable";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}

function msColor(ms: number): string {
  if (ms <= THRESHOLDS.fast) return "text-green-600";
  if (ms <= THRESHOLDS.acceptable) return "text-yellow-600";
  return "text-red-600";
}

function statusBadge(status: string) {
  switch (status) {
    case "pass": return "bg-green-100 text-green-700";
    case "slow": return "bg-yellow-100 text-yellow-700";
    case "fail": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function Benchmark() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runBenchmark = async () => {
    setRunning(true);
    setResults([]);
    const res: BenchmarkResult[] = [];

    const logBenchmarkError = async (name: string, category: string, ms: number, detail: string) => {
      try {
        await fetch("/api/errors/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            severity: "WARN",
            tag: "Benchmark",
            message: `${category}/${name}: ${detail} (${ms}ms)`,
          }),
        });
      } catch (_) {}
    };

    const bench = async (name: string, category: string, fn: () => Promise<string | undefined>) => {
      const start = performance.now();
      try {
        const detail = await fn();
        const ms = Math.round(performance.now() - start);
        const result: BenchmarkResult = { name, category, ms, status: grade(ms), detail };
        if (result.status === "fail") {
          await logBenchmarkError(name, category, ms, detail || "failed");
        }
        res.push(result);
        setResults([...res]);
      } catch (e: any) {
        const ms = Math.round(performance.now() - start);
        await logBenchmarkError(name, category, ms, e.message);
        res.push({ name, category, ms, status: "fail", detail: e.message });
        setResults([...res]);
      }
    };

    // Vercel API
    await bench("Sync API Health", "Vercel", async () => {
      const r = await fetch("/api/sync");
      const j = await r.json();
      return `v${j.sync_api_version}`;
    });

    await bench("Data Proxy (product query)", "Vercel", async () => {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "product", select: "product_id, name", limit: 5 }),
      });
      const j = await r.json();
      return `${j.data?.length ?? 0} rows`;
    });

    await bench("Data Proxy (order count)", "Vercel", async () => {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "orders", select: "order_id", limit: 1, count: "exact" }),
      });
      const j = await r.json();
      return `${j.count ?? 0} orders`;
    });

    await bench("Session Context", "Vercel", async () => {
      const r = await fetch("/api/context", { redirect: "manual" });
      if (r.status === 200) {
        const j = await r.json().catch(() => ({}));
        return j.account_id ? `account: ${j.account_id}` : "resolved";
      }
      // 307 = redirect to login (no session) — not a failure, just no auth
      return r.status === 307 ? "no session (redirect)" : `status ${r.status}`;
    });

    // Render Backend
    await bench("Backend Health", "Render", async () => {
      const r = await fetch(`${RENDER_BACKEND_URL}/health`);
      const j = await r.json();
      return `${j.status}, uptime ${j.uptime_seconds}s`;
    });

    await bench("Error Monitor", "Render", async () => {
      const r = await fetch(`${RENDER_BACKEND_URL}/monitor/errors`);
      const j = await r.json();
      return `${j.open_count} open, ${j.fatal_count} fatal`;
    });

    await bench("Sync Monitor", "Render", async () => {
      const r = await fetch(`${RENDER_BACKEND_URL}/monitor/sync`);
      const j = await r.json();
      return `${j.syncs_last_hour} syncs/hr, avg ${j.avg_duration_ms}ms`;
    });

    await bench("Account Stats", "Render", async () => {
      const r = await fetch(`${RENDER_BACKEND_URL}/monitor/accounts`);
      const j = await r.json();
      return `${j.accounts} accounts, ${j.owners} owners`;
    });

    // System Monitor (cross-service)
    await bench("Full System Monitor", "Cross-Service", async () => {
      const r = await fetch("/api/monitor");
      const j = await r.json();
      return `${j.status}, ${j.total_ms}ms total`;
    });

    // Page loads (SSR)
    const pages = [
      { name: "Dashboard", path: "/" },
      { name: "Products", path: "/products" },
      { name: "Orders", path: "/orders" },
      { name: "Terminals", path: "/terminals" },
    ];
    for (const p of pages) {
      await bench(`${p.name} Page`, "Page Load", async () => {
        const r = await fetch(p.path, { cache: "no-store", redirect: "manual" });
        if (r.status === 200) return "loaded";
        if (r.status === 307) return "auth redirect (ok)";
        return `status ${r.status}`;
      });
    }

    setRunning(false);
    setLastRun(new Date().toLocaleTimeString());
  };

  const score = scoreFromResults(results);
  const avgMs = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)
    : 0;
  const fastest = results.length > 0 ? Math.min(...results.map((r) => r.ms)) : 0;
  const slowest = results.length > 0 ? Math.max(...results.map((r) => r.ms)) : 0;

  // Generate recommendations
  const recommendations: string[] = [];
  if (results.length > 0) {
    const slowPages = results.filter((r) => r.category === "Page Load" && r.ms > 2000);
    if (slowPages.length > 0) recommendations.push(`${slowPages.length} page(s) load over 2s — consider adding loading skeletons or reducing server queries`);

    const slowRender = results.filter((r) => r.category === "Render" && r.ms > 3000);
    if (slowRender.length > 0) recommendations.push("Render backend is slow — check if the service is waking from sleep (upgrade to Starter plan for always-on)");

    const slowData = results.filter((r) => r.name.includes("Data Proxy") && r.ms > 1000);
    if (slowData.length > 0) recommendations.push("Data proxy queries are slow — check Supabase connection pool, add database indexes");

    const failedChecks = results.filter((r) => r.status === "fail");
    if (failedChecks.length > 0) recommendations.push(`${failedChecks.length} check(s) failed — investigate immediately`);

    if (avgMs < 500) recommendations.push("All endpoints are fast — no optimization needed");
    if (score >= 90 && recommendations.length === 0) recommendations.push("System is performing well across all services");
  }

  const categories = [...new Set(results.map((r) => r.category))];

  return (
    <div className="space-y-6">
      {/* Run button + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={runBenchmark}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-posterita-blue text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {running ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            {running ? "Running..." : "Run Benchmark"}
          </button>
          {lastRun && <span className="text-sm text-gray-400">Last run: {lastRun}</span>}
        </div>
        {results.length > 0 && (
          <div className="text-right">
            <div className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</div>
            <p className={`text-sm font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Checks Run</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{results.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Average</p>
            <p className={`text-3xl font-bold mt-1 ${msColor(avgMs)}`}>{avgMs}ms</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
            <ArrowDown size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Fastest</p>
              <p className="text-2xl font-bold text-green-600">{fastest}ms</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
            <ArrowUp size={20} className={msColor(slowest)} />
            <div>
              <p className="text-sm text-gray-500">Slowest</p>
              <p className={`text-2xl font-bold ${msColor(slowest)}`}>{slowest}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Zap size={18} className="text-yellow-500" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Minus size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results by category */}
      {categories.map((cat) => {
        const catResults = results.filter((r) => r.category === cat);
        const catAvg = Math.round(catResults.reduce((s, r) => s + r.ms, 0) / catResults.length);
        const Icon = cat === "Vercel" ? Globe : cat === "Render" ? Server : cat === "Page Load" ? Gauge : Database;

        return (
          <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-gray-500" />
                <h3 className="font-semibold">{cat}</h3>
              </div>
              <span className={`text-sm font-mono ${msColor(catAvg)}`}>avg {catAvg}ms</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th className="text-right">Response Time</th>
                  <th className="text-center">Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {catResults.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium">{r.name}</td>
                    <td className={`text-right font-mono ${msColor(r.ms)}`}>{r.ms}ms</td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                        {r.status === "pass" ? "Fast" : r.status === "slow" ? "Slow" : "Failed"}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">{r.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Legend */}
      {results.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> Fast (&lt;{THRESHOLDS.acceptable}ms)</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span> Slow ({THRESHOLDS.acceptable}–{THRESHOLDS.slow}ms)</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span> Failed (&gt;{THRESHOLDS.slow}ms or error)</span>
        </div>
      )}
    </div>
  );
}
