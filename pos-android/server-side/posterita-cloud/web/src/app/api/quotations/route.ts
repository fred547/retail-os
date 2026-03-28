import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "QUOTATION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/quotations — list quotations with filters
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const customerId = url.searchParams.get("customer_id");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = getDb()
      .from("quotation")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (customerId) query = query.eq("customer_id", parseInt(customerId));
    if (search) {
      const safe = search.replace(/[,.()"'\\]/g, "");
      if (safe) query = query.or(`document_no.ilike.%${safe}%,customer_name.ilike.%${safe}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ quotations: data ?? [], total: count ?? 0 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/**
 * POST /api/quotations — create a quotation with lines
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { lines, ...quoteData } = body;

    if (!lines?.length) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // Calculate totals from lines
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

    subtotal = Math.round(subtotal * 100) / 100;
    taxTotal = Math.round(taxTotal * 100) / 100;
    const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

    // Insert quotation
    const { data: quotation, error: qError } = await getDb()
      .from("quotation")
      .insert({
        account_id: accountId,
        store_id: quoteData.store_id ?? 0,
        terminal_id: quoteData.terminal_id ?? 0,
        customer_id: quoteData.customer_id ?? null,
        customer_name: quoteData.customer_name ?? null,
        customer_email: quoteData.customer_email ?? null,
        customer_phone: quoteData.customer_phone ?? null,
        customer_address: quoteData.customer_address ?? null,
        status: "draft",
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        currency: quoteData.currency ?? null,
        notes: quoteData.notes ?? null,
        terms: quoteData.terms ?? null,
        valid_until: quoteData.valid_until ?? null,
        template_id: quoteData.template_id ?? "classic",
        created_by: quoteData.created_by ?? 0,
      })
      .select()
      .single();

    if (qError) throw qError;

    // Insert lines
    const lineInserts = processedLines.map((line: any) => ({
      ...line,
      quotation_id: quotation.quotation_id,
    }));

    const { error: lError } = await getDb()
      .from("quotation_line")
      .insert(lineInserts);

    if (lError) throw lError;

    // Return with lines
    const { data: finalLines } = await getDb()
      .from("quotation_line")
      .select("*")
      .eq("quotation_id", quotation.quotation_id)
      .order("position");

    return NextResponse.json({
      quotation: { ...quotation, lines: finalLines ?? [] },
    }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Quotation create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
