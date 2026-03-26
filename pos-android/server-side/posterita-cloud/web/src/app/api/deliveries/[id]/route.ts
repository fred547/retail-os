import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "DELIVERY",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/deliveries/[id] — delivery detail */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { data, error } = await getDb()
      .from("delivery")
      .select("*")
      .eq("id", parseInt(id))
      .eq("account_id", accountId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    return NextResponse.json({ delivery: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delivery detail error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH /api/deliveries/[id] — update delivery status, assign driver, etc. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const update: any = { updated_at: new Date().toISOString() };

    // Status transitions with timestamps
    if (body.status) {
      update.status = body.status;
      if (body.status === "assigned") update.assigned_at = new Date().toISOString();
      if (body.status === "picked_up") update.picked_up_at = new Date().toISOString();
      if (body.status === "delivered") update.actual_delivery_at = new Date().toISOString();
    }

    // Driver assignment
    if (body.driver_id !== undefined) {
      update.driver_id = body.driver_id;
      update.driver_name = body.driver_name || null;
      if (body.driver_id && !body.status) update.status = "assigned";
      if (body.driver_id) update.assigned_at = new Date().toISOString();
    }

    // Other fields
    if (body.delivery_notes !== undefined) update.delivery_notes = body.delivery_notes;
    if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time;
    if (body.delivery_fee !== undefined) update.delivery_fee = body.delivery_fee;

    const { data, error } = await getDb()
      .from("delivery")
      .update(update)
      .eq("id", parseInt(id))
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update delivery ${id}: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ delivery: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delivery update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
