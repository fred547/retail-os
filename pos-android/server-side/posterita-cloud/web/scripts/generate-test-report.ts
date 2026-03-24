/**
 * Unified test report: parses vitest JSON output (web unit tests) and inserts into ci_report.
 * Run after: npm run test:report
 *
 * This handles web console unit tests. For scenario tests, use report-scenarios.ts.
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

const resultsFile = process.argv[2] || "test-results.json";

if (!existsSync(resultsFile)) {
  console.error(`Results file not found: ${resultsFile}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resultsFile, "utf-8"));

// Parse vitest JSON output
const testFiles = raw.testResults || [];
let webPassed = 0;
let webFailed = 0;

for (const file of testFiles) {
  const passed = file.assertionResults?.filter((t: any) => t.status === "passed").length ?? 0;
  const failed = file.assertionResults?.filter((t: any) => t.status === "failed").length ?? 0;
  webPassed += passed;
  webFailed += failed;
}

// Fallback
if (webPassed === 0 && raw.numPassedTests) {
  webPassed = raw.numPassedTests;
  webFailed = raw.numFailedTests || 0;
}

// Check TypeScript errors
let tsErrors = 0;
try {
  execSync("npx tsc --noEmit 2>&1", { encoding: "utf-8" });
} catch (e: any) {
  const output = e.stdout || "";
  tsErrors = (output.match(/error TS/g) || []).length;
}

// Git info
let gitSha = "unknown";
let branch = "main";
let commitMessage = "";
try {
  gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  commitMessage = execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
} catch {}

console.log(`Web tests: ${webPassed} passed, ${webFailed} failed, ${testFiles.length} files, ${tsErrors} TS errors`);

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function report() {
  const { error } = await db.from("ci_report").insert({
    git_sha: gitSha,
    branch,
    commit_message: commitMessage,
    web_passed: webPassed,
    web_failed: webFailed,
    web_files: testFiles.length,
    ts_errors: tsErrors,
    status: webFailed === 0 && tsErrors === 0 ? "pass" : "fail",
    source: "local",
  });

  if (error) {
    console.error("Failed to insert ci_report:", error.message);
  } else {
    console.log(`CI report saved: ${gitSha} — web ${webPassed}/${webPassed + webFailed}, TS errors: ${tsErrors}`);
  }
}

report();
