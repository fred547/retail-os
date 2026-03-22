import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionAccountId } from "@/lib/account-context";

export const dynamic = "force-dynamic";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const ALLOWED_TABLES = new Set([
  "productcategory", "customer",
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

    // Scope delete to user's account to prevent cross-account deletions
    const { error } = await (getDb()
      .from(table) as any)
      .delete()
      .eq(id.column, id.value)
      .eq("account_id", accountId);

    return NextResponse.json({ error: error?.message ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
