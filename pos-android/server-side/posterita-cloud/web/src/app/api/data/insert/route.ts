import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionAccountId } from "@/lib/account-context";

export const dynamic = "force-dynamic";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const ALLOWED_TABLES = new Set([
  "product", "productcategory", "orders", "customer", "store",
  "terminal", "tax", "preference", "pos_user",
  "intake_batch", "intake_item", "restaurant_table",
  "table_section", "preparation_station", "category_station_mapping",
  "modifier",
]);

export async function POST(req: NextRequest) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { table, data } = await req.json();

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' not allowed` }, { status: 403 });
    }

    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return NextResponse.json({ error: "data is required and must be a non-empty object" }, { status: 400 });
    }

    // Auto-inject account_id into the inserted record
    const insertData = { ...data, account_id: accountId };

    const { data: inserted, error } = await (getDb()
      .from(table) as any)
      .insert(insertData)
      .select();

    return NextResponse.json({ data: inserted ?? null, error: error?.message ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
