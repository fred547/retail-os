import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * GET /api/demo/status — Returns pool health and current visitor's session info.
 *
 * Public endpoint — no auth required.
 */
export async function GET() {
  const db = getDb();

  try {
    // Pool counts by status
    const [availableRes, claimedRes, resettingRes, totalRes] = await Promise.all([
      db.from("demo_pool").select("id", { count: "exact", head: true }).eq("status", "available"),
      db.from("demo_pool").select("id", { count: "exact", head: true }).eq("status", "claimed"),
      db.from("demo_pool").select("id", { count: "exact", head: true }).eq("status", "resetting"),
      db.from("demo_pool").select("id", { count: "exact", head: true }),
    ]);

    // Average session duration (from recently completed sessions)
    const { data: recentSessions } = await db
      .from("demo_pool")
      .select("claimed_at, last_reset_at")
      .not("claimed_at", "is", null)
      .order("last_reset_at", { ascending: false })
      .limit(50);

    let avgSessionMinutes: number | null = null;
    if (recentSessions && recentSessions.length > 0) {
      const durations = recentSessions
        .filter((s: any) => s.claimed_at && s.last_reset_at)
        .map((s: any) => (new Date(s.last_reset_at).getTime() - new Date(s.claimed_at).getTime()) / 60000);
      if (durations.length > 0) {
        avgSessionMinutes = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
      }
    }

    // Current visitor's session (from cookie)
    let currentSession: { account_id: string; time_remaining_seconds: number } | null = null;
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("posterita_demo_session")?.value;

      if (sessionToken) {
        const { data: session } = await db
          .from("demo_pool")
          .select("account_id, expires_at")
          .eq("session_token", sessionToken)
          .eq("status", "claimed")
          .single();

        if (session && new Date(session.expires_at) > new Date()) {
          currentSession = {
            account_id: session.account_id,
            time_remaining_seconds: Math.max(
              0,
              Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
            ),
          };
        }
      }
    } catch (_) {
      /* cookies() may fail in some contexts */
    }

    return NextResponse.json({
      pool: {
        total: totalRes.count ?? 0,
        available: availableRes.count ?? 0,
        claimed: claimedRes.count ?? 0,
        resetting: resettingRes.count ?? 0,
      },
      avg_session_minutes: avgSessionMinutes,
      current_session: currentSession,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to fetch pool status" }, { status: 500 });
  }
}
