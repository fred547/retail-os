import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTO_TAG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/tags/auto-rules — list all auto-tag rules */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { data, error } = await getDb()
      .from("auto_tag_rule")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("priority", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ rules: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Auto-tag rules list: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/tags/auto-rules — create a rule */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, rule_type, category_ids, min_price, max_price, keyword, tag_ids, priority } = body;

    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!tag_ids?.length) return NextResponse.json({ error: "tag_ids required (at least one tag)" }, { status: 400 });

    const validTypes = ["category", "price_range", "keyword"];
    if (rule_type && !validTypes.includes(rule_type)) {
      return NextResponse.json({ error: `rule_type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("auto_tag_rule")
      .insert({
        account_id: accountId,
        name: name.trim(),
        rule_type: rule_type || "category",
        category_ids: category_ids || [],
        min_price: min_price ?? null,
        max_price: max_price ?? null,
        keyword: keyword?.trim() || null,
        tag_ids,
        priority: priority ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Auto-tag rule create: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/tags/auto-rules — update a rule (pass id in body) */
export async function PATCH(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const allowed = ["name", "rule_type", "category_ids", "min_price", "max_price", "keyword", "tag_ids", "is_active", "priority"];
    const safe: any = { updated_at: new Date().toISOString() };
    for (const k of allowed) { if (k in updates) safe[k] = updates[k]; }

    const { data, error } = await getDb()
      .from("auto_tag_rule")
      .update(safe)
      .eq("id", id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ rule: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Auto-tag rule update: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/tags/auto-rules — soft delete (pass id in body) */
export async function DELETE(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await getDb()
      .from("auto_tag_rule")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", accountId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Auto-tag rule delete: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
