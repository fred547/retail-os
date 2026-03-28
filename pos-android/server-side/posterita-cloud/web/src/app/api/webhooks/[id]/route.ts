import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "WEBHOOKS",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * PATCH /api/webhooks/[id] — update a webhook subscription.
 * Body: { url?, events?, description?, is_active? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const subId = parseInt(id);
    if (isNaN(subId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.url !== undefined) {
      const url = (body.url || "").trim();
      if (!url.startsWith("https://")) return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
      if (url.length > 2000) return NextResponse.json({ error: "URL too long" }, { status: 400 });
      updates.url = url;
    }

    if (body.events !== undefined) {
      const events: string[] = body.events || [];
      if (!events.length) return NextResponse.json({ error: "At least one event required" }, { status: 400 });
      const validEvents = new Set(WEBHOOK_EVENTS as readonly string[]);
      const invalid = events.filter((e) => !validEvents.has(e));
      if (invalid.length) return NextResponse.json({ error: `Invalid events: ${invalid.join(", ")}` }, { status: 400 });
      updates.events = events;
    }

    if (body.description !== undefined) updates.description = body.description || null;

    if (body.is_active !== undefined) {
      updates.is_active = !!body.is_active;
      // Reset failure count when re-enabling
      if (body.is_active) updates.failure_count = 0;
    }

    const { data, error } = await getDb()
      .from("webhook_subscription")
      .update(updates)
      .eq("id", subId)
      .eq("account_id", accountId)
      .select("id, url, events, is_active, description, failure_count, last_triggered")
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    return NextResponse.json({ data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Update webhook failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks/[id] — delete a webhook subscription and its logs.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const subId = parseInt(id);
    if (isNaN(subId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { error } = await getDb()
      .from("webhook_subscription")
      .delete()
      .eq("id", subId)
      .eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delete webhook failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
