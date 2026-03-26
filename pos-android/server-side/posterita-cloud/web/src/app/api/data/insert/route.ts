import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId, getSessionUserId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

    // Auto-inject account_id and audit fields
    const insertData = { ...data, account_id: accountId };

    // Track who created the record (for tables that have createdby/updatedby)
    const AUDITED_TABLES = new Set(["product", "productcategory", "store", "terminal", "tax"]);
    if (AUDITED_TABLES.has(table)) {
      const userId = await getSessionUserId();
      if (userId > 0) {
        insertData.createdby = userId;
        insertData.updatedby = userId;
      }
      insertData.updated_at = new Date().toISOString();
    }

    const { data: inserted, error } = await (getDb()
      .from(table) as any)
      .insert(insertData)
      .select();

    return NextResponse.json({ data: inserted ?? null, error: error?.message ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
