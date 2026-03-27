import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SYNC",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/sync/replay
 * Replays a failed sync inbox entry by re-submitting its payload to /api/sync.
 * Body: { inbox_id: number }
 */
export async function POST(req: NextRequest) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { inbox_id } = await req.json();
    if (!inbox_id) {
      return NextResponse.json({ error: "inbox_id required" }, { status: 400 });
    }

    const db = getDb();

    // Get the inbox entry
    const { data: entry, error } = await db
      .from("sync_inbox")
      .select("*")
      .eq("id", inbox_id)
      .eq("account_id", accountId)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: "Inbox entry not found" }, { status: 404 });
    }

    if (entry.status === "processed") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    // Mark as processing
    await db
      .from("sync_inbox")
      .update({ status: "processing", retry_count: (entry.retry_count || 0) + 1 })
      .eq("id", inbox_id);

    // Re-submit the payload to the sync endpoint
    const origin = req.nextUrl.origin;
    const syncRes = await fetch(`${origin}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry.payload),
    });

    const syncBody = await syncRes.json();

    // The sync endpoint will create a NEW inbox entry — mark the old one as replayed
    await db
      .from("sync_inbox")
      .update({
        status: syncBody.errors?.length ? "failed" : "processed",
        processed_at: new Date().toISOString(),
        error_message: syncBody.errors?.length ? `Replay: ${syncBody.errors.join("; ")}` : "Replayed successfully",
      })
      .eq("id", inbox_id);

    return NextResponse.json({
      success: true,
      orders_synced: syncBody.orders_synced || 0,
      tills_synced: syncBody.tills_synced || 0,
      errors: syncBody.errors || [],
    });
  } catch (e: any) {
    await logToErrorDb("system", `Sync replay failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
