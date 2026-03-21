import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Temporary endpoint to run pending migrations.
 * DELETE THIS FILE after all migrations are applied.
 *
 * Tries Supabase pg/query API to run DDL statements.
 */
export async function GET() {
  const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/(.+)\.supabase\.co/)?.[1];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!ref) {
    return NextResponse.json({ error: "Cannot determine project ref" }, { status: 500 });
  }

  const results: string[] = [];

  async function runSQL(label: string, sql: string) {
    const res = await fetch(`https://${ref}.supabase.co/pg/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (res.ok) {
      results.push(`${label}: OK`);
    } else {
      const body = await res.text();
      results.push(`${label}: FAILED (${res.status}) ${body.substring(0, 200)}`);
    }
  }

  // Migration 00014: Product lifecycle
  await runSQL("product_status column", `
    ALTER TABLE product ADD COLUMN IF NOT EXISTS product_status TEXT DEFAULT 'live';
  `);
  await runSQL("source column", `
    ALTER TABLE product ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
  `);
  await runSQL("product_status index", `
    CREATE INDEX IF NOT EXISTS idx_product_status ON product(product_status) WHERE product_status != 'live';
  `);

  // Migration 00015: Intake pipeline
  await runSQL("intake_batch table", `
    CREATE TABLE IF NOT EXISTS intake_batch (
      batch_id SERIAL PRIMARY KEY,
      account_id INT NOT NULL,
      source TEXT NOT NULL,
      source_ref TEXT,
      source_file_url TEXT,
      status TEXT DEFAULT 'processing',
      item_count INT DEFAULT 0,
      approved_count INT DEFAULT 0,
      rejected_count INT DEFAULT 0,
      supplier_name TEXT,
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_by INT,
      reviewed_at TIMESTAMPTZ,
      notes TEXT
    );
  `);
  await runSQL("intake_item table", `
    CREATE TABLE IF NOT EXISTS intake_item (
      item_id SERIAL PRIMARY KEY,
      batch_id INT NOT NULL REFERENCES intake_batch(batch_id) ON DELETE CASCADE,
      account_id INT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      selling_price NUMERIC(12,2),
      cost_price NUMERIC(12,2),
      image_url TEXT,
      image_cdn_url TEXT,
      barcode TEXT,
      category_name TEXT,
      unit TEXT,
      supplier_sku TEXT,
      quantity NUMERIC(12,2),
      match_product_id INT,
      match_confidence NUMERIC(3,2),
      match_type TEXT,
      status TEXT DEFAULT 'pending',
      override_name TEXT,
      override_price NUMERIC(12,2),
      override_category_id INT,
      committed_product_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
  `);
  await runSQL("intake indexes", `
    CREATE INDEX IF NOT EXISTS idx_intake_batch_account ON intake_batch(account_id);
    CREATE INDEX IF NOT EXISTS idx_intake_item_batch ON intake_item(batch_id);
  `);

  // Migration 00016: OTT tokens (already exists but verify)
  await runSQL("ott_tokens table", `
    CREATE TABLE IF NOT EXISTS ott_tokens (
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
    );
  `);

  // Migration 00013: Error logs
  await runSQL("error_logs table", `
    CREATE TABLE IF NOT EXISTS error_logs (
      id SERIAL PRIMARY KEY,
      account_id TEXT,
      terminal_id INT,
      store_id INT,
      user_id INT,
      severity TEXT DEFAULT 'error',
      tag TEXT,
      message TEXT,
      stack_trace TEXT,
      device_info TEXT,
      app_version TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Verify
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  const checks = ["ott_tokens", "intake_batch", "intake_item", "error_logs"];
  for (const table of checks) {
    const { error } = await supabase.from(table).select("*").limit(1);
    results.push(`verify ${table}: ${error ? error.message : "OK"}`);
  }
  const { error: colErr } = await supabase.from("product").select("product_status, source").limit(1);
  results.push(`verify product columns: ${colErr ? colErr.message : "OK"}`);

  return NextResponse.json({ results });
}
