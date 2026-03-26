import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PROMOTION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** PATCH /api/promotions/[id] — update promotion */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await getDb()
      .from("promotion")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id))
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update promotion ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ promotion: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Promotion update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/promotions/[id] — soft delete promotion */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { error } = await getDb()
      .from("promotion")
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id))
      .eq("account_id", accountId);

    if (error) {
      await logToErrorDb(accountId, `Failed to delete promotion ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Promotion delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
