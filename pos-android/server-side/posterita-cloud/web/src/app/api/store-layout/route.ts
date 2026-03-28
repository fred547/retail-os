import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STORE_LAYOUT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/store-layout?store_id=X — get layout zones + product counts per location */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const storeId = new URL(req.url).searchParams.get("store_id");

    // Get zones
    let zoneQuery = getDb()
      .from("store_layout_zone")
      .select("*")
      .eq("account_id", accountId)
      .order("position");

    if (storeId) zoneQuery = zoneQuery.eq("store_id", parseInt(storeId));

    const { data: zones, error: zErr } = await zoneQuery;
    if (zErr) throw zErr;

    // Get products with locations for this account (for grid counts)
    let productQuery = getDb()
      .from("product")
      .select("product_id, name, upc, sellingprice, shelf_location, image, quantity_on_hand")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .eq("product_status", "live")
      .not("shelf_location", "is", null)
      .order("shelf_location");

    const { data: products } = await productQuery;

    // Count unassigned
    const { count: unassignedCount } = await getDb()
      .from("product")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .eq("product_status", "live")
      .is("shelf_location", null);

    // Group products by location for grid
    const locationMap: Record<string, number> = {};
    for (const p of products ?? []) {
      const loc = p.shelf_location;
      if (loc) locationMap[loc] = (locationMap[loc] || 0) + 1;
    }

    return NextResponse.json({
      zones: zones ?? [],
      products: products ?? [],
      location_counts: locationMap,
      unassigned_count: unassignedCount ?? 0,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Store layout GET error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/store-layout — create or update a zone */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { zone_id, store_id, name, shelf_start, shelf_end, height_labels, position } = body;

    if (shelf_start == null || shelf_end == null || !height_labels?.length) {
      return NextResponse.json({ error: "shelf_start, shelf_end, and height_labels are required" }, { status: 400 });
    }

    if (shelf_start > shelf_end) {
      return NextResponse.json({ error: "shelf_start must be <= shelf_end" }, { status: 400 });
    }

    const payload: any = {
      account_id: accountId,
      store_id: store_id || 0,
      name: name || null,
      shelf_start,
      shelf_end,
      height_labels,
      position: position ?? 0,
      updated_at: new Date().toISOString(),
    };

    let data, error;
    if (zone_id) {
      // Update existing
      ({ data, error } = await getDb()
        .from("store_layout_zone")
        .update(payload)
        .eq("zone_id", zone_id)
        .eq("account_id", accountId)
        .select()
        .single());
    } else {
      // Create new
      ({ data, error } = await getDb()
        .from("store_layout_zone")
        .insert(payload)
        .select()
        .single());
    }

    if (error) throw error;
    return NextResponse.json({ zone: data }, { status: zone_id ? 200 : 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Store layout POST error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** DELETE /api/store-layout?zone_id=X — delete a zone */
export async function DELETE(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const zoneId = new URL(req.url).searchParams.get("zone_id");
    if (!zoneId) return NextResponse.json({ error: "zone_id required" }, { status: 400 });
    const zoneIdNum = parseInt(zoneId);
    if (isNaN(zoneIdNum)) {
      return NextResponse.json({ error: "Invalid zone_id" }, { status: 400 });
    }

    const { error } = await getDb()
      .from("store_layout_zone")
      .delete()
      .eq("zone_id", zoneIdNum)
      .eq("account_id", accountId);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Store layout DELETE error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
