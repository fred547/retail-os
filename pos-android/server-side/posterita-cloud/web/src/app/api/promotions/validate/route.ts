import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PROMO_VALIDATE",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/promotions/validate — validate and compute discount for an order
 * Body: { promo_code?, order_total, customer_id?, store_id?, items: [{ product_id, category_id, quantity, price }] }
 * Returns: { applicable_promotions: [...], total_discount }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { promo_code, order_total, customer_id, store_id, items } = body;

    // Fetch active promotions
    let query = getDb()
      .from("promotion")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("priority", { ascending: false });

    const { data: promotions, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch promotions for validation: ${error.message}`);
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const applicable: any[] = [];

    for (const promo of promotions || []) {
      // Check promo code requirement
      if (promo.promo_code && promo.promo_code !== promo_code) continue;

      // Check store
      if (promo.store_id && promo.store_id !== 0 && promo.store_id !== store_id) continue;

      // Check date range
      if (promo.start_date && new Date(promo.start_date) > now) continue;
      if (promo.end_date && new Date(promo.end_date) < now) continue;

      // Check days of week
      const days = promo.days_of_week || [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(currentDay)) continue;

      // Check time range
      if (promo.start_time && promo.end_time) {
        if (promo.start_time <= promo.end_time) {
          if (currentTime < promo.start_time || currentTime > promo.end_time) continue;
        } else {
          if (currentTime < promo.start_time && currentTime > promo.end_time) continue;
        }
      }

      // Check min order amount
      if (promo.min_order_amount && (order_total || 0) < promo.min_order_amount) continue;

      // Check max uses
      if (promo.max_uses) {
        const { count } = await getDb()
          .from("promotion_usage")
          .select("*", { count: "exact", head: true })
          .eq("promotion_id", promo.id)
          .eq("account_id", accountId);

        if ((count || 0) >= promo.max_uses) continue;
      }

      // Check max uses per customer
      if (promo.max_uses_per_customer && customer_id) {
        const { count } = await getDb()
          .from("promotion_usage")
          .select("*", { count: "exact", head: true })
          .eq("promotion_id", promo.id)
          .eq("customer_id", customer_id)
          .eq("account_id", accountId);

        if ((count || 0) >= promo.max_uses_per_customer) continue;
      }

      // Calculate discount
      let discount = 0;

      if (promo.type === "percentage_off") {
        discount = (order_total || 0) * (promo.discount_value / 100);
        if (promo.max_discount_amount) discount = Math.min(discount, promo.max_discount_amount);
      } else if (promo.type === "fixed_off") {
        discount = promo.discount_value;
      } else if (promo.type === "buy_x_get_y" && items?.length) {
        // Simple: count qualifying items, compute free items
        const buyQty = promo.buy_quantity || 1;
        const getQty = promo.get_quantity || 1;
        const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
        const sets = Math.floor(totalQty / (buyQty + getQty));
        // Discount = cheapest item price * free items
        const sorted = [...(items || [])].sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
        discount = sets * getQty * (sorted[0]?.price || 0);
      } else if (promo.type === "promo_code") {
        discount = promo.discount_value;
      }

      if (discount > 0) {
        applicable.push({
          id: promo.id,
          name: promo.name,
          type: promo.type,
          discount: Math.round(discount * 100) / 100,
          promo_code: promo.promo_code,
        });
      }
    }

    const totalDiscount = applicable.reduce((sum, p) => sum + p.discount, 0);

    return NextResponse.json({
      applicable_promotions: applicable,
      total_discount: Math.round(totalDiscount * 100) / 100,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Promotion validation error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
