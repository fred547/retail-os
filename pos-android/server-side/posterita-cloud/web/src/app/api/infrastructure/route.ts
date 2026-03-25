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
      plan: "Pro ($25/month)",
      compute: "Small (2 vCPUs, 2GB RAM)",
      region: "AWS ap-south-1 (Mumbai)",
      tables: counts,
      totalRows,
      cost: "$25/month",
      limits: "8GB DB, 100GB file storage, 250GB bandwidth, unlimited MAU",
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

  // 7. Usage metrics for upgrade recommendations
  const usage: Record<string, any> = {};
  try {
    const db = getDb();

    // Supabase: estimate DB size from row counts
    const totalRows = services.supabase?.totalRows ?? 0;
    const estimatedMB = Math.round(totalRows * 0.5 / 1000); // ~0.5KB per row average
    usage.supabase = {
      estimatedStorageMB: estimatedMB,
      limitMB: 500,
      pct: Math.round((estimatedMB / 500) * 100),
    };

    // Sync activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: syncCount7d } = await db.from("sync_request_log").select("*", { count: "exact", head: true }).gte("request_at", weekAgo);
    const { count: errorCount7d } = await db.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
    const { count: accountCount } = await db.from("account").select("*", { count: "exact", head: true });
    const { count: orderCount } = await db.from("orders").select("*", { count: "exact", head: true });

    usage.activity = {
      syncsLast7d: syncCount7d ?? 0,
      errorsLast7d: errorCount7d ?? 0,
      totalAccounts: accountCount ?? 0,
      totalOrders: orderCount ?? 0,
    };
  } catch (_) {}

  // 8. Generate upgrade recommendations
  const recommendations: { service: string; level: "info" | "warning" | "critical"; message: string; action: string }[] = [];

  // Supabase (Pro plan, 8GB limit)
  const supabaseLimitMB = 8192; // 8GB on Pro
  const supabaseEstMB = usage.supabase?.estimatedMB ?? 0;
  const supabasePct = Math.round((supabaseEstMB / supabaseLimitMB) * 100);
  usage.supabase = { ...usage.supabase, limitMB: supabaseLimitMB, pct: supabasePct };
  if (supabasePct > 70) {
    recommendations.push({
      service: "supabase", level: "warning",
      message: `Database at ~${supabasePct}% of 8GB Pro limit (est. ${supabaseEstMB}MB).`,
      action: "Consider upgrading compute or enabling read replicas. Team plan ($599/month) adds PITR + SSO.",
    });
  } else {
    recommendations.push({
      service: "supabase", level: "info",
      message: `Database at ~${supabasePct}% of 8GB — Pro plan with Small compute (2 vCPUs, 2GB RAM).`,
      action: "Healthy capacity. Scale compute up if sync latency increases under load.",
    });
  }

  // Render
  const renderStatus = services.render?.status;
  if (renderStatus === "down" || renderStatus === "degraded") {
    recommendations.push({
      service: "render", level: "critical",
      message: "Backend is down or degraded. Starter plan has 512MB RAM.",
      action: "Upgrade to Render Standard ($25/month) for 2GB RAM, auto-scaling, and zero-downtime deploys.",
    });
  } else {
    recommendations.push({
      service: "render", level: "info",
      message: "Backend healthy on Starter plan (512MB RAM, always-on).",
      action: "Upgrade to Standard when concurrent users exceed ~50 or memory pressure increases.",
    });
  }

  // Vercel
  recommendations.push({
    service: "vercel", level: "info",
    message: "Pro plan ($20/month) with 300s timeout and 3 regions.",
    action: "Sufficient for current scale. Consider Enterprise only if you need >300s functions or custom SLAs.",
  });

  // Activity-based
  const syncsPerDay = Math.round((usage.activity?.syncsLast7d ?? 0) / 7);
  if (syncsPerDay > 500) {
    recommendations.push({
      service: "supabase", level: "warning",
      message: `${syncsPerDay} syncs/day — high API volume for free tier (50k MAU limit).`,
      action: "Monitor Supabase MAU dashboard. Upgrade to Pro if approaching 50k monthly active users.",
    });
  }

  const errorsPerDay = Math.round((usage.activity?.errorsLast7d ?? 0) / 7);
  if (errorsPerDay > 50) {
    recommendations.push({
      service: "supabase", level: "warning",
      message: `${errorsPerDay} errors/day logged — high error volume.`,
      action: "Investigate error trends before they consume storage. Consider error log rotation.",
    });
  }

  // Firebase
  recommendations.push({
    service: "firebase", level: "info",
    message: "Spark plan: 10 virtual + 5 physical tests/day.",
    action: "Upgrade to Blaze (pay-as-you-go) when daily test quota is exceeded regularly.",
  });

  // Cloudinary
  recommendations.push({
    service: "cloudinary", level: "info",
    message: "Free tier: 25 credits/month, 25GB storage.",
    action: "Upgrade to Plus ($89/month) when product image count exceeds 10k or transformations spike.",
  });

  // Total monthly cost estimate
  const totalCost = {
    vercel: 20,
    render: 19,
    supabase: 25,
    anthropic: "5–25 (variable)",
    firebase: 0,
    cloudinary: 0,
    github: 0,
    estimated_total: "$69–89/month",
  };

  return NextResponse.json({
    services,
    usage,
    recommendations,
    totalCost,
    timestamp: new Date().toISOString(),
  });
}
