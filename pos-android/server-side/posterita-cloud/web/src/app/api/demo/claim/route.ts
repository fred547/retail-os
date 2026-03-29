import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const DEMO_COOKIE = "posterita_demo_session";
const SESSION_DURATION_HOURS = 2;
const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60;
const MAX_CLAIMS_PER_IP_PER_HOUR = 3;

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
 * GET /api/demo/claim — Claim a demo account for a visitor.
 *
 * Query params:
 *   - industry (required): restaurant, fashion, cafe, grocery, electronics, warehouse
 *   - country (optional, default 'MU')
 *
 * If the visitor already has a valid demo session cookie, returns that account.
 * Otherwise picks a matching industry account, or any available account.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const ip = getClientIp(req.headers);
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry");
  const country = searchParams.get("country") || "MU";

  if (!industry) {
    return NextResponse.json(
      { error: "missing_industry", message: "Industry parameter is required." },
      { status: 400 }
    );
  }

  try {
    // 1. Check existing cookie
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(DEMO_COOKIE)?.value;

    if (existingToken) {
      const { data: existing } = await db
        .from("demo_pool")
        .select("*")
        .eq("session_token", existingToken)
        .eq("status", "claimed")
        .single();

      if (existing && new Date(existing.expires_at) > new Date()) {
        // Still valid — return existing session
        const accountInfo = await getAccountInfo(db, existing.account_id);
        const timeRemaining = Math.max(
          0,
          Math.floor((new Date(existing.expires_at).getTime() - Date.now()) / 1000)
        );

        return NextResponse.json({
          account_id: existing.account_id,
          ...accountInfo,
          industry: existing.industry ?? industry,
          country: existing.country ?? country,
          expires_at: existing.expires_at,
          session_duration_hours: SESSION_DURATION_HOURS,
          time_remaining_seconds: timeRemaining,
        });
      }

      // Cookie exists but expired — clear it and fall through to claim new one
    }

    // 2. Rate limit: max claims per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClaims } = await db
      .from("demo_pool")
      .select("id", { count: "exact", head: true })
      .eq("claimed_by_ip", ip)
      .gte("claimed_at", oneHourAgo);

    if ((recentClaims ?? 0) >= MAX_CLAIMS_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many demo requests. Please try again later.", retry_after: 60 },
        { status: 429 }
      );
    }

    // 3. Find next available account — prefer matching industry, fallback to any
    let available: any = null;

    // Try matching industry first
    const { data: industryMatch } = await db
      .from("demo_pool")
      .select("*")
      .eq("status", "available")
      .eq("industry", industry)
      .order("last_reset_at", { ascending: true })
      .limit(1)
      .single();

    if (industryMatch) {
      available = industryMatch;
    } else {
      // Fallback: any available account
      const { data: anyMatch, error: findError } = await db
        .from("demo_pool")
        .select("*")
        .eq("status", "available")
        .order("last_reset_at", { ascending: true })
        .limit(1)
        .single();

      if (findError || !anyMatch) {
        return NextResponse.json(
          { error: "demo_pool_full", message: "All demo accounts are in use. Please try again shortly.", retry_after: 60 },
          { status: 503 }
        );
      }
      available = anyMatch;
    }

    // 4. Claim it
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
    const now = new Date().toISOString();

    const { error: claimError } = await db
      .from("demo_pool")
      .update({
        status: "claimed",
        claimed_at: now,
        claimed_by_ip: ip,
        session_token: sessionToken,
        expires_at: expiresAt,
        heartbeat_at: now,
        industry,
        country,
      })
      .eq("id", available.id)
      .eq("status", "available"); // Optimistic lock — prevent race condition

    if (claimError) {
      await logDemoError(`Failed to claim demo account: ${claimError.message}`);
      return NextResponse.json(
        { error: "claim_failed", message: "Could not claim demo account. Please try again." },
        { status: 500 }
      );
    }

    // 5. Set cookie
    cookieStore.set(DEMO_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    // 6. Also set the account cache cookie so getSessionAccountId() resolves for this demo user
    cookieStore.set("posterita_account_cache", available.account_id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    const accountInfo = await getAccountInfo(db, available.account_id);

    return NextResponse.json({
      account_id: available.account_id,
      ...accountInfo,
      industry,
      country,
      expires_at: expiresAt,
      session_duration_hours: SESSION_DURATION_HOURS,
      time_remaining_seconds: SESSION_DURATION_SECONDS,
    });
  } catch (e: any) {
    await logDemoError(`Demo claim error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Fetch account context (store, terminal, user, business name, currency) for a demo account.
 */
async function getAccountInfo(
  db: any,
  accountId: string
): Promise<{
  store_id: number | null;
  terminal_id: number | null;
  user_id: number | null;
  businessname: string | null;
  currency: string | null;
}> {
  const [accountRes, storeRes] = await Promise.all([
    db.from("account").select("businessname").eq("account_id", accountId).single(),
    db.from("store").select("store_id, currency").eq("account_id", accountId).eq("isactive", true).limit(1).single(),
  ]);

  const storeId = storeRes.data?.store_id ?? null;
  const currency = storeRes.data?.currency ?? null;

  let terminalId: number | null = null;
  if (storeId) {
    const { data: terminal } = await db
      .from("terminal")
      .select("terminal_id")
      .eq("account_id", accountId)
      .eq("store_id", storeId)
      .limit(1)
      .single();
    terminalId = terminal?.terminal_id ?? null;
  }

  const { data: user } = await db
    .from("pos_user")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "owner")
    .limit(1)
    .single();

  return {
    store_id: storeId,
    terminal_id: terminalId,
    user_id: user?.user_id ?? null,
    businessname: accountRes.data?.businessname ?? null,
    currency,
  };
}
