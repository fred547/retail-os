import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { runFraudDetection } from "@/lib/fraud-detection";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "FRAUD",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** POST /api/fraud/detect — run anomaly detection for an account */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));

    // Default period: last 7 days. Validate dates if provided.
    const now = new Date();
    const periodEnd = body.period_end || now.toISOString();
    const periodStart = body.period_start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    if (isNaN(Date.parse(periodStart)) || isNaN(Date.parse(periodEnd))) {
      return NextResponse.json({ error: "Invalid period_start or period_end date" }, { status: 400 });
    }

    const db = getDb();
    const signals = await runFraudDetection(db, accountId, periodStart, periodEnd);

    if (signals.length === 0) {
      return NextResponse.json({ signals_created: 0, message: "No anomalies detected" });
    }

    // Insert new signals, skip duplicates (same type + account + period)
    let created = 0;
    for (const signal of signals) {
      // Check if an open signal of same type already exists for this period
      const { data: existing } = await db
        .from("fraud_signal")
        .select("id")
        .eq("account_id", accountId)
        .eq("signal_type", signal.signal_type)
        .eq("status", "open")
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue; // Skip duplicate

      const { error } = await db.from("fraud_signal").insert({
        account_id: signal.account_id,
        store_id: signal.store_id || null,
        user_id: signal.user_id || null,
        terminal_id: signal.terminal_id || null,
        signal_type: signal.signal_type,
        severity: signal.severity,
        title: signal.title,
        detail: signal.detail,
        metric_value: signal.metric_value,
        threshold: signal.threshold,
        period_start: signal.period_start,
        period_end: signal.period_end,
      });

      if (!error) created++;
    }

    return NextResponse.json({
      signals_detected: signals.length,
      signals_created: created,
      signals,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await logToErrorDb(accountId, `Fraud detect error: ${err.message}`, err.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
