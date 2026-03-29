import { NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const DEMO_COOKIE = "posterita_demo_session";

async function logDemoError(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "DEMO_POOL",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

/**
 * POST /api/demo/release — Release a demo account back to the pool.
 *
 * Reads the session cookie, marks the account as 'resetting',
 * and clears the cookie. The reset cron will clean up transactional data.
 */
export async function POST() {
  const db = getDb();

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(DEMO_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json({ released: false, error: "no_session" }, { status: 400 });
    }

    // Find the claimed account
    const { data: pool, error: findError } = await db
      .from("demo_pool")
      .select("id, account_id")
      .eq("session_token", sessionToken)
      .single();

    if (findError || !pool) {
      // Clear cookie even if not found — stale session
      cookieStore.delete(DEMO_COOKIE);
      cookieStore.delete("posterita_account_cache");
      return NextResponse.json({ released: true });
    }

    // Mark as resetting — the reset cron will clean it up
    const { error: updateError } = await db
      .from("demo_pool")
      .update({
        status: "resetting",
        session_token: null,
        expires_at: null,
      })
      .eq("id", pool.id);

    if (updateError) {
      await logDemoError(`Failed to release demo account ${pool.account_id}: ${updateError.message}`);
    }

    // Clear cookies
    cookieStore.delete(DEMO_COOKIE);
    cookieStore.delete("posterita_account_cache");

    return NextResponse.json({ released: true });
  } catch (e: any) {
    await logDemoError(`Demo release error: ${e.message}`, e.stack);
    return NextResponse.json({ released: false, error: "internal_error" }, { status: 500 });
  }
}
