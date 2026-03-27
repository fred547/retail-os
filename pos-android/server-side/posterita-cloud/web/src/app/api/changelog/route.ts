import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "CHANGELOG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "posterita-cloud",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
};

/**
 * GET /api/changelog — fetch ALL commits from GitHub API (paginated).
 * Returns commits grouped by date with category classification + accurate stats.
 */
export async function GET() {
  try {
    // Paginate to get all commits (100 per page, up to 5 pages = 500 commits max)
    const allCommits: any[] = [];
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(
        `https://api.github.com/repos/fred547/retail-os/commits?per_page=100&page=${page}`,
        { headers: GITHUB_HEADERS, next: { revalidate: 300 } }
      );

      if (!res.ok) break;
      const data = await res.json();
      if (!data.length) break;
      allCommits.push(...data);
      if (data.length < 100) break; // Last page
    }

    const commits = allCommits.map((c: any) => ({
      sha: c.sha?.substring(0, 7) || "",
      date: c.commit?.author?.date?.substring(0, 10) || "",
      message: c.commit?.message?.split("\n")[0] || "", // First line only
      author: c.commit?.author?.name || "",
    }));

    // Compute accurate stats
    const uniqueDates = new Set(commits.map((c: any) => c.date));
    const bugFixes = commits.filter((c: any) => {
      const m = c.message.toLowerCase();
      return m.includes("fix") || m.includes("bug") || m.includes("revert") || m.includes("hotfix") || m.includes("patch");
    }).length;
    const features = commits.filter((c: any) => {
      const m = c.message.toLowerCase();
      return !m.includes("fix") && !m.includes("bug") && !m.includes("revert") &&
        (m.includes("add") || m.includes("implement") || m.includes("create") || m.includes("new") ||
         m.includes("feature") || m.includes("support") || m.includes("build") || m.includes("phase"));
    }).length;

    const latestSha = commits[0]?.sha || "unknown";

    return NextResponse.json({
      commits,
      stats: {
        total_commits: commits.length,
        days_active: uniqueDates.size,
        bug_fixes: bugFixes,
        features,
      },
      version: {
        web: latestSha,
        android: "Room v30",
        api: "Sync v2",
        backend: "Render v1",
        sha: latestSha,
      },
    });
  } catch (e: any) {
    await logToErrorDb("system", `Changelog fetch failed: ${e.message}`, e.stack);
    return NextResponse.json({ commits: [], error: e.message });
  }
}
