import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logError(accountId: string, message: string, stack?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId,
      severity: "ERROR",
      tag: "Z_REPORT",
      message,
      stack_trace: stack ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {}
}

/**
 * GET /api/reports/z-report — End-of-day Z-report
 * Query params: date (YYYY-MM-DD, default today), store_id, terminal_id, format (json|csv)
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
    const storeId = searchParams.get("store_id");
    const terminalId = searchParams.get("terminal_id");
    const format = searchParams.get("format") ?? "json";

    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59Z`;

    const db = getDb();

    // 1. Orders for the day
    let ordersQuery = db
      .from("orders")
      .select("order_id, grand_total, subtotal, tax_total, discount_total, date_ordered, terminal_id, store_id, is_void, document_no")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .gte("date_ordered", dayStart)
      .lte("date_ordered", dayEnd);

    if (storeId) ordersQuery = ordersQuery.eq("store_id", parseInt(storeId));
    if (terminalId) ordersQuery = ordersQuery.eq("terminal_id", parseInt(terminalId));

    // 2. Payments for the day (via order date range)
    let paymentsQuery = db
      .from("payment")
      .select("payment_id, order_id, payment_type, amount, pay_amt, date_paid")
      .gte("date_paid", dayStart)
      .lte("date_paid", dayEnd);

    // 3. Tills for the day
    let tillsQuery = db
      .from("till")
      .select("till_id, documentno, opening_amt, closing_amt, cash_amt, card_amt, grand_total, tax_total, subtotal, date_opened, date_closed, status, terminal_id, store_id")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .gte("date_opened", dayStart)
      .lte("date_opened", dayEnd);

    if (storeId) tillsQuery = tillsQuery.eq("store_id", parseInt(storeId));
    if (terminalId) tillsQuery = tillsQuery.eq("terminal_id", parseInt(terminalId));

    const [ordersResult, paymentsResult, tillsResult] = await Promise.all([
      ordersQuery,
      paymentsQuery,
      tillsQuery,
    ]);

    const orders = ordersResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const tills = tillsResult.data ?? [];

    // Filter payments to only those matching our orders
    const orderIds = new Set(orders.map((o: any) => o.order_id));
    const filteredPayments = payments.filter((p: any) => orderIds.has(p.order_id));

    // ── Aggregate ──

    // Payment breakdown by type
    const paymentByType: Record<string, { count: number; total: number }> = {};
    for (const p of filteredPayments) {
      const type = p.payment_type ?? "Unknown";
      if (!paymentByType[type]) paymentByType[type] = { count: 0, total: 0 };
      paymentByType[type].count++;
      paymentByType[type].total += p.pay_amt ?? p.amount ?? 0;
    }

    // Order totals
    const validOrders = orders.filter((o: any) => !o.is_void);
    const voidOrders = orders.filter((o: any) => o.is_void);

    const totalSales = validOrders.reduce((s: number, o: any) => s + (o.grand_total ?? 0), 0);
    const totalSubtotal = validOrders.reduce((s: number, o: any) => s + (o.subtotal ?? 0), 0);
    const totalTax = validOrders.reduce((s: number, o: any) => s + (o.tax_total ?? 0), 0);
    const totalDiscount = validOrders.reduce((s: number, o: any) => s + (o.discount_total ?? 0), 0);
    const voidTotal = voidOrders.reduce((s: number, o: any) => s + (o.grand_total ?? 0), 0);

    // Till summary
    const tillSummary = tills.map((t: any) => ({
      till_id: t.till_id,
      documentno: t.documentno,
      status: t.status ?? (t.date_closed ? "closed" : "open"),
      opening_amt: t.opening_amt ?? 0,
      closing_amt: t.closing_amt ?? 0,
      cash_amt: t.cash_amt ?? 0,
      card_amt: t.card_amt ?? 0,
      grand_total: t.grand_total ?? 0,
      date_opened: t.date_opened,
      date_closed: t.date_closed,
    }));

    const report = {
      summary: {
        date,
        store_id: storeId ? parseInt(storeId) : null,
        terminal_id: terminalId ? parseInt(terminalId) : null,
        total_sales: totalSales,
        total_subtotal: totalSubtotal,
        total_tax: totalTax,
        total_discount: totalDiscount,
        order_count: validOrders.length,
        void_count: voidOrders.length,
        void_total: voidTotal,
        avg_order: validOrders.length > 0 ? totalSales / validOrders.length : 0,
      },
      payment_breakdown: Object.entries(paymentByType).map(([type, data]) => ({
        payment_type: type,
        count: data.count,
        total: data.total,
        percentage: totalSales > 0 ? (data.total / totalSales) * 100 : 0,
      })),
      tills: tillSummary,
      generated_at: new Date().toISOString(),
    };

    // CSV export
    if (format === "csv") {
      const lines = [
        `Z-Report: ${date}`,
        `Generated: ${report.generated_at}`,
        "",
        "SUMMARY",
        `Total Sales,${totalSales.toFixed(2)}`,
        `Subtotal,${totalSubtotal.toFixed(2)}`,
        `Tax,${totalTax.toFixed(2)}`,
        `Discount,${totalDiscount.toFixed(2)}`,
        `Orders,${validOrders.length}`,
        `Voids,${voidOrders.length}`,
        `Void Total,${voidTotal.toFixed(2)}`,
        `Avg Order,${report.summary.avg_order.toFixed(2)}`,
        "",
        "PAYMENT BREAKDOWN",
        "Type,Count,Total,Percentage",
        ...report.payment_breakdown.map(
          (p) => `${p.payment_type},${p.count},${p.total.toFixed(2)},${p.percentage.toFixed(1)}%`
        ),
        "",
        "TILLS",
        "Till,Status,Opening,Closing,Cash,Card,Total",
        ...tillSummary.map(
          (t: any) => `${t.documentno},${t.status},${t.opening_amt.toFixed(2)},${t.closing_amt.toFixed(2)},${t.cash_amt.toFixed(2)},${t.card_amt.toFixed(2)},${t.grand_total.toFixed(2)}`
        ),
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="z-report-${date}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (e: any) {
    await logError(accountId, `Z-report generation failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
