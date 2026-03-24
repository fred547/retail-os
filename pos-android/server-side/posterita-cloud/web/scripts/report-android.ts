/**
 * Parses Android Gradle test XML results and inserts into ci_report.
 * Run after: cd pos-android && ./gradlew testDebugUnitTest
 *
 * Looks for JUnit XML files in app/build/test-results/testDebugUnitTest/
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

// Find Android test results
const androidRoot = join(__dirname, "../../../..");  // pos-android/
const resultsDir = join(androidRoot, "app/build/test-results/testDebugUnitTest");

if (!existsSync(resultsDir)) {
  console.error(`Android test results not found at: ${resultsDir}`);
  console.error("Run: cd pos-android && ./gradlew testDebugUnitTest");
  process.exit(1);
}

// Parse JUnit XML files
const xmlFiles = readdirSync(resultsDir).filter(f => f.endsWith(".xml"));
let totalPassed = 0;
let totalFailed = 0;
let totalFiles = 0;

for (const file of xmlFiles) {
  const xml = readFileSync(join(resultsDir, file), "utf-8");
  // Parse <testsuite tests="N" failures="N" errors="N">
  const testsMatch = xml.match(/tests="(\d+)"/);
  const failuresMatch = xml.match(/failures="(\d+)"/);
  const errorsMatch = xml.match(/errors="(\d+)"/);

  const tests = parseInt(testsMatch?.[1] || "0");
  const failures = parseInt(failuresMatch?.[1] || "0");
  const errors = parseInt(errorsMatch?.[1] || "0");

  totalPassed += tests - failures - errors;
  totalFailed += failures + errors;
  totalFiles++;
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

console.log(`Android tests: ${totalPassed} passed, ${totalFailed} failed, ${totalFiles} files`);

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function report() {
  const { error } = await db.from("ci_report").insert({
    git_sha: gitSha,
    branch,
    commit_message: commitMessage,
    android_passed: totalPassed,
    android_failed: totalFailed,
    android_files: totalFiles,
    status: totalFailed === 0 ? "pass" : "fail",
    source: "local",
  });

  if (error) {
    console.error("Failed to insert ci_report:", error.message);
  } else {
    console.log(`CI report saved: ${gitSha} — android ${totalPassed}/${totalPassed + totalFailed}`);
  }
}

report();
