import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/deliveries/track?token=xxx — public tracking (no auth)
 * Returns delivery status for customers to track their order.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Tracking token required" }, { status: 400 });

  const { data, error } = await getDb()
    .from("delivery")
    .select("id, status, delivery_address, delivery_city, customer_name, estimated_time, delivery_type, direction, vehicle_type, driver_name, actual_delivery_at, picked_up_at, assigned_at, created_at, proof_verified")
    .eq("tracking_token", token)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  // Don't expose sensitive data — only status, timing, and proof confirmation
  return NextResponse.json({
    delivery: {
      id: data.id,
      status: data.status,
      delivery_type: data.delivery_type,
      vehicle_type: data.vehicle_type,
      driver_name: data.driver_name,
      estimated_time: data.estimated_time,
      created_at: data.created_at,
      assigned_at: data.assigned_at,
      picked_up_at: data.picked_up_at,
      actual_delivery_at: data.actual_delivery_at,
      proof_verified: data.proof_verified,
    },
  });
}
