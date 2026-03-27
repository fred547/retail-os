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

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.type !== undefined) update.type = body.type;
    if (body.discount_value !== undefined) update.discount_value = body.discount_value;
    if (body.buy_quantity !== undefined) update.buy_quantity = body.buy_quantity;
    if (body.get_quantity !== undefined) update.get_quantity = body.get_quantity;
    if (body.applies_to !== undefined) update.applies_to = body.applies_to;
    if (body.product_ids !== undefined) update.product_ids = body.product_ids;
    if (body.category_ids !== undefined) update.category_ids = body.category_ids;
    if (body.min_order_amount !== undefined) update.min_order_amount = body.min_order_amount;
    if (body.max_discount_amount !== undefined) update.max_discount_amount = body.max_discount_amount;
    if (body.promo_code !== undefined) update.promo_code = body.promo_code;
    if (body.max_uses !== undefined) update.max_uses = body.max_uses;
    if (body.start_date !== undefined) update.start_date = body.start_date;
    if (body.end_date !== undefined) update.end_date = body.end_date;
    if (body.start_time !== undefined) update.start_time = body.start_time;
    if (body.end_time !== undefined) update.end_time = body.end_time;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.priority !== undefined) update.priority = body.priority;
    if (body.store_id !== undefined) update.store_id = body.store_id;

    const { data, error } = await getDb()
      .from("promotion")
      .update(update)
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
