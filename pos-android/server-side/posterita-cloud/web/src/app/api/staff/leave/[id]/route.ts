import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "STAFF",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** PATCH /api/staff/leave/[id] — approve, reject, or cancel a leave request */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status, rejection_reason } = body;

    if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "status must be approved, rejected, or cancelled" }, { status: 400 });
    }

    // Fetch the leave request to get details
    const { data: request, error: fetchErr } = await getDb()
      .from("leave_request")
      .select("*")
      .eq("id", requestId)
      .eq("account_id", accountId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!request) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    const update: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Look up the approver's pos_user
    if (status === "approved" || status === "rejected") {
      const { data: approver } = await getDb()
        .from("pos_user")
        .select("user_id")
        .eq("account_id", accountId)
        .limit(1)
        .single();

      if (approver) {
        update.approved_by = approver.user_id;
      }
    }

    if (status === "rejected" && rejection_reason) {
      update.rejection_reason = rejection_reason;
    }

    // Update the leave request
    const { data, error } = await getDb()
      .from("leave_request")
      .update(update)
      .eq("id", requestId)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) throw error;

    // If approving, deduct from leave balance
    if (status === "approved") {
      const year = new Date(request.start_date).getFullYear();

      // Check existing balance
      const { data: existing } = await getDb()
        .from("leave_balance")
        .select("*")
        .eq("account_id", accountId)
        .eq("user_id", request.user_id)
        .eq("leave_type_id", request.leave_type_id)
        .eq("year", year)
        .single();

      if (existing) {
        await getDb()
          .from("leave_balance")
          .update({
            used_days: (existing.used_days ?? 0) + request.days,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("account_id", accountId);
      } else {
        // Get default_days from leave_type
        const { data: leaveType } = await getDb()
          .from("leave_type")
          .select("default_days")
          .eq("id", request.leave_type_id)
          .eq("account_id", accountId)
          .single();

        await getDb()
          .from("leave_balance")
          .insert({
            account_id: accountId,
            user_id: request.user_id,
            leave_type_id: request.leave_type_id,
            year,
            total_days: leaveType?.default_days ?? 0,
            used_days: request.days,
          });
      }
    }

    return NextResponse.json({ request: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Leave approve/reject error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
