import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import crypto from "crypto";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "DELIVERY",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

// Delivery type templates — pre-fill defaults when creating
const DELIVERY_TEMPLATES: Record<string, {
  direction: string; vehicle_type: string; proof_type: string; payment_method: string;
}> = {
  food:             { direction: "outbound", vehicle_type: "scooter", proof_type: "photo", payment_method: "cod_cash" },
  package:          { direction: "outbound", vehicle_type: "car", proof_type: "signature", payment_method: "prepaid" },
  heavy:            { direction: "outbound", vehicle_type: "truck", proof_type: "signature", payment_method: "prepaid" },
  transfer:         { direction: "transfer", vehicle_type: "van", proof_type: "barcode_scan", payment_method: "none" },
  supplier_pickup:  { direction: "inbound", vehicle_type: "van", proof_type: "photo", payment_method: "none" },
  return_pickup:    { direction: "inbound", vehicle_type: "car", proof_type: "signature", payment_method: "none" },
  document:         { direction: "outbound", vehicle_type: "scooter", proof_type: "signature", payment_method: "none" },
  cash_collection:  { direction: "inbound", vehicle_type: "car", proof_type: "photo", payment_method: "cod_cash" },
};

/** GET /api/deliveries — list deliveries with filters */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const direction = url.searchParams.get("direction");
    const deliveryType = url.searchParams.get("delivery_type");
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
    if (direction) query = query.eq("direction", direction);
    if (deliveryType) query = query.eq("delivery_type", deliveryType);
    if (driverId) query = query.eq("driver_id", parseInt(driverId));
    if (from) query = query.gte("created_at", `${from}T00:00:00`);
    if (to) query = query.lte("created_at", `${to}T23:59:59`);

    const { data, count, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch deliveries: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = data || [];
    const pending = all.filter((d: any) => d.status === "pending").length;
    const inTransit = all.filter((d: any) => ["in_transit", "picked_up", "assigned"].includes(d.status)).length;
    const delivered = all.filter((d: any) => d.status === "delivered").length;
    const outbound = all.filter((d: any) => d.direction === "outbound").length;
    const inbound = all.filter((d: any) => d.direction === "inbound").length;
    const transfers = all.filter((d: any) => d.direction === "transfer").length;

    return NextResponse.json({
      deliveries: all,
      total: count || 0,
      page,
      summary: { pending, in_transit: inTransit, delivered, outbound, inbound, transfers },
      templates: DELIVERY_TEMPLATES,
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
    const deliveryType = body.delivery_type || "package";
    const template = DELIVERY_TEMPLATES[deliveryType] ?? DELIVERY_TEMPLATES.package;

    // For store transfers and pickups, destination_address can be derived from store
    const needsAddress = body.destination_type !== "store";
    if (needsAddress && !body.delivery_address && !body.destination_address) {
      return NextResponse.json({ error: "delivery_address is required for non-store destinations" }, { status: 400 });
    }

    // If destination is a store, load store address
    let destAddress = body.delivery_address || body.destination_address || "";
    let destCity = body.delivery_city || "";
    let destContact = body.customer_name || "";
    let destPhone = body.customer_phone || "";

    if (body.destination_type === "store" && body.destination_store_id) {
      const { data: store } = await getDb()
        .from("store")
        .select("name, address, city")
        .eq("store_id", body.destination_store_id)
        .eq("account_id", accountId)
        .single();
      if (store) {
        destAddress = store.address || `Store: ${store.name}`;
        destCity = store.city || "";
        destContact = store.name;
      }
    }

    // If origin is a store (for pickups), load origin info
    let originAddress = body.origin_address || "";
    if (body.origin_type === "store" && body.origin_store_id) {
      const { data: store } = await getDb()
        .from("store")
        .select("name, address, city")
        .eq("store_id", body.origin_store_id)
        .eq("account_id", accountId)
        .single();
      if (store) {
        originAddress = store.address || `Store: ${store.name}`;
      }
    }

    const payload: any = {
      account_id: accountId,
      delivery_type: deliveryType,
      direction: body.direction || template.direction,
      origin_type: body.origin_type || "store",
      origin_store_id: body.origin_store_id || body.store_id || null,
      origin_address: originAddress || null,
      origin_contact: body.origin_contact || null,
      destination_type: body.destination_type || "customer",
      destination_store_id: body.destination_store_id || null,
      delivery_address: destAddress,
      delivery_city: destCity || null,
      customer_name: destContact || null,
      customer_phone: destPhone || null,
      delivery_notes: body.delivery_notes || null,
      special_instructions: body.special_instructions || null,
      vehicle_type: body.vehicle_type || template.vehicle_type,
      vehicle_plate: body.vehicle_plate || null,
      proof_type: body.proof_type || template.proof_type,
      payment_method: body.payment_method || template.payment_method,
      cod_amount: body.cod_amount || 0,
      delivery_fee: body.delivery_fee || 0,
      estimated_time: body.estimated_time || null,
      scheduled_at: body.scheduled_at || null,
      items: body.items || null,
      order_id: body.order_id || null,
      po_id: body.po_id || null,
      store_id: body.store_id || 0,
      customer_id: body.customer_id || null,
      status: "pending",
      tracking_token: crypto.randomBytes(16).toString("hex"),
      driver_shift_id: body.driver_shift_id || null,
    };

    // If driver assigned at creation
    if (body.driver_id) {
      payload.driver_id = body.driver_id;
      payload.driver_name = body.driver_name || null;
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
