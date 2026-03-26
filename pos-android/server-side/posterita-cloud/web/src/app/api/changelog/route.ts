import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/changelog — fetch recent commits from GitHub API.
 * Returns commits grouped by date with category classification.
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/fred547/retail-os/commits?per_page=50",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "posterita-cloud",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ commits: [], error: `GitHub API: ${res.status}` });
    }

    const data = await res.json();

    const commits = data.map((c: any) => ({
      sha: c.sha?.substring(0, 7) || "",
      date: c.commit?.author?.date?.substring(0, 10) || "",
      message: c.commit?.message?.split("\n")[0] || "", // First line only
      author: c.commit?.author?.name || "",
      filesChanged: c.stats?.total || 0,
    }));

    // Get latest version info
    const latestSha = commits[0]?.sha || "unknown";

    return NextResponse.json({
      commits,
      version: {
        web: latestSha,
        android: "Room v30",
        api: "Sync v2",
        backend: "Render v1",
        sha: latestSha,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ commits: [], error: e.message });
  }
}
