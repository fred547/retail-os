import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PURCHASE_ORDER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/purchase-orders/[id] — PO detail with lines */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const poId = parseInt(id);

    const [{ data: po, error: poErr }, { data: lines, error: lineErr }] = await Promise.all([
      getDb().from("purchase_order").select("*").eq("po_id", poId).eq("account_id", accountId).single(),
      getDb().from("purchase_order_line").select("*").eq("po_id", poId).eq("account_id", accountId).order("id", { ascending: true }),
    ]);

    if (poErr || !po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

    // Get supplier name
    const { data: supplier } = await getDb()
      .from("supplier")
      .select("name, contact_name, phone, email")
      .eq("supplier_id", po.supplier_id)
      .eq("account_id", accountId)
      .single();

    return NextResponse.json({
      order: { ...po, supplier_name: supplier?.name || "Unknown", supplier_detail: supplier },
      lines: lines || [],
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `PO detail error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/purchase-orders/[id] — update PO status/notes */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    const update: any = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const { data, error } = await getDb()
      .from("purchase_order")
      .update(update)
      .eq("po_id", parseInt(id))
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update PO ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `PO update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
