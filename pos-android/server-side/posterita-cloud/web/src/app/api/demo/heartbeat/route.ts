import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const DEMO_COOKIE = "posterita_demo_session";
const SESSION_DURATION_HOURS = 2;
const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60;

/**
 * POST /api/demo/heartbeat — Extend a demo session while the user is active.
 *
 * Reads the session cookie, updates heartbeat_at and extends expires_at by 2 hours.
 * Called periodically by the DemoBanner component.
 */
export async function POST() {
  const db = getDb();

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(DEMO_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json({ ok: false, expired: true }, { status: 410 });
    }

    // Find active session
    const { data: pool, error: findError } = await db
      .from("demo_pool")
      .select("id, account_id, expires_at")
      .eq("session_token", sessionToken)
      .eq("status", "claimed")
      .single();

    if (findError || !pool) {
      return NextResponse.json({ ok: false, expired: true }, { status: 410 });
    }

    // Extend session
    const now = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    const { error: updateError } = await db
      .from("demo_pool")
      .update({
        heartbeat_at: now,
        expires_at: newExpiresAt,
      })
      .eq("id", pool.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // Update cookie expiry too
    cookieStore.set(DEMO_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    const timeRemaining = Math.max(
      0,
      Math.floor((new Date(newExpiresAt).getTime() - Date.now()) / 1000)
    );

    return NextResponse.json({
      ok: true,
      expires_at: newExpiresAt,
      time_remaining_seconds: timeRemaining,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
