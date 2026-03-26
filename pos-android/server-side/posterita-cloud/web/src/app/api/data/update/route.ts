import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId, getSessionUserId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_TABLES = new Set([
  "product", "productcategory", "orders", "customer", "store",
  "terminal", "tax", "preference", "pos_user",
  "intake_batch", "intake_item", "restaurant_table",
  "error_logs",
  "table_section", "preparation_station", "category_station_mapping", "account_tax_config",
  "modifier",
  // SECURITY: "owner" removed — must go through /api/owner/[id]
]);

export async function POST(req: NextRequest) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { table, id, updates } = await req.json();

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' not allowed` }, { status: 403 });
    }

    if (!id?.column || !id?.value || !updates) {
      return NextResponse.json({ error: "id and updates required" }, { status: 400 });
    }

    // Track who updated the record (for tables that have updatedby)
    const AUDITED_TABLES = new Set(["product", "productcategory", "store", "terminal", "tax"]);
    if (AUDITED_TABLES.has(table)) {
      const userId = await getSessionUserId();
      if (userId > 0) {
        updates.updatedby = userId;
      }
      updates.updated_at = new Date().toISOString();
    }

    // Scope update to user's account to prevent cross-account mutations
    const { error } = await (getDb()
      .from(table) as any)
      .update(updates)
      .eq(id.column, id.value)
      .eq("account_id", accountId);

    return NextResponse.json({ error: error?.message ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
