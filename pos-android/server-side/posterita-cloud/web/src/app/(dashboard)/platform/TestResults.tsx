"use client";

import { TEST_SUITES } from "./test-data";
import { CheckCircle, XCircle, Smartphone, Globe, GitCommit, Clock, Zap, Terminal as TerminalIcon } from "lucide-react";

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
  status: string;
  created_at: string;
}

export default function TestResults({ ciReports }: { ciReports: CiReport[] }) {
  const { android, web, smoke, render, adb } = TEST_SUITES;
  const latest = ciReports[0];

  // Use CI data if available, otherwise static
  const androidPassed = latest?.android_passed ?? android.totalTests;
  const androidFailed = latest?.android_failed ?? 0;
  const webPassed = latest?.web_passed ?? web.totalTests;
  const webFailed = latest?.web_failed ?? 0;
  const tsErrors = latest?.ts_errors ?? 0;
  const total = androidPassed + androidFailed + webPassed + webFailed + smoke.totalTests + render.totalTests + adb.totalTests;
  const allGreen = androidFailed === 0 && webFailed === 0 && tsErrors === 0;

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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <Zap size={20} className="text-green-600" />
          <div>
            <p className="text-xs text-gray-500">Smoke + Render</p>
            <p className="text-xl font-bold text-green-600">{smoke.totalTests + render.totalTests}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <TerminalIcon size={20} className="text-green-600" />
          <div>
            <p className="text-xs text-gray-500">ADB Device</p>
            <p className="text-xl font-bold text-green-600">{adb.totalTests}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500">TS Errors</p>
          <p className={`text-xl font-bold ${tsErrors === 0 ? "text-green-600" : "text-red-600"}`}>{tsErrors}</p>
        </div>
      </div>

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
                <th className="text-center">TS</th>
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
                    <span className={r.ts_errors > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {r.ts_errors}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Static test file breakdown */}
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
