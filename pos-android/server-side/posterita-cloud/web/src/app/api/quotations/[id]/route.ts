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
 * GET /api/quotations/[id] — get quotation with lines
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const quotationId = parseInt(id);

    const [{ data: quotation, error: qErr }, { data: lines, error: lErr }] = await Promise.all([
      getDb().from("quotation").select("*")
        .eq("quotation_id", quotationId).eq("account_id", accountId).eq("is_deleted", false).single(),
      getDb().from("quotation_line").select("*")
        .eq("quotation_id", quotationId).order("position"),
    ]);

    if (qErr || !quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({ quotation: { ...quotation, lines: lines ?? [] } });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation get error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * PATCH /api/quotations/[id] — update quotation fields and/or lines
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const quotationId = parseInt(id);
    const body = await req.json();

    // Verify ownership
    const { data: existing } = await getDb().from("quotation").select("quotation_id, status")
      .eq("quotation_id", quotationId).eq("account_id", accountId).eq("is_deleted", false).single();
    if (!existing) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

    // Only draft/sent can be edited (not converted/cancelled)
    if (existing.status === "converted" || existing.status === "cancelled") {
      return NextResponse.json({ error: `Cannot edit a ${existing.status} quotation` }, { status: 400 });
    }

    const { lines, ...updates } = body;

    // Update quotation fields
    const allowedFields = [
      "customer_id", "customer_name", "customer_email", "customer_phone", "customer_address",
      "status", "notes", "terms", "valid_until", "template_id", "currency",
    ];
    const safeUpdates: any = { updated_at: new Date().toISOString() };
    for (const f of allowedFields) {
      if (f in updates) safeUpdates[f] = updates[f];
    }

    // If lines are provided, recalculate totals
    if (lines?.length) {
      let subtotal = 0;
      let taxTotal = 0;
      const processedLines = lines.map((line: any, i: number) => {
        const qty = line.quantity ?? 1;
        const price = line.unit_price ?? 0;
        const discount = line.discount_percent ?? 0;
        const lineTotal = Math.round(qty * price * (1 - discount / 100) * 100) / 100;
        const taxAmt = Math.round(lineTotal * (line.tax_rate ?? 0) / 100 * 100) / 100;
        subtotal += lineTotal;
        taxTotal += taxAmt;
        return {
          quotation_id: quotationId,
          product_id: line.product_id ?? null,
          product_name: line.product_name || "Item",
          description: line.description ?? null,
          quantity: qty,
          unit_price: price,
          discount_percent: discount,
          tax_id: line.tax_id ?? 0,
          tax_rate: line.tax_rate ?? 0,
          line_total: lineTotal,
          position: i,
        };
      });

      safeUpdates.subtotal = Math.round(subtotal * 100) / 100;
      safeUpdates.tax_total = Math.round(taxTotal * 100) / 100;
      safeUpdates.grand_total = Math.round((subtotal + taxTotal) * 100) / 100;

      // Replace lines: delete old, insert new
      await getDb().from("quotation_line").delete().eq("quotation_id", quotationId);
      await getDb().from("quotation_line").insert(processedLines);
    }

    const { error } = await getDb().from("quotation").update(safeUpdates)
      .eq("quotation_id", quotationId).eq("account_id", accountId);
    if (error) throw error;

    // Return updated quotation
    const { data: updated } = await getDb().from("quotation").select("*")
      .eq("quotation_id", quotationId).single();
    const { data: updatedLines } = await getDb().from("quotation_line").select("*")
      .eq("quotation_id", quotationId).order("position");

    return NextResponse.json({ quotation: { ...updated, lines: updatedLines ?? [] } });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation update error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/quotations/[id] — soft delete
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const { error } = await getDb().from("quotation").update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("quotation_id", parseInt(id)).eq("account_id", accountId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation delete error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
