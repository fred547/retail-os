import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/** GET /api/deliveries/analytics — delivery performance metrics */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();

  // All deliveries in period
  const { data: deliveries } = await db
    .from("delivery")
    .select("id, status, delivery_type, direction, payment_method, cod_amount, cod_collected, delivery_fee, estimated_time, created_at, actual_delivery_at, assigned_at, picked_up_at, driver_id, driver_name, proof_verified")
    .eq("account_id", accountId)
    .eq("is_deleted", false)
    .gte("created_at", since);

  const all: any[] = deliveries || [];
  const delivered = all.filter((d: any) => d.status === "delivered");
  const failed = all.filter((d: any) => d.status === "failed");
  const cancelled = all.filter((d: any) => d.status === "cancelled");

  // Delivery time (created → delivered)
  const deliveryTimes = delivered
    .filter(d => d.actual_delivery_at && d.created_at)
    .map(d => (new Date(d.actual_delivery_at!).getTime() - new Date(d.created_at).getTime()) / 60000);
  const avgDeliveryTime = deliveryTimes.length > 0 ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length) : 0;

  // COD
  const codDeliveries = all.filter(d => d.payment_method?.startsWith("cod"));
  const totalCodExpected = codDeliveries.reduce((s, d) => s + (d.cod_amount || 0), 0);
  const totalCodCollected = codDeliveries.reduce((s, d) => s + (d.cod_collected || 0), 0);
  const totalFees = all.reduce((s, d) => s + (d.delivery_fee || 0), 0);

  // By type
  const byType: Record<string, number> = {};
  all.forEach(d => { byType[d.delivery_type] = (byType[d.delivery_type] || 0) + 1; });

  // By direction
  const byDirection: Record<string, number> = {};
  all.forEach(d => { byDirection[d.direction] = (byDirection[d.direction] || 0) + 1; });

  // By driver
  const byDriver: Record<string, { name: string; total: number; delivered: number; failed: number; avgTime: number }> = {};
  all.forEach(d => {
    const key = String(d.driver_id || "unassigned");
    if (!byDriver[key]) byDriver[key] = { name: d.driver_name || "Unassigned", total: 0, delivered: 0, failed: 0, avgTime: 0 };
    byDriver[key].total++;
    if (d.status === "delivered") byDriver[key].delivered++;
    if (d.status === "failed") byDriver[key].failed++;
  });
  // Compute avg time per driver
  for (const key of Object.keys(byDriver)) {
    const driverDeliveries = delivered.filter(d => String(d.driver_id || "unassigned") === key);
    const times = driverDeliveries
      .filter(d => d.actual_delivery_at && d.created_at)
      .map(d => (new Date(d.actual_delivery_at!).getTime() - new Date(d.created_at).getTime()) / 60000);
    byDriver[key].avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }

  // Daily trend (last N days)
  const dailyTrend: { date: string; total: number; delivered: number; failed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dayDeliveries = all.filter((d: any) => d.created_at.startsWith(date));
    dailyTrend.push({
      date,
      total: dayDeliveries.length,
      delivered: dayDeliveries.filter((d: any) => d.status === "delivered").length,
      failed: dayDeliveries.filter((d: any) => d.status === "failed").length,
    });
  }

  // Proof compliance
  const proofRequired = delivered.filter((d: any) => d.proof_verified !== undefined);
  const proofVerified = proofRequired.filter((d: any) => d.proof_verified);

  // Driver shifts summary
  const { data: shifts } = await db
    .from("driver_shift")
    .select("*")
    .eq("account_id", accountId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const totalShifts = (shifts || []).length;
  const reconciledShifts = (shifts || []).filter((s: any) => s.status === "reconciled").length;
  const totalVariance = (shifts || [])
    .filter((s: any) => s.variance != null)
    .reduce((sum: number, s: any) => sum + Math.abs(s.variance || 0), 0);

  return NextResponse.json({
    period_days: days,
    overview: {
      total: all.length,
      delivered: delivered.length,
      failed: failed.length,
      cancelled: cancelled.length,
      active: all.length - delivered.length - failed.length - cancelled.length,
      success_rate: all.length > 0 ? Math.round((delivered.length / all.length) * 100) : 0,
      avg_delivery_time_min: avgDeliveryTime,
    },
    financials: {
      total_fees: Math.round(totalFees * 100) / 100,
      total_cod_expected: Math.round(totalCodExpected * 100) / 100,
      total_cod_collected: Math.round(totalCodCollected * 100) / 100,
      cod_variance: Math.round((totalCodCollected - totalCodExpected) * 100) / 100,
    },
    proof_compliance: {
      total: proofRequired.length,
      verified: proofVerified.length,
      rate: proofRequired.length > 0 ? Math.round((proofVerified.length / proofRequired.length) * 100) : 100,
    },
    shifts: {
      total: totalShifts,
      reconciled: reconciledShifts,
      total_variance: Math.round(totalVariance * 100) / 100,
    },
    by_type: byType,
    by_direction: byDirection,
    by_driver: Object.values(byDriver).sort((a, b) => b.total - a.total),
    daily_trend: dailyTrend.filter(d => d.total > 0), // Only non-empty days
  });
}
