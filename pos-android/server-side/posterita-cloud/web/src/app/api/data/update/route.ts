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
  "intake_batch", "intake_item",
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
