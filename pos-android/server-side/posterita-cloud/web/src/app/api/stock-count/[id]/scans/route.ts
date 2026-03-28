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

/** GET /api/stock-count/[id]/scans — all scans for this plan */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const planId = parseInt(id);

    const { data, error } = await getDb()
      .from("count_scan")
      .select("*")
      .eq("plan_id", planId)
      .eq("account_id", accountId)
      .order("scanned_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ scans: data ?? [] });
  } catch (e: any) {
    await logToErrorDb(accountId, `Count scans list: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/stock-count/[id]/scans — bulk push scans from device.
 * Body: { scans: [{ shelf, height, product_id, barcode, product_name, quantity, is_unknown, user_id, user_name, scanned_at }] }
 *
 * Each scan is inserted as-is. Dashboard computes "latest per staff per location".
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const planId = parseInt(id);
    const body = await req.json();
    const { scans } = body;

    if (!scans?.length) return NextResponse.json({ error: "scans array is required" }, { status: 400 });

    const rows = scans.map((s: any) => ({
      plan_id: planId,
      account_id: accountId,
      user_id: s.user_id ?? 0,
      user_name: s.user_name ?? null,
      shelf: s.shelf,
      height: s.height ?? "A",
      product_id: s.product_id ?? null,
      barcode: s.barcode ?? null,
      product_name: s.product_name ?? null,
      quantity: s.quantity ?? 1,
      is_unknown: s.is_unknown ?? (!s.barcode && !s.product_id),
      notes: s.notes ?? null,
      scanned_at: s.scanned_at ?? new Date().toISOString(),
    }));

    const { error } = await getDb().from("count_scan").insert(rows);
    if (error) throw error;

    return NextResponse.json({ inserted: rows.length });
  } catch (e: any) {
    await logToErrorDb(accountId, `Count scans push: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
