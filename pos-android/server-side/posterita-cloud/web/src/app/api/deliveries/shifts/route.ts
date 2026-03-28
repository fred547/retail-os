import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import crypto from "crypto";

/** GET /api/deliveries/shifts — list driver shifts */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const driverId = url.searchParams.get("driver_id");

  let query = getDb()
    .from("driver_shift")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);
  if (driverId) query = query.eq("driver_id", parseInt(driverId));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  return NextResponse.json({ shifts: data || [] });
}

/** POST /api/deliveries/shifts — start a driver shift */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { driver_id, driver_name, opening_float = 0 } = body;

  if (!driver_id) return NextResponse.json({ error: "driver_id required" }, { status: 400 });

  // Check for existing active shift
  const { data: existing } = await getDb()
    .from("driver_shift")
    .select("id")
    .eq("account_id", accountId)
    .eq("driver_id", driver_id)
    .eq("status", "active")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Driver already has an active shift", shift_id: existing[0].id }, { status: 409 });
  }

  const { data, error } = await getDb()
    .from("driver_shift")
    .insert({
      account_id: accountId,
      driver_id,
      driver_name: driver_name || null,
      opening_float,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  return NextResponse.json({ shift: data }, { status: 201 });
}

/** PATCH /api/deliveries/shifts — end or reconcile a shift */
export async function PATCH(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { shift_id, action } = body;

  if (!shift_id) return NextResponse.json({ error: "shift_id required" }, { status: 400 });

  // Load shift
  const { data: shift } = await getDb()
    .from("driver_shift")
    .select("*")
    .eq("id", shift_id)
    .eq("account_id", accountId)
    .single();

  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  if (action === "end") {
    // Compute totals from deliveries linked to this shift (or all driver deliveries during shift period)
    const { data: deliveries } = await getDb()
      .from("delivery")
      .select("status, cod_amount, cod_collected, payment_method")
      .eq("account_id", accountId)
      .eq("driver_id", shift.driver_id)
      .gte("created_at", shift.started_at)
      .eq("is_deleted", false);

    const all = deliveries || [];
    const totalDeliveries = all.length;
    const totalDelivered = all.filter((d: any) => d.status === "delivered").length;
    const totalFailed = all.filter((d: any) => d.status === "failed").length;
    const totalCodExpected = all
      .filter((d: any) => d.payment_method?.startsWith("cod"))
      .reduce((sum: number, d: any) => sum + (d.cod_amount || 0), 0);
    const totalCodCollected = all
      .filter((d: any) => d.payment_method?.startsWith("cod"))
      .reduce((sum: number, d: any) => sum + (d.cod_collected || 0), 0);

    const { data, error } = await getDb()
      .from("driver_shift")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        total_deliveries: totalDeliveries,
        total_delivered: totalDelivered,
        total_failed: totalFailed,
        total_cod_expected: totalCodExpected,
        total_cod_collected: totalCodCollected,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shift_id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    return NextResponse.json({ shift: data });
  }

  if (action === "reconcile") {
    const { cash_returned, reconciled_by, reconciliation_notes } = body;
    const expectedCash = (shift.opening_float || 0) + (shift.total_cod_collected || 0);
    const variance = (cash_returned || 0) - expectedCash;

    const { data, error } = await getDb()
      .from("driver_shift")
      .update({
        status: "reconciled",
        cash_returned: cash_returned || 0,
        variance,
        reconciled_by: reconciled_by || null,
        reconciliation_notes: reconciliation_notes || null,
        closing_float: cash_returned || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shift_id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    return NextResponse.json({ shift: data });
  }

  return NextResponse.json({ error: "Invalid action. Use 'end' or 'reconcile'" }, { status: 400 });
}
