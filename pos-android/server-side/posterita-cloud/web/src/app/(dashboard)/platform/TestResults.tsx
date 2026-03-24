"use client";

import { TEST_SUITES, API_ROUTE_COVERAGE, DB_TABLE_COVERAGE, computeCoverage } from "./test-data";
import {
  CheckCircle, XCircle, Smartphone, Globe, GitCommit, Clock, Zap,
  Terminal as TerminalIcon, Route, Shield, Database, AlertTriangle,
} from "lucide-react";

interface CiReport {
  id: number;
  git_sha: string;
  branch: string;
  commit_message: string;
  android_passed: number;
  android_failed: number;
  android_files: number;
  web_passed: number;
  web_failed: number;
  web_files: number;
  ts_errors: number;
  firebase_passed: number;
  firebase_failed: number;
  firebase_status: string | null;
  scenario_passed: number | null;
  scenario_failed: number | null;
  scenario_files: number | null;
  scenario_details: { name: string; tests: number; passed: number; failed: number; duration: number }[] | null;
  smoke_passed: number | null;
  smoke_failed: number | null;
  duration_ms: number | null;
  source: string | null;
  status: string;
  created_at: string;
}

export default function TestResults({ ciReports }: { ciReports: CiReport[] }) {
  const { android, web, smoke, render, adb, firebase, scenarios } = TEST_SUITES;
  const latest = ciReports[0];
  const coverage = computeCoverage();

  // Find the most recent report with scenario data
  const latestScenarioReport = ciReports.find(r => r.scenario_passed != null && r.scenario_passed > 0);

  // Find the most recent report with each test type
  const latestWithAndroid = ciReports.find(r => r.android_passed > 0);
  const latestWithWeb = ciReports.find(r => r.web_passed > 0);

  // Use CI data if available, otherwise static
  const androidPassed = latestWithAndroid?.android_passed ?? android.totalTests;
  const androidFailed = latestWithAndroid?.android_failed ?? 0;
  const androidSource = latestWithAndroid ? "DB" : "static";
  const webPassed = latestWithWeb?.web_passed ?? web.totalTests;
  const webFailed = latestWithWeb?.web_failed ?? 0;
  const webSource = latestWithWeb ? "DB" : "static";
  const tsErrors = latestWithWeb?.ts_errors ?? latest?.ts_errors ?? 0;
  const firebasePassed = latest?.firebase_passed ?? 0;
  const firebaseFailed = latest?.firebase_failed ?? 0;
  const firebaseStatus = latest?.firebase_status ?? "skipped";
  const firebaseTotal = firebasePassed > 0 || firebaseFailed > 0 ? firebasePassed + firebaseFailed : firebase.totalTests;

  // Scenario: prefer DB data, fall back to static
  const scenarioPassed = latestScenarioReport?.scenario_passed ?? scenarios.totalTests;
  const scenarioFailed = latestScenarioReport?.scenario_failed ?? 0;
  const scenarioFiles = latestScenarioReport?.scenario_files ?? scenarios.totalFiles;
  const scenarioDetails = latestScenarioReport?.scenario_details ?? null;
  const scenarioTotal = scenarioPassed + scenarioFailed;
  const scenarioSource = latestScenarioReport ? `DB (${new Date(latestScenarioReport.created_at).toLocaleDateString()})` : "static";

  const total = androidPassed + androidFailed + webPassed + webFailed + smoke.totalTests + render.totalTests + adb.totalTests + firebaseTotal + scenarioTotal;
  const allGreen = androidFailed === 0 && webFailed === 0 && tsErrors === 0 && firebaseFailed === 0 && scenarioFailed === 0;

  return (
    <div className="space-y-6">
      {/* Latest CI run */}
      {latest && (
        <div className={`rounded-xl border p-5 ${allGreen ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allGreen ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : (
                <XCircle size={24} className="text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${allGreen ? "text-green-800" : "text-red-800"}`}>
                  {allGreen ? "All tests passing" : "Some tests failing"}
                </p>
                <div className="flex items-center gap-3 text-sm mt-0.5">
                  <span className="flex items-center gap-1 text-gray-600">
                    <GitCommit size={13} />
                    {latest.git_sha} ({latest.branch})
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock size={13} />
                    {new Date(latest.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-600">{latest.commit_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Coverage + Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
        {/* Coverage metrics — prominent */}
        <div className="col-span-2 bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-blue-600" />
            <p className="text-sm font-semibold text-blue-900">API Route Coverage</p>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-4xl font-bold ${coverage.routes.pct >= 70 ? "text-green-600" : coverage.routes.pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {coverage.routes.pct}%
            </p>
            <p className="text-sm text-gray-500 mb-1">{coverage.routes.tested}/{coverage.routes.total} routes</p>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${coverage.routes.pct >= 70 ? "bg-green-500" : coverage.routes.pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${coverage.routes.pct}%` }}
            />
          </div>
        </div>
        <div className="col-span-2 bg-white rounded-xl border-2 border-purple-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={18} className="text-purple-600" />
            <p className="text-sm font-semibold text-purple-900">DB Table Coverage</p>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-4xl font-bold ${coverage.tables.pct >= 80 ? "text-green-600" : coverage.tables.pct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {coverage.tables.pct}%
            </p>
            <p className="text-sm text-gray-500 mb-1">{coverage.tables.tested}/{coverage.tables.total} tables</p>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${coverage.tables.pct >= 80 ? "bg-green-500" : coverage.tables.pct >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${coverage.tables.pct}%` }}
            />
          </div>
        </div>

        {/* Existing summary cards */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Tests</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <Smartphone size={20} className={androidFailed === 0 ? "text-green-600" : "text-red-600"} />
          <div>
            <p className="text-xs text-gray-500">Android Unit</p>
            <p className={`text-xl font-bold ${androidFailed === 0 ? "text-green-600" : "text-red-600"}`}>
              {androidPassed}/{androidPassed + androidFailed}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <Globe size={20} className={webFailed === 0 ? "text-green-600" : "text-red-600"} />
          <div>
            <p className="text-xs text-gray-500">Web Unit</p>
            <p className={`text-xl font-bold ${webFailed === 0 ? "text-green-600" : "text-red-600"}`}>
              {webPassed}/{webPassed + webFailed}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <Route size={20} className={scenarioFailed === 0 ? "text-blue-600" : "text-red-600"} />
          <div>
            <p className="text-xs text-gray-500">Scenarios</p>
            <p className={`text-xl font-bold ${scenarioFailed === 0 ? "text-blue-600" : "text-red-600"}`}>
              {scenarioPassed}/{scenarioTotal}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <Zap size={20} className="text-green-600" />
          <div>
            <p className="text-xs text-gray-500">Smoke</p>
            <p className="text-xl font-bold text-green-600">{smoke.totalTests + render.totalTests}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500">TS Errors</p>
          <p className={`text-xl font-bold ${tsErrors === 0 ? "text-green-600" : "text-red-600"}`}>{tsErrors}</p>
        </div>
      </div>

      {/* Coverage gaps */}
      {coverage.notTestedRoutes.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 flex items-center justify-between bg-orange-50">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-orange-600" />
              <h3 className="font-semibold">Coverage Gaps — {coverage.notTestedRoutes.length} untested API routes</h3>
            </div>
            <span className="text-xs text-gray-500">Run: npm run test:coverage</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {coverage.gaps.intake.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1">Product Intake ({coverage.gaps.intake.length} routes)</p>
                  {coverage.gaps.intake.map((r) => (
                    <p key={`${r.method}-${r.path}`} className="text-xs text-red-600 font-mono">{r.method} {r.path}</p>
                  ))}
                </div>
              )}
              {coverage.gaps.blink.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1">Blink Payments ({coverage.gaps.blink.length} routes)</p>
                  {coverage.gaps.blink.map((r) => (
                    <p key={`${r.method}-${r.path}`} className="text-xs text-red-600 font-mono">{r.method} {r.path}</p>
                  ))}
                </div>
              )}
              {coverage.gaps.account.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-800 mb-1">Account Mgmt ({coverage.gaps.account.length} routes)</p>
                  {coverage.gaps.account.map((r) => (
                    <p key={`${r.method}-${r.path}`} className="text-xs text-orange-600 font-mono">{r.method} {r.path}</p>
                  ))}
                </div>
              )}
              {coverage.gaps.admin.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-800 mb-1">Platform Admin ({coverage.gaps.admin.length} routes)</p>
                  {coverage.gaps.admin.map((r) => (
                    <p key={`${r.method}-${r.path}`} className="text-xs text-orange-600 font-mono">{r.method} {r.path}</p>
                  ))}
                </div>
              )}
              {coverage.gaps.other.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">Other ({coverage.gaps.other.length} routes)</p>
                  {coverage.gaps.other.map((r) => (
                    <p key={`${r.method}-${r.path}`} className="text-xs text-yellow-600 font-mono">{r.method} {r.path}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-3 border-t border-orange-100 bg-orange-50/50">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Not tested DB tables: {DB_TABLE_COVERAGE.filter((t) => t.status === "not-tested").map((t) => t.name).join(", ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* CI History */}
      {ciReports.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold">Recent CI Runs</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Commit</th>
                <th>Message</th>
                <th className="text-center">Android</th>
                <th className="text-center">Web</th>
                <th className="text-center">Scenarios</th>
                <th className="text-center">Firebase</th>
                <th className="text-center">TS</th>
                <th>Source</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {ciReports.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.status === "pass" ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                  </td>
                  <td className="font-mono text-xs">{r.git_sha}</td>
                  <td className="text-sm text-gray-600 max-w-xs truncate">{r.commit_message}</td>
                  <td className="text-center text-sm">
                    <span className={r.android_failed > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {r.android_passed}/{r.android_passed + r.android_failed}
                    </span>
                  </td>
                  <td className="text-center text-sm">
                    <span className={r.web_failed > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {r.web_passed}/{r.web_passed + r.web_failed}
                    </span>
                  </td>
                  <td className="text-center text-sm">
                    {r.scenario_passed != null ? (
                      <span className={(r.scenario_failed ?? 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        {r.scenario_passed}/{(r.scenario_passed ?? 0) + (r.scenario_failed ?? 0)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="text-center text-sm">
                    {r.firebase_status === "pass" ? (
                      <span className="text-green-600">{r.firebase_passed}/{r.firebase_passed + r.firebase_failed}</span>
                    ) : r.firebase_status === "fail" ? (
                      <span className="text-red-600 font-medium">{r.firebase_passed}/{r.firebase_passed + r.firebase_failed}</span>
                    ) : r.firebase_status === "timeout" ? (
                      <span className="text-orange-500">timeout</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="text-center text-sm">
                    <span className={r.ts_errors > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {r.ts_errors}
                    </span>
                  </td>
                  <td className="text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.source === "local" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {r.source ?? "ci"}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* API Route Coverage Detail */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-blue-100 flex items-center gap-3 bg-blue-50">
          <Shield size={18} className="text-blue-600" />
          <h3 className="font-semibold">API Route Coverage — {coverage.routes.tested}/{coverage.routes.total} tested</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Method</th>
              <th>Route</th>
              <th>Purpose</th>
              <th>Tested By</th>
            </tr>
          </thead>
          <tbody>
            {API_ROUTE_COVERAGE.map((r) => (
              <tr key={`${r.method}-${r.path}`} className={r.status === "not-tested" ? "bg-red-50/50" : ""}>
                <td>
                  {r.status === "tested" ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                </td>
                <td>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${
                    r.method === "GET" ? "bg-green-100 text-green-700" :
                    r.method === "POST" ? "bg-blue-100 text-blue-700" :
                    r.method === "PATCH" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {r.method}
                  </span>
                </td>
                <td className="font-mono text-sm">{r.path}</td>
                <td className="text-sm text-gray-600">{r.purpose}</td>
                <td className="text-xs text-gray-400">{r.testedBy || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Smoke + ADB tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Zap size={18} className="text-orange-500" />
            <h3 className="font-semibold">Production Smoke Tests — {smoke.totalTests} tests</h3>
          </div>
          <div className="p-4 text-sm text-gray-600">
            <p>Hits the <strong>real production API + Supabase</strong> on every push to main:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>API health check (sync endpoint)</li>
              <li>{18} critical tables exist and are queryable</li>
              <li>Data integrity (orphaned accounts, stale errors)</li>
              <li>Terminal type validation</li>
              <li>Sync contract (structured response)</li>
              <li>{12} web console pages load (200 or auth redirect)</li>
              <li>SQL injection attempts blocked</li>
              <li>Edge cases (empty/long/negative inputs)</li>
            </ul>
            <p className="mt-3 font-medium">+ {render.totalTests} Render Backend Tests:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Backend health + DB connectivity</li>
              <li>Monitor endpoints (errors, sync, accounts)</li>
              <li>WhatsApp webhook verification + payload handling</li>
              <li>CORS headers, security (malformed JSON)</li>
              <li>Cross-service monitor (/api/monitor)</li>
            </ul>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <TerminalIcon size={18} className="text-purple-500" />
            <h3 className="font-semibold">ADB Device Tests — {adb.totalTests} tests</h3>
          </div>
          <div className="p-4 text-sm text-gray-600">
            <p>Tests the <strong>actual Android app on a connected device</strong> via ADB + uiautomator XML hierarchy (no screenshots):</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>App launches without crash</li>
              <li>No ANR (Application Not Responding)</li>
              <li>Connectivity indicator present</li>
              <li>UI has elements (not blank screen)</li>
              <li>Memory under 300MB</li>
              <li>No fatal exceptions in logcat</li>
              <li>Room database files exist</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How to run coverage */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-2">How to Run Code Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-700 mb-1">Web (Vitest + V8)</p>
            <code className="block bg-slate-900 text-green-400 px-3 py-2 rounded-lg text-xs">
              cd web && npm run test:coverage
            </code>
            <p className="text-xs text-slate-500 mt-1">Generates HTML report at ./coverage/index.html</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 mb-1">Android (JaCoCo)</p>
            <code className="block bg-slate-900 text-green-400 px-3 py-2 rounded-lg text-xs">
              cd pos-android && ./gradlew testDebugUnitTestCoverage
            </code>
            <p className="text-xs text-slate-500 mt-1">Generates HTML report at app/build/reports/jacoco/</p>
          </div>
        </div>
      </div>

      {/* Scenario Tests */}
      <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-3">
            <Route size={18} className="text-blue-600" />
            <h3 className="font-semibold">Scenario Tests — {scenarioTotal} journey tests, {scenarioFiles} flows</h3>
            <span className="text-xs text-gray-400">{scenarios.version}</span>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            scenarioSource === "static" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
          }`}>
            {scenarioSource}
          </span>
        </div>
        <table className="data-table">
          <thead><tr><th style={{width:30}}></th><th>Scenario</th><th className="text-center">Tests</th><th>Coverage</th></tr></thead>
          <tbody>
            {scenarioDetails ? (
              scenarioDetails.map((f) => (
                <tr key={f.name}>
                  <td>{f.failed === 0 ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}</td>
                  <td className="font-mono text-sm">{f.name}</td>
                  <td className="text-center font-medium">{f.passed}/{f.tests}</td>
                  <td className="text-sm text-gray-500">{Math.round(f.duration / 1000)}s</td>
                </tr>
              ))
            ) : (
              scenarios.files.map((f) => (
                <tr key={f.name}>
                  <td><CheckCircle size={14} className="text-green-500" /></td>
                  <td className="font-mono text-sm">{f.name}</td>
                  <td className="text-center font-medium">{f.tests}</td>
                  <td className="text-sm text-gray-500">{f.area}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Firebase Test Lab */}
      <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-orange-100 flex items-center justify-between bg-orange-50">
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="text-orange-600" />
            <h3 className="font-semibold">Firebase Test Lab — {firebase.totalTests} tests on cloud device</h3>
            <span className="text-xs text-gray-400">{firebase.version}</span>
          </div>
          {(firebase as any).videoUrl && (
            <a
              href={(firebase as any).videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition"
            >
              Watch Video Recording
            </a>
          )}
        </div>
        <table className="data-table">
          <thead><tr><th style={{width:30}}></th><th>Test Class</th><th className="text-center">Tests</th><th>Coverage</th></tr></thead>
          <tbody>
            {firebase.files.map((f) => (
              <tr key={f.name}>
                <td>{f.area.includes("failed") ? <XCircle size={14} className="text-yellow-500" /> : <CheckCircle size={14} className="text-green-500" />}</td>
                <td className="font-mono text-sm">{f.name}</td>
                <td className="text-center font-medium">{f.tests}</td>
                <td className="text-sm text-gray-500">{f.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Static test file breakdowns */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Smartphone size={18} className="text-gray-500" />
          <h3 className="font-semibold">Android Unit Tests — {android.totalTests} tests, {android.totalFiles} files</h3>
        </div>
        <table className="data-table">
          <thead><tr><th style={{width:30}}></th><th>Test Class</th><th className="text-center">Tests</th><th>Coverage</th></tr></thead>
          <tbody>
            {android.files.map((f) => (
              <tr key={f.name}>
                <td><CheckCircle size={14} className="text-green-500" /></td>
                <td className="font-mono text-sm">{f.name}</td>
                <td className="text-center font-medium">{f.tests}</td>
                <td className="text-sm text-gray-500">{f.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Globe size={18} className="text-gray-500" />
          <h3 className="font-semibold">Web Console Tests — {web.totalTests} tests, {web.totalFiles} files</h3>
        </div>
        <table className="data-table">
          <thead><tr><th style={{width:30}}></th><th>Test File</th><th className="text-center">Tests</th><th>Coverage</th></tr></thead>
          <tbody>
            {web.files.map((f) => (
              <tr key={f.name}>
                <td><CheckCircle size={14} className="text-green-500" /></td>
                <td className="font-mono text-sm">{f.name}</td>
                <td className="text-center font-medium">{f.tests}</td>
                <td className="text-sm text-gray-500">{f.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
