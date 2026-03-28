import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const maxDuration = 60;

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTO_TAG",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/tags/auto-apply — run all active rules against all products.
 *
 * For each rule:
 *   - category: products matching category_ids get the tags
 *   - price_range: products in [min_price, max_price] get the tags
 *   - keyword: products whose name/description contains the keyword get the tags
 *
 * Uses upsert (ignoreDuplicates) so running multiple times is safe.
 *
 * Body (optional): { product_ids: [1,2,3] } to limit to specific products.
 * If omitted, runs against ALL active products.
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetProductIds: number[] | null = body.product_ids?.length ? body.product_ids : null;

    // 1. Load all active rules
    const { data: rules, error: rulesErr } = await getDb()
      .from("auto_tag_rule")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("priority", { ascending: false });

    if (rulesErr) throw rulesErr;
    if (!rules?.length) return NextResponse.json({ applied: 0, message: "No active rules" });

    // 2. Load products
    let productQuery = getDb()
      .from("product")
      .select("product_id, name, description, sellingprice, productcategory_id")
      .eq("account_id", accountId)
      .eq("isactive", "Y")
      .eq("is_deleted", false);

    if (targetProductIds) {
      productQuery = productQuery.in("product_id", targetProductIds);
    }

    const { data: products, error: prodErr } = await productQuery;
    if (prodErr) throw prodErr;
    if (!products?.length) return NextResponse.json({ applied: 0, message: "No products to tag" });

    // 3. Evaluate rules against products
    const assignments: { product_id: number; tag_id: number; account_id: string }[] = [];

    for (const rule of rules) {
      const tagIds: number[] = rule.tag_ids || [];
      if (!tagIds.length) continue;

      let matchingProducts: typeof products = [];

      switch (rule.rule_type) {
        case "category": {
          const catIds: number[] = rule.category_ids || [];
          if (catIds.length) {
            matchingProducts = products.filter((p: any) => catIds.includes(p.productcategory_id));
          }
          break;
        }
        case "price_range": {
          matchingProducts = products.filter((p: any) => {
            const price = p.sellingprice ?? 0;
            if (rule.min_price != null && price < rule.min_price) return false;
            if (rule.max_price != null && price > rule.max_price) return false;
            return true;
          });
          break;
        }
        case "keyword": {
          if (rule.keyword) {
            const kw = rule.keyword.toLowerCase();
            matchingProducts = products.filter((p: any) =>
              (p.name?.toLowerCase().includes(kw)) ||
              (p.description?.toLowerCase().includes(kw))
            );
          }
          break;
        }
      }

      for (const product of matchingProducts) {
        for (const tagId of tagIds) {
          assignments.push({
            product_id: product.product_id,
            tag_id: tagId,
            account_id: accountId,
          });
        }
      }
    }

    if (!assignments.length) {
      return NextResponse.json({ applied: 0, message: "No products matched any rules" });
    }

    // 4. Bulk upsert (ignoreDuplicates — safe to run repeatedly)
    const { error: upsertErr } = await getDb()
      .from("product_tag")
      .upsert(assignments, { onConflict: "product_id,tag_id", ignoreDuplicates: true });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      applied: assignments.length,
      rules_evaluated: rules.length,
      products_checked: products.length,
      message: `Applied ${assignments.length} tag assignments from ${rules.length} rules`,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Auto-tag apply: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
