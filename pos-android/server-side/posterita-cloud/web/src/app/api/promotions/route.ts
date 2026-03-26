import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PROMOTION",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/promotions — list promotions */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "true";

    let query = getDb()
      .from("promotion")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_deleted", false)
      .order("priority", { ascending: false });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) {
      await logToErrorDb(accountId, `Failed to fetch promotions: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get usage counts
    const promoIds = (data || []).map((p: any) => p.id);
    let usageCounts: Record<number, number> = {};
    if (promoIds.length > 0) {
      const { data: usages } = await getDb()
        .from("promotion_usage")
        .select("promotion_id")
        .eq("account_id", accountId)
        .in("promotion_id", promoIds);

      if (usages) {
        for (const u of usages) {
          usageCounts[u.promotion_id] = (usageCounts[u.promotion_id] || 0) + 1;
        }
      }
    }

    const enriched = (data || []).map((p: any) => ({
      ...p,
      usage_count: usageCounts[p.id] || 0,
    }));

    return NextResponse.json({ promotions: enriched });
  } catch (e: any) {
    await logToErrorDb(accountId, `Promotions list error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST /api/promotions — create a promotion */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, type, discount_value } = body;

    if (!name || !type) return NextResponse.json({ error: "name and type are required" }, { status: 400 });
    if (!["percentage_off", "fixed_off", "buy_x_get_y", "promo_code"].includes(type)) {
      return NextResponse.json({ error: "Invalid promotion type" }, { status: 400 });
    }

    const { data, error } = await getDb()
      .from("promotion")
      .insert({
        account_id: accountId,
        name,
        description: body.description || null,
        type,
        discount_value: discount_value || 0,
        buy_quantity: body.buy_quantity || null,
        get_quantity: body.get_quantity || null,
        applies_to: body.applies_to || "order",
        product_ids: body.product_ids || [],
        category_ids: body.category_ids || [],
        min_order_amount: body.min_order_amount || null,
        max_discount_amount: body.max_discount_amount || null,
        promo_code: body.promo_code || null,
        max_uses: body.max_uses || null,
        max_uses_per_customer: body.max_uses_per_customer || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        days_of_week: body.days_of_week || [1, 2, 3, 4, 5, 6, 7],
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        store_id: body.store_id || 0,
        priority: body.priority || 0,
      })
      .select()
      .single();

    if (error) {
      await logToErrorDb(accountId, `Failed to create promotion: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ promotion: data }, { status: 201 });
  } catch (e: any) {
    await logToErrorDb(accountId, `Promotion create error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
