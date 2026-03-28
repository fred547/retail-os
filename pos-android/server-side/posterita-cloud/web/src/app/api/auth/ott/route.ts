import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTH",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/auth/ott — Generate a One-Time Token for Android WebView auth.
 * SECURITY: Requires HMAC authentication (sync_secret) to prevent token creation by attackers.
 */
export async function POST(req: NextRequest) {
  const supabase = getDb();

  try {
    const body = await req.json();
    const { account_id, user_id, user_role, store_id, terminal_id } = body;

    if (!account_id || user_id == null) {
      return NextResponse.json({ error: "account_id and user_id required" }, { status: 400 });
    }

    // SECURITY: Require HMAC authentication
    const timestamp = req.headers.get("x-sync-timestamp");
    const signature = req.headers.get("x-sync-signature");

    if (!timestamp || !signature) {
      return NextResponse.json({ error: "Authentication required (HMAC headers missing)" }, { status: 401 });
    }

    // Verify timestamp within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 300) {
      return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
    }

    // Verify HMAC
    const { data: acc } = await supabase
      .from("account")
      .select("sync_secret")
      .eq("account_id", account_id)
      .single();

    if (acc?.sync_secret) {
      const payload = `${timestamp}.${JSON.stringify(body)}`;
      const expected = createHmac("sha256", acc.sync_secret).update(payload).digest("hex");
      try {
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
      }
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 60 * 1000).toISOString(); // 60 seconds

    // Store in database
    const { error } = await supabase.from("ott_tokens").insert({
      token,
      account_id: String(account_id),
      user_id: Number(user_id),
      user_role: user_role || null,
      store_id: store_id ? Number(store_id) : null,
      terminal_id: terminal_id ? Number(terminal_id) : null,
      expires_at,
    });

    if (error) {
      // Table might not exist yet — create it
      if (error.message.includes("does not exist")) {
        await supabase.rpc("exec_sql", {
          sql: `CREATE TABLE IF NOT EXISTS ott_tokens (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            token TEXT NOT NULL UNIQUE,
            account_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_role TEXT,
            store_id INTEGER,
            terminal_id INTEGER,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        });
        // Retry insert
        await supabase.from("ott_tokens").insert({
          token, account_id: String(account_id), user_id: Number(user_id),
          user_role, store_id, terminal_id, expires_at,
        });
      } else {
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
      }
    }

    // Clean up expired tokens
    await supabase.from("ott_tokens").delete().lt("expires_at", new Date().toISOString());

    return NextResponse.json({ token, expires_in: 60 });
  } catch (e: any) {
    await logToErrorDb("system", `OTT generation failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
