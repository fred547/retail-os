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

/** PATCH /api/tags/groups/[id] — update a tag group */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const body = await req.json();
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.color !== undefined) update.color = body.color;
    if (body.is_active !== undefined) update.is_active = body.is_active;

    const { data, error } = await getDb()
      .from("tag_group")
      .update(update)
      .eq("tag_group_id", groupId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ group: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag group update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/tags/groups/[id] — soft-delete group and its tags */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const now = new Date().toISOString();

    // Soft-delete all tags in the group
    await getDb()
      .from("tag")
      .update({ is_deleted: true, is_active: false, deleted_at: now, updated_at: now })
      .eq("tag_group_id", groupId)
      .eq("account_id", accountId);

    // Soft-delete the group
    const { error } = await getDb()
      .from("tag_group")
      .update({ is_deleted: true, is_active: false, deleted_at: now, updated_at: now })
      .eq("tag_group_id", groupId)
      .eq("account_id", accountId);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Tag group delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
