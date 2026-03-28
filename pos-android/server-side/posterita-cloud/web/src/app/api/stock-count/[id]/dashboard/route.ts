import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STOCK_COUNT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/stock-count/[id]/dashboard — aggregated view for supervisor.
 *
 * Returns:
 * - shelf_map: per-location status (counted/not/conflict/unknown)
 * - conflicts: locations where staff disagree on quantity
 * - unknowns: items without barcode that need identification
 * - progress: overall % complete, per-staff stats
 * - summary: total scanned, total locations, variance vs system
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const planId = parseInt(id);

    // Load plan + assignments + all scans in parallel
    const [{ data: plan }, { data: assignments }, { data: scans }] = await Promise.all([
      getDb().from("count_plan").select("*")
        .eq("id", planId).eq("account_id", accountId).single(),
      getDb().from("count_zone_assignment").select("*").eq("plan_id", planId),
      getDb().from("count_scan").select("*")
        .eq("plan_id", planId).eq("account_id", accountId)
        .order("scanned_at", { ascending: false }),
    ]);

    if (!plan) return NextResponse.json({ error: "Count plan not found" }, { status: 404 });

    // Compute latest scan per user per location
    // Key: "shelf-height-userId" → most recent scan
    const latestByUserLocation: Record<string, any> = {};
    for (const scan of scans ?? []) {
      const key = `${scan.shelf}-${scan.height}-${scan.user_id}`;
      if (!latestByUserLocation[key]) {
        latestByUserLocation[key] = scan; // already sorted DESC, first is latest
      }
    }
    const latestScans = Object.values(latestByUserLocation);

    // Group by location: "shelf-height" → [{ user, qty, scanned_at }]
    const locationMap: Record<string, any[]> = {};
    for (const scan of latestScans) {
      const locKey = `${scan.shelf}-${scan.height}`;
      if (!locationMap[locKey]) locationMap[locKey] = [];
      locationMap[locKey].push(scan);
    }

    // Build shelf map + detect conflicts
    const shelfMap: any[] = [];
    const conflicts: any[] = [];
    const unknowns: any[] = [];
    let totalItems = 0;
    let totalLocations = 0;
    let conflictCount = 0;
    let unknownCount = 0;

    for (const [locKey, staffScans] of Object.entries(locationMap)) {
      const [shelf, height] = locKey.split("-");
      totalLocations++;

      // Sum quantities per location (latest per staff)
      const quantities = staffScans.map((s: any) => s.quantity);
      const totalQty = staffScans.reduce((sum: number, s: any) => sum + s.quantity, 0);
      totalItems += totalQty;

      // Check for unknowns
      const unknownScans = staffScans.filter((s: any) => s.is_unknown);
      if (unknownScans.length > 0) {
        unknownCount += unknownScans.reduce((s: number, u: any) => s + u.quantity, 0);
        unknowns.push({
          shelf: parseInt(shelf), height,
          count: unknownScans.reduce((s: number, u: any) => s + u.quantity, 0),
          scanned_by: unknownScans.map((s: any) => s.user_name || `User ${s.user_id}`),
        });
      }

      // Check for conflicts (different staff, different quantities for same product at same location)
      // Group scans at this location by product_id
      const byProduct: Record<string, any[]> = {};
      for (const s of staffScans) {
        const pKey = s.product_id?.toString() || "unknown";
        if (!byProduct[pKey]) byProduct[pKey] = [];
        byProduct[pKey].push(s);
      }

      let locationConflict = false;
      for (const [, productScans] of Object.entries(byProduct)) {
        if (productScans.length > 1) {
          const qtys = productScans.map((s: any) => s.quantity);
          const allSame = qtys.every((q: number) => q === qtys[0]);
          if (!allSame) {
            locationConflict = true;
            conflicts.push({
              shelf: parseInt(shelf), height,
              product_name: productScans[0].product_name || "Unknown",
              product_id: productScans[0].product_id,
              counts: productScans.map((s: any) => ({
                user_name: s.user_name || `User ${s.user_id}`,
                user_id: s.user_id,
                quantity: s.quantity,
                scanned_at: s.scanned_at,
              })),
            });
          }
        }
      }
      if (locationConflict) conflictCount++;

      shelfMap.push({
        shelf: parseInt(shelf), height,
        status: locationConflict ? "conflict" : unknownScans.length > 0 ? "unknown" : "counted",
        staff_count: staffScans.length,
        total_qty: totalQty,
        staff: staffScans.map((s: any) => ({
          user_name: s.user_name, user_id: s.user_id, quantity: s.quantity, scanned_at: s.scanned_at,
        })),
      });
    }

    // Per-staff progress
    const staffProgress: Record<number, { user_name: string; locations: number; items: number }> = {};
    for (const scan of latestScans) {
      if (!staffProgress[scan.user_id]) {
        staffProgress[scan.user_id] = { user_name: scan.user_name || `User ${scan.user_id}`, locations: 0, items: 0 };
      }
      staffProgress[scan.user_id].locations++;
      staffProgress[scan.user_id].items += scan.quantity;
    }

    // Calculate total expected locations from assignments
    let totalExpectedLocations = 0;
    for (const a of assignments ?? []) {
      const shelves = (a.shelf_end - a.shelf_start + 1);
      const heights = (a.height_labels?.length || 1);
      totalExpectedLocations += shelves * heights;
    }

    const progressPercent = totalExpectedLocations > 0
      ? Math.round((totalLocations / totalExpectedLocations) * 100)
      : 0;

    return NextResponse.json({
      plan,
      assignments: assignments ?? [],
      shelf_map: shelfMap.sort((a, b) => a.shelf - b.shelf || a.height.localeCompare(b.height)),
      conflicts,
      unknowns,
      staff_progress: Object.values(staffProgress),
      summary: {
        total_locations_counted: totalLocations,
        total_expected_locations: totalExpectedLocations,
        progress_percent: progressPercent,
        total_items: totalItems,
        conflict_count: conflictCount,
        unknown_count: unknownCount,
        staff_count: Object.keys(staffProgress).length,
      },
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Count dashboard: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
