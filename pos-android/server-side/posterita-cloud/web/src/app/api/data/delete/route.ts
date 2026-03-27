import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "DATA",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

const ALLOWED_TABLES = new Set([
  "productcategory", "customer", "restaurant_table",
  "product", "store", "terminal", "pos_user", "orders",
  "table_section", "preparation_station", "category_station_mapping",
  "modifier",
]);

// Tables that support soft delete — mark as deleted instead of removing
const SOFT_DELETE_TABLES = new Set([
  "product", "store", "terminal", "pos_user", "customer", "productcategory", "orders",
]);

export async function POST(req: NextRequest) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { table, id } = await req.json();

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: `Table '${table}' not allowed for deletion` }, { status: 403 });
    }

    if (!id?.column || !id?.value) {
      return NextResponse.json({ error: "id with column and value is required" }, { status: 400 });
    }

    // Soft delete for supported tables; hard delete for others
    if (SOFT_DELETE_TABLES.has(table)) {
      const { error } = await (getDb()
        .from(table) as any)
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq(id.column, id.value)
        .eq("account_id", accountId);
      return NextResponse.json({ error: error?.message ?? null, soft_deleted: true });
    }

    // Hard delete for tables without soft-delete support
    const { error } = await (getDb()
      .from(table) as any)
      .delete()
      .eq(id.column, id.value)
      .eq("account_id", accountId);

    return NextResponse.json({ error: error?.message ?? null });
  } catch (e: any) {
    await logToErrorDb("system", `Data delete failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
