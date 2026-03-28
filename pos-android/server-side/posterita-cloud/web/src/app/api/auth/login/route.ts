import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTH",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

// ── Brute force protection ──
// In-memory rate limiter: max 5 attempts per email per 15 minutes.
// Resets on server restart (acceptable for serverless — Vercel cold starts are frequent).
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.firstAttempt + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  entry.count++;
  return { allowed: true };
}

function resetRateLimit(email: string) {
  loginAttempts.delete(email);
}

/**
 * POST /api/auth/login
 *
 * Authenticates a user via Supabase Auth (email + password).
 * Returns account IDs so the Android app can set up locally and sync.
 *
 * Body: { email, password }
 * Returns: { owner_id, live_account_id, demo_account_id, user }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Brute force protection
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      await logToErrorDb("system", `Login rate limit exceeded for ${email}`);
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", retry_after_sec: rateCheck.retryAfterSec },
        { status: 429 }
      );
    }

    const supabase = getDb();

    // Authenticate via Supabase Auth
    // Use a separate client for auth sign-in (service role can't sign in as user)
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authErr } =
      await authClient.auth.signInWithPassword({ email, password });

    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Success — reset rate limit for this email
    resetRateLimit(email);

    // Find owner by email
    const { data: owner } = await supabase
      .from("owner")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!owner) {
      return NextResponse.json(
        { error: "No POS account found for this email" },
        { status: 404 }
      );
    }

    // Find ALL accounts for this owner (include sync_secret for HMAC auth)
    const { data: accounts } = await supabase
      .from("account")
      .select("account_id, type, businessname, currency, status, sync_secret")
      .eq("owner_id", owner.id)
      .order("created_at", { ascending: true });

    const liveAccount = accounts?.find((a: any) => a.type === "live");
    const demoAccount = accounts?.find((a: any) => a.type === "demo");

    // Get store/terminal IDs for the live account so Android can set up correctly
    let liveStoreId = 0, liveTerminalId = 0, liveUserId = 0;
    if (liveAccount) {
      const { data: store } = await supabase.from("store").select("store_id").eq("account_id", liveAccount.account_id).limit(1).single();
      if (store) liveStoreId = store.store_id;
      const { data: terminal } = await supabase.from("terminal").select("terminal_id").eq("account_id", liveAccount.account_id).limit(1).single();
      if (terminal) liveTerminalId = terminal.terminal_id;
      const { data: user } = await supabase.from("pos_user").select("user_id").eq("account_id", liveAccount.account_id).limit(1).single();
      if (user) liveUserId = user.user_id;
    }

    // Get the POS user for the live account so Android can update local DB
    let posUser: any = null;
    if (liveAccount) {
      const { data } = await supabase
        .from("pos_user")
        .select("user_id, username, firstname, lastname, pin, role, isadmin, issalesrep, isactive, email, phone1")
        .eq("account_id", liveAccount.account_id)
        .eq("email", email)
        .maybeSingle();
      posUser = data;
      // Fallback: get first owner user
      if (!posUser) {
        const { data: fallback } = await supabase
          .from("pos_user")
          .select("user_id, username, firstname, lastname, pin, role, isadmin, issalesrep, isactive, email, phone1")
          .eq("account_id", liveAccount.account_id)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();
        posUser = fallback;
      }
    }

    return NextResponse.json({
      owner_id: owner.id,
      live_account_id: liveAccount?.account_id || null,
      demo_account_id: demoAccount?.account_id || null,
      brand_name: liveAccount?.businessname || null,
      currency: liveAccount?.currency || null,
      sync_secret: liveAccount?.sync_secret || null,
      auth_user_id: authData.user.id,
      // POS user data for local DB update
      pos_user: posUser,
      // All brands for this owner
      accounts: (accounts ?? []).map((a: any) => ({
        account_id: a.account_id,
        type: a.type,
        businessname: a.businessname,
        currency: a.currency,
        status: a.status,
      })),
      // Server-assigned IDs for the primary (live) account
      live_store_id: liveStoreId,
      live_terminal_id: liveTerminalId,
      live_user_id: liveUserId,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Login failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
