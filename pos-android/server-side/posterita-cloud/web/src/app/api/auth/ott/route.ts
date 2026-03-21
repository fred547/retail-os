import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const { account_id, user_id, user_role, store_id, terminal_id } = body;

    if (!account_id || user_id == null) {
      return NextResponse.json({ error: "account_id and user_id required" }, { status: 400 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Clean up expired tokens
    await supabase.from("ott_tokens").delete().lt("expires_at", new Date().toISOString());

    return NextResponse.json({ token, expires_in: 60 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
