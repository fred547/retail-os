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
    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const { data, error } = await getDb()
      .from("delivery")
      .select("*")
      .eq("id", deliveryId)
      .eq("account_id", accountId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    return NextResponse.json({ delivery: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delivery detail error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** PATCH /api/deliveries/[id] — update status, proof, COD, driver */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
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

    // Basic fields
    if (body.delivery_notes !== undefined) update.delivery_notes = body.delivery_notes;
    if (body.driver_notes !== undefined) update.driver_notes = body.driver_notes;
    if (body.estimated_time !== undefined) update.estimated_time = body.estimated_time;
    if (body.delivery_fee !== undefined) update.delivery_fee = body.delivery_fee;
    if (body.special_instructions !== undefined) update.special_instructions = body.special_instructions;
    if (body.vehicle_type !== undefined) update.vehicle_type = body.vehicle_type;
    if (body.vehicle_plate !== undefined) update.vehicle_plate = body.vehicle_plate;

    // Proof of delivery — photos (array of Cloudinary URLs)
    if (body.proof_photos !== undefined) {
      // Merge with existing photos or replace
      if (body.append_photos) {
        const { data: existing } = await getDb()
          .from("delivery")
          .select("proof_photos")
          .eq("id", deliveryId)
          .eq("account_id", accountId)
          .single();
        const current = (existing?.proof_photos as string[]) || [];
        update.proof_photos = [...current, ...(body.proof_photos || [])];
      } else {
        update.proof_photos = body.proof_photos;
      }
    }

    // Proof of delivery — signature (base64 data URL)
    if (body.proof_signature !== undefined) {
      update.proof_signature = body.proof_signature;
      update.proof_verified = true;
    }

    // Proof of delivery — PIN verification
    if (body.verify_pin !== undefined) {
      const { data: delivery } = await getDb()
        .from("delivery")
        .select("proof_pin")
        .eq("id", deliveryId)
        .eq("account_id", accountId)
        .single();
      if (delivery?.proof_pin && delivery.proof_pin === body.verify_pin) {
        update.proof_verified = true;
      } else {
        return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
      }
    }

    // COD collection
    if (body.cod_collected !== undefined) {
      update.cod_collected = body.cod_collected;
    }

    // Mark proof as verified
    if (body.proof_verified !== undefined) {
      update.proof_verified = body.proof_verified;
    }

    const { data, error } = await getDb()
      .from("delivery")
      .update(update)
      .eq("id", deliveryId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to update delivery ${id}: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }

    return NextResponse.json({ delivery: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Delivery update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
