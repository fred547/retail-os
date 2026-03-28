import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "QUOTATION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/quotations/[id]/send — mark quotation as sent
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const quotationId = parseInt(id);
    if (isNaN(quotationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { data: quotation } = await getDb().from("quotation").select("quotation_id, status")
      .eq("quotation_id", quotationId).eq("account_id", accountId).eq("is_deleted", false).single();

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    if (quotation.status === "converted" || quotation.status === "cancelled") {
      return NextResponse.json({ error: `Cannot send a ${quotation.status} quotation` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await getDb().from("quotation").update({
      status: "sent",
      sent_at: now,
      updated_at: now,
    }).eq("quotation_id", quotationId).eq("account_id", accountId);

    if (error) throw error;

    return NextResponse.json({ success: true, sent_at: now });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation send error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
