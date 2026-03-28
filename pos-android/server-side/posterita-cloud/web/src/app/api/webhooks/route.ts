import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import crypto from "crypto";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "WEBHOOKS",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/webhooks — list all webhook subscriptions for the account.
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("webhook_subscription")
      .select("id, url, events, is_active, description, created_at, last_triggered, failure_count")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `List webhooks failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/**
 * POST /api/webhooks — create a new webhook subscription.
 * Body: { url, events: string[], description? }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const url = (body.url || "").trim();
    const events: string[] = body.events || [];
    const description = (body.description || "").trim();

    // Validation
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
    if (!url.startsWith("https://")) return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    if (url.length > 2000) return NextResponse.json({ error: "URL too long" }, { status: 400 });
    if (!events.length) return NextResponse.json({ error: "At least one event is required" }, { status: 400 });
    if (events.length > 20) return NextResponse.json({ error: "Max 20 events per subscription" }, { status: 400 });

    // Validate event names
    const validEvents = new Set(WEBHOOK_EVENTS as readonly string[]);
    const invalidEvents = events.filter((e) => !validEvents.has(e));
    if (invalidEvents.length) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(", ")}` }, { status: 400 });
    }

    // Check subscription limit (max 20 per account)
    const { count } = await getDb()
      .from("webhook_subscription")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: "Max 20 webhook subscriptions per account" }, { status: 400 });
    }

    // Generate signing secret
    const secret = crypto.randomBytes(32).toString("hex");

    const { data, error } = await getDb()
      .from("webhook_subscription")
      .insert({
        account_id: accountId,
        url,
        events,
        secret,
        description: description || null,
      })
      .select("id, url, events, secret, is_active, description, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Create webhook failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
