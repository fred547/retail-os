import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: string[] = [];

  // Create ott_tokens table using raw SQL via postgrest
  // Since we can't run DDL via postgrest, we'll use the supabase-js query builder
  // to test if the table exists, and if not, guide the user.

  // Actually — let's try inserting and catching the error to confirm status
  const { error: checkErr } = await supabase.from("ott_tokens").select("id").limit(1);

  if (checkErr?.message?.includes("does not exist")) {
    // Table doesn't exist — create it via the Supabase Management API
    const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    if (!ref) {
      return NextResponse.json({ error: "Cannot determine project ref" }, { status: 500 });
    }

    // Use the service role key to call the SQL endpoint
    const sqlRes = await fetch(`https://${ref}.supabase.co/pg/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `CREATE TABLE IF NOT EXISTS ott_tokens (
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
        ); CREATE INDEX IF NOT EXISTS idx_ott_tokens_token ON ott_tokens(token) WHERE used = FALSE;`
      }),
    });

    if (sqlRes.ok) {
      results.push("ott_tokens table created via pg/query");
    } else {
      const body = await sqlRes.text();
      results.push(`pg/query failed (${sqlRes.status}): ${body}`);

      // Fallback: try exec_sql RPC
      const { error: rpcErr } = await supabase.rpc("exec_sql", {
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

      if (rpcErr) {
        results.push(`exec_sql RPC failed: ${rpcErr.message}`);
      } else {
        results.push("ott_tokens table created via exec_sql RPC");
      }
    }
  } else {
    results.push("ott_tokens table already exists");
  }

  // Check other tables
  const { error: intakeErr } = await supabase.from("intake_batch").select("batch_id").limit(1);
  results.push(intakeErr ? `intake_batch: ${intakeErr.message}` : "intake_batch: OK");

  const { error: productErr } = await supabase.from("product").select("product_status").limit(1);
  results.push(productErr ? `product.product_status: ${productErr.message}` : "product.product_status: OK");

  return NextResponse.json({ results });
}
