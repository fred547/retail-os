import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "LOYALTY_CONFIG",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/loyalty/config — get loyalty configuration for current account */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("loyalty_config")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      await logToErrorDb(accountId, `Failed to fetch loyalty config: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }

    // Return default config if none exists
    return NextResponse.json({
      config: data || {
        account_id: accountId,
        points_per_currency: 1,
        redemption_rate: 0.01,
        min_redeem_points: 100,
        is_active: false,
        welcome_bonus: 0,
      },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Loyalty config error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/loyalty/config — create or update loyalty configuration */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { points_per_currency, redemption_rate, min_redeem_points, is_active, welcome_bonus } = body;

    const payload = {
      account_id: accountId,
      points_per_currency: points_per_currency ?? 1,
      redemption_rate: redemption_rate ?? 0.01,
      min_redeem_points: min_redeem_points ?? 100,
      is_active: is_active ?? false,
      welcome_bonus: welcome_bonus ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getDb()
      .from("loyalty_config")
      .upsert(payload, { onConflict: "account_id" })
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to save loyalty config: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Loyalty config save error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
