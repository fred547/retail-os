import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SUPPLIER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/suppliers/[id] — get supplier detail */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { data, error } = await getDb()
      .from("supplier")
      .select("*")
      .eq("supplier_id", parseInt(id))
      .eq("account_id", accountId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    return NextResponse.json({ supplier: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Supplier detail error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/suppliers/[id] — update supplier */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await getDb()
      .from("supplier")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("supplier_id", parseInt(id))
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update supplier ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ supplier: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Supplier update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/suppliers/[id] — soft delete supplier */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { error } = await getDb()
      .from("supplier")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), is_active: false })
      .eq("supplier_id", parseInt(id))
      .eq("account_id", accountId);

    if (error) {
      await logToErrorDb(accountId, `Failed to delete supplier ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Supplier delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
