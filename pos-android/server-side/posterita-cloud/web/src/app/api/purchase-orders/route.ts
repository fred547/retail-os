import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PURCHASE_ORDER",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/purchase-orders — list purchase orders */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const supplierId = url.searchParams.get("supplier_id");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = getDb()
      .from("purchase_order")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (supplierId) query = query.eq("supplier_id", parseInt(supplierId));

    const { data, count, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch POs: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve supplier names
    const supplierIds = [...new Set((data || []).map((po: any) => po.supplier_id))];
    let supplierMap: Record<number, string> = {};
    if (supplierIds.length > 0) {
      const { data: suppliers } = await getDb()
        .from("supplier")
        .select("supplier_id, name")
        .eq("account_id", accountId)
        .in("supplier_id", supplierIds);
      if (suppliers) {
        for (const s of suppliers) supplierMap[s.supplier_id] = s.name;
      }
    }

    const enriched = (data || []).map((po: any) => ({
      ...po,
      supplier_name: supplierMap[po.supplier_id] || "Unknown",
    }));

    return NextResponse.json({ orders: enriched, total: count || 0, page });
  } catch (e: any) {
    await logToErrorDb(accountId, `PO list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/purchase-orders — create a purchase order with lines */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { supplier_id, store_id, lines, notes, expected_date, created_by } = body;

    if (!supplier_id || !lines?.length) {
      return NextResponse.json({ error: "supplier_id and at least one line are required" }, { status: 400 });
    }

    // Calculate totals
    const subtotal = lines.reduce((sum: number, l: any) => sum + (l.quantity_ordered || 0) * (l.unit_cost || 0), 0);

    // Generate PO number
    const { count } = await getDb()
      .from("purchase_order")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId);

    const poNumber = `PO-${String((count || 0) + 1).padStart(5, "0")}`;

    // Insert PO header
    const { data: po, error: poErr } = await getDb()
      .from("purchase_order")
      .insert({
        account_id: accountId,
        supplier_id,
        store_id: store_id || 0,
        po_number: poNumber,
        status: "draft",
        subtotal,
        grand_total: subtotal,
        notes,
        expected_date: expected_date || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (poErr || !po) {
      await logToErrorDb(accountId, `Failed to create PO: ${poErr?.message}`);
      return NextResponse.json({ error: poErr?.message || "Failed to create PO" }, { status: 500 });
    }

    // Insert lines
    const lineInserts = lines.map((l: any) => ({
      po_id: po.po_id,
      account_id: accountId,
      product_id: l.product_id,
      product_name: l.product_name || null,
      quantity_ordered: l.quantity_ordered || 0,
      unit_cost: l.unit_cost || 0,
      line_total: (l.quantity_ordered || 0) * (l.unit_cost || 0),
    }));

    const { error: lineErr } = await getDb()
      .from("purchase_order_line")
      .insert(lineInserts);

    if (lineErr) {
      await logToErrorDb(accountId, `Failed to insert PO lines for ${poNumber}: ${lineErr.message}`);
    }

    return NextResponse.json({ order: po, po_number: poNumber }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `PO create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
