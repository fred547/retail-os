/**
 * Combined test reporter: reads all available test result files and creates
 * a single ci_report row with all test suite data.
 *
 * Usage: npx tsx scripts/report-all.ts
 *
 * Looks for:
 * - test-results.json (web unit tests from vitest)
 * - scenario-results.json (scenario tests from vitest)
 * - Android XML results in pos-android/app/build/test-results/
 *
 * Each field only updates if its source file exists — missing suites get 0.
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldyoiexyqvklujvwcaqq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const report: Record<string, any> = {
  web_passed: 0, web_failed: 0, web_files: 0,
  android_passed: 0, android_failed: 0, android_files: 0,
  scenario_passed: 0, scenario_failed: 0, scenario_files: 0,
  scenario_details: null,
  ts_errors: 0,
  source: "local",
};

// --- Web unit tests ---
const webFile = "test-results.json";
if (existsSync(webFile)) {
  const raw = JSON.parse(readFileSync(webFile, "utf-8"));
  const files = raw.testResults || [];
  for (const f of files) {
    report.web_passed += f.assertionResults?.filter((t: any) => t.status === "passed").length ?? 0;
    report.web_failed += f.assertionResults?.filter((t: any) => t.status === "failed").length ?? 0;
  }
  if (report.web_passed === 0 && raw.numPassedTests) {
    report.web_passed = raw.numPassedTests;
    report.web_failed = raw.numFailedTests || 0;
  }
  report.web_files = files.length;
  console.log(`Web: ${report.web_passed} passed, ${report.web_failed} failed`);
} else {
  console.log("Web: no test-results.json (skipped)");
}

// --- Scenario tests ---
const scenarioFile = "scenario-results.json";
if (existsSync(scenarioFile)) {
  const raw = JSON.parse(readFileSync(scenarioFile, "utf-8"));
  const files = raw.testResults || [];
  const details: any[] = [];
  for (const f of files) {
    const name = f.name?.replace(/^.*\/scenarios\//, "").replace(/\.test\.ts$/, "") || "unknown";
    const passed = f.assertionResults?.filter((t: any) => t.status === "passed").length ?? 0;
    const failed = f.assertionResults?.filter((t: any) => t.status === "failed").length ?? 0;
    report.scenario_passed += passed;
    report.scenario_failed += failed;
    details.push({ name, tests: passed + failed, passed, failed, duration: f.duration || 0 });
  }
  if (report.scenario_passed === 0 && raw.numPassedTests) {
    report.scenario_passed = raw.numPassedTests;
    report.scenario_failed = raw.numFailedTests || 0;
  }
  report.scenario_files = files.length;
  report.scenario_details = details;
  report.duration_ms = raw.duration || details.reduce((s: number, d: any) => s + d.duration, 0);
  console.log(`Scenarios: ${report.scenario_passed} passed, ${report.scenario_failed} failed`);
} else {
  console.log("Scenarios: no scenario-results.json (skipped)");
}

// --- Android tests ---
const androidResultsDir = join(__dirname, "../../../../app/build/test-results/testDebugUnitTest");
if (existsSync(androidResultsDir)) {
  const xmlFiles = readdirSync(androidResultsDir).filter(f => f.endsWith(".xml"));
  for (const file of xmlFiles) {
    const xml = readFileSync(join(androidResultsDir, file), "utf-8");
    const tests = parseInt(xml.match(/tests="(\d+)"/)?.[1] || "0");
    const failures = parseInt(xml.match(/failures="(\d+)"/)?.[1] || "0");
    const errors = parseInt(xml.match(/errors="(\d+)"/)?.[1] || "0");
    report.android_passed += tests - failures - errors;
    report.android_failed += failures + errors;
    report.android_files++;
  }
  console.log(`Android: ${report.android_passed} passed, ${report.android_failed} failed`);
} else {
  console.log("Android: no test results (skipped)");
}

// --- Git info ---
let gitSha = "unknown";
let branch = "main";
let commitMessage = "";
try {
  gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  commitMessage = execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
} catch {}

// --- Status ---
const anyFailed = report.web_failed > 0 || report.android_failed > 0 || report.scenario_failed > 0;
report.status = anyFailed ? "fail" : "pass";
report.git_sha = gitSha;
report.branch = branch;
report.commit_message = commitMessage;

// --- Insert ---
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function save() {
  const { error } = await db.from("ci_report").insert(report);
  if (error) {
    console.error("Failed to save:", error.message);
  } else {
    const total = report.web_passed + report.android_passed + report.scenario_passed;
    const failed = report.web_failed + report.android_failed + report.scenario_failed;
    console.log(`\nCI report saved: ${gitSha} — ${total} passed, ${failed} failed (${report.status})`);
  }
}

save();
