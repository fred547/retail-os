import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { RENDER_BACKEND_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/infrastructure — collects billing, usage, and status from all services.
 * Used by the platform Infrastructure tab.
 */
export async function GET() {
  const services: Record<string, any> = {};

  // 1. Supabase — DB size + row counts
  try {
    const db = getDb();
    const tables = ["account", "owner", "product", "orders", "orderline", "customer",
      "store", "terminal", "pos_user", "error_logs", "sync_request_log", "ci_report"];
    const counts: Record<string, number> = {};
    await Promise.all(tables.map(async (t) => {
      const { count } = await db.from(t).select("*", { count: "exact", head: true });
      counts[t] = count ?? 0;
    }));
    const totalRows = Object.values(counts).reduce((s, c) => s + c, 0);

    services.supabase = {
      status: "active",
      project: "ldyoiexyqvklujvwcaqq",
      url: "https://ldyoiexyqvklujvwcaqq.supabase.co",
      plan: "Free (up to 500MB, 2 projects)",
      tables: counts,
      totalRows,
      cost: "$0/month (free tier)",
      limits: "500MB DB, 1GB file storage, 2GB bandwidth, 50k monthly active users",
    };
  } catch (e: any) {
    services.supabase = { status: "error", error: e.message };
  }

  // 2. Vercel
  services.vercel = {
    status: "active",
    team: "tamakgroup",
    project: "posterita-cloud",
    url: "https://web.posterita.com",
    plan: "Pro ($20/member/month)",
    features: "300s function timeout, 100GB bandwidth, 1TB edge cache, analytics",
    cost: "~$20/month",
    regions: ["bom1 (Mumbai)", "fra1 (Frankfurt)", "iad1 (Virginia)"],
  };

  // 3. Render — query health endpoint
  try {
    const res = await fetch(`${RENDER_BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(10000),
    });
    const health = await res.json();
    services.render = {
      status: health.status === "ok" ? "active" : "degraded",
      serviceId: "srv-d70mlka4d50c73f1d2t0",
      url: RENDER_BACKEND_URL,
      plan: "Starter ($19/month)",
      features: "Always-on, 512MB RAM, 0.5 CPU, auto-deploy on push",
      uptime: `${health.uptime_seconds}s`,
      cost: "$19/month",
    };
  } catch (e: any) {
    services.render = { status: "down", error: e.message, cost: "$19/month" };
  }

  // 4. Claude / Anthropic
  try {
    // No billing API available — provide static info
    services.anthropic = {
      status: "active",
      model: "claude-haiku-4-5-20251001",
      usage: "AI product import + intake processing",
      plan: "Pay-as-you-go",
      pricing: "$0.25/M input tokens, $1.25/M output tokens (Haiku 4.5)",
      cost: "~$5–25/month (depends on AI import volume)",
      keyConfigured: !!process.env.CLAUDE_API_KEY,
    };
  } catch (_) {
    services.anthropic = { status: "unknown" };
  }

  // 5. Firebase
  services.firebase = {
    status: "active",
    project: "posterita-retail-os",
    url: "https://console.firebase.google.com/project/posterita-retail-os/testlab",
    plan: "Spark (free)",
    features: "Test Lab: 10 virtual + 5 physical device tests/day. Video recording. Multi-device parallel.",
    cost: "$0/month (free tier)",
    usage: "Android UI tests on cloud devices (LoginFlow + NavigationFlow + Room DAO = 42 tests)",
    limits: "10 virtual tests/day, 5 physical tests/day",
    lastRun: "https://console.firebase.google.com/project/posterita-retail-os/testlab/histories/bh.a6c51873ad5e7aff/matrices/7872229024844517716",
  };

  // 6. Cloudinary
  services.cloudinary = {
    status: "active",
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp2u3pwiy",
    usage: "Product image hosting (AI import + intake)",
    plan: "Free (25 credits/month = ~25k transformations)",
    cost: "$0/month (free tier)",
    limits: "25 credits, 25k transformations, 25GB storage",
  };

  // 6. GitHub
  services.github = {
    status: "active",
    user: "fred547",
    repo: "retail-os",
    visibility: "private",
    plan: "Free (unlimited private repos, 2000 CI minutes/month)",
    cost: "$0/month",
    ci: "GitHub Actions — Android tests + Web tests + Smoke tests on every push",
  };

  // Total monthly cost estimate
  const totalCost = {
    vercel: 20,
    render: 19,
    supabase: 0,
    anthropic: "5–25 (variable)",
    firebase: 0,
    cloudinary: 0,
    github: 0,
    estimated_total: "$44–64/month",
  };

  return NextResponse.json({
    services,
    totalCost,
    timestamp: new Date().toISOString(),
  });
}
