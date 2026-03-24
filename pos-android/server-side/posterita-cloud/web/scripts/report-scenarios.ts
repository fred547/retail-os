/**
 * Parses vitest JSON output and inserts a ci_report row into Supabase.
 * Run after: npm run test:scenarios -- --reporter=json --outputFile=scenario-results.json
 *
 * Usage: npx tsx scripts/report-scenarios.ts [scenario-results.json]
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldyoiexyqvklujvwcaqq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const resultsFile = process.argv[2] || "scenario-results.json";

if (!existsSync(resultsFile)) {
  console.error(`Results file not found: ${resultsFile}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resultsFile, "utf-8"));

// Parse vitest JSON output
const testFiles = raw.testResults || [];
let totalPassed = 0;
let totalFailed = 0;
const fileDetails: { name: string; tests: number; passed: number; failed: number; duration: number }[] = [];

for (const file of testFiles) {
  const name = file.name?.replace(/^.*\/scenarios\//, "").replace(/\.test\.ts$/, "") || "unknown";
  const passed = file.assertionResults?.filter((t: any) => t.status === "passed").length ?? 0;
  const failed = file.assertionResults?.filter((t: any) => t.status === "failed").length ?? 0;
  totalPassed += passed;
  totalFailed += failed;
  fileDetails.push({ name, tests: passed + failed, passed, failed, duration: file.duration || 0 });
}

// Fallback: parse from raw.numPassedTests / numFailedTests
if (totalPassed === 0 && raw.numPassedTests) {
  totalPassed = raw.numPassedTests;
  totalFailed = raw.numFailedTests || 0;
}

// Get git info
let gitSha = "unknown";
let branch = "main";
let commitMessage = "";
try {
  gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  commitMessage = execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
} catch {}

const totalDuration = raw.duration || fileDetails.reduce((s, f) => s + f.duration, 0);

console.log(`Scenario results: ${totalPassed} passed, ${totalFailed} failed, ${testFiles.length} files, ${Math.round(totalDuration / 1000)}s`);

// Insert into ci_report
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function report() {
  const { error } = await db.from("ci_report").insert({
    git_sha: gitSha,
    branch,
    commit_message: commitMessage,
    scenario_passed: totalPassed,
    scenario_failed: totalFailed,
    scenario_files: testFiles.length,
    scenario_details: fileDetails,
    duration_ms: Math.round(totalDuration),
    status: totalFailed === 0 ? "pass" : "fail",
    source: "local",
  });

  if (error) {
    console.error("Failed to insert ci_report:", error.message);
    // Don't fail the build for reporting issues
  } else {
    console.log(`CI report saved: ${gitSha} (${branch}) — ${totalPassed}/${totalPassed + totalFailed} passed`);
  }
}

report();
