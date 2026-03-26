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

/** GET /api/deliveries — list deliveries with filters */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const driverId = url.searchParams.get("driver_id");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = getDb()
      .from("delivery")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (driverId) query = query.eq("driver_id", parseInt(driverId));
    if (from) query = query.gte("created_at", `${from}T00:00:00`);
    if (to) query = query.lte("created_at", `${to}T23:59:59`);

    const { data, count, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch deliveries: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summary
    const all = data || [];
    const pending = all.filter((d: any) => d.status === "pending").length;
    const inTransit = all.filter((d: any) => d.status === "in_transit" || d.status === "picked_up").length;
    const delivered = all.filter((d: any) => d.status === "delivered").length;

    return NextResponse.json({
      deliveries: all,
      total: count || 0,
      page,
      summary: { pending, in_transit: inTransit, delivered },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Deliveries list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/deliveries — create a new delivery */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      order_id, store_id, customer_id, customer_name, customer_phone,
      delivery_address, delivery_city, delivery_notes,
      driver_id, driver_name, estimated_time, delivery_fee,
    } = body;

    if (!delivery_address) {
      return NextResponse.json({ error: "delivery_address is required" }, { status: 400 });
    }

    const payload: any = {
      account_id: accountId,
      order_id: order_id || null,
      store_id: store_id || 0,
      customer_id: customer_id || null,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      delivery_address,
      delivery_city: delivery_city || null,
      delivery_notes: delivery_notes || null,
      estimated_time: estimated_time || null,
      delivery_fee: delivery_fee || 0,
      status: "pending",
    };

    // If driver assigned at creation
    if (driver_id) {
      payload.driver_id = driver_id;
      payload.driver_name = driver_name || null;
      payload.status = "assigned";
      payload.assigned_at = new Date().toISOString();
    }

    const { data, error } = await getDb()
      .from("delivery")
      .insert(payload)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to create delivery: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ delivery: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delivery create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
