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

/** PATCH /api/tags/[id] — update a tag */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) update.name = body.name;
    if (body.color !== undefined) update.color = body.color;
    if (body.position !== undefined) update.position = body.position;
    if (body.is_active !== undefined) update.is_active = body.is_active;

    const { data, error } = await getDb()
      .from("tag")
      .update(update)
      .eq("tag_id", parseInt(id))
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ tag: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/tags/[id] — soft-delete a tag */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const now = new Date().toISOString();

    // Remove junction rows for this tag
    await getDb().from("product_tag").delete().eq("tag_id", parseInt(id)).eq("account_id", accountId);
    await getDb().from("customer_tag").delete().eq("tag_id", parseInt(id)).eq("account_id", accountId);
    await getDb().from("order_tag").delete().eq("tag_id", parseInt(id)).eq("account_id", accountId);

    const { error } = await getDb()
      .from("tag")
      .update({ is_deleted: true, is_active: false, deleted_at: now, updated_at: now })
      .eq("tag_id", parseInt(id))
      .eq("account_id", accountId);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
