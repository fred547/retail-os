import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "TAG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

const ENTITY_TABLES: Record<string, { table: string; idCol: string }> = {
  product: { table: "product_tag", idCol: "product_id" },
  customer: { table: "customer_tag", idCol: "customer_id" },
  order: { table: "order_tag", idCol: "order_id" },
};

/**
 * POST /api/tags/assign — bulk assign/remove tags
 * Body: { entity_type, entity_ids, add_tag_ids, remove_tag_ids }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { entity_type, entity_ids, add_tag_ids, remove_tag_ids } = body;

    if (!entity_type || !ENTITY_TABLES[entity_type]) {
      return NextResponse.json({ error: "entity_type must be product, customer, or order" }, { status: 400 });
    }
    if (!entity_ids?.length) {
      return NextResponse.json({ error: "entity_ids required" }, { status: 400 });
    }

    const { table, idCol } = ENTITY_TABLES[entity_type];
    let added = 0;
    let removed = 0;

    // Remove tags
    if (remove_tag_ids?.length) {
      for (const entityId of entity_ids) {
        const { count } = await getDb()
          .from(table)
          .delete({ count: "exact" })
          .eq("account_id", accountId)
          .eq(idCol, entityId)
          .in("tag_id", remove_tag_ids);
        removed += count ?? 0;
      }
    }

    // Add tags (upsert to handle duplicates gracefully)
    if (add_tag_ids?.length) {
      const inserts = [];
      for (const entityId of entity_ids) {
        for (const tagId of add_tag_ids) {
          inserts.push({ account_id: accountId, [idCol]: entityId, tag_id: tagId });
        }
      }
      const { error } = await getDb()
        .from(table)
        .upsert(inserts, { onConflict: `${idCol},tag_id`, ignoreDuplicates: true });

      if (error) throw error;
      added = inserts.length;
    }

    return NextResponse.json({ added, removed });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag assign error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
