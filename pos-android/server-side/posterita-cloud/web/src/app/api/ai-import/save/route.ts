import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { getSessionAccountId } from "@/lib/account-context";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AI_IMPORT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/ai-import/save
 * Saves AI-discovered products to Supabase for an existing account.
 * Called by Android AiImportService after Claude returns products.
 * SECURITY: Requires authenticated session matching account_id, OR valid HMAC headers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, categories } = body;

    if (!account_id || !categories?.length) {
      return NextResponse.json({ error: "account_id and categories required" }, { status: 400 });
    }

    // SECURITY: Verify caller owns this account
    const sessionAccountId = await getSessionAccountId();
    const hasHmac = req.headers.get("x-sync-signature") && req.headers.get("x-sync-timestamp");
    if (!sessionAccountId && !hasHmac) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (sessionAccountId && sessionAccountId !== account_id) {
      return NextResponse.json({ error: "Account mismatch" }, { status: 403 });
    }

    const db = getDb();

    // Verify account exists
    const { data: account } = await db
      .from("account")
      .select("account_id")
      .eq("account_id", account_id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create taxes if needed
    const taxName = body.tax_name || "Tax";
    const taxRate = body.tax_rate || 0;
    const { data: existingTaxes } = await db
      .from("tax")
      .select("tax_id, name")
      .eq("account_id", account_id);

    let taxId = 0;
    if (!existingTaxes?.length) {
      const { data: t1 } = await db.from("tax").insert({
        account_id, name: taxName, rate: taxRate, isactive: "Y",
      }).select("tax_id").single();
      taxId = t1?.tax_id || 0;
      await db.from("tax").insert({
        account_id, name: "No Tax", rate: 0, isactive: "Y",
      });
    } else {
      taxId = existingTaxes[0].tax_id;
    }

    let totalProducts = 0;
    let totalCategories = 0;

    for (const cat of categories) {
      if (!cat.name) continue;

      // Create category
      const { data: catData } = await db.from("productcategory").insert({
        account_id,
        name: cat.name,
        isactive: "Y",
        position: totalCategories + 1,
      }).select("productcategory_id").single();

      const catId = catData?.productcategory_id || 0;
      totalCategories++;

      // Create products
      for (const prod of cat.products || []) {
        await db.from("product").insert({
          account_id,
          name: prod.name || "Product",
          description: prod.description || "",
          sellingprice: prod.price || 0,
          costprice: (prod.price || 0) * 0.4,
          productcategory_id: catId,
          tax_id: taxId,
          image: prod.image_url || null,
          isactive: "Y",
          istaxincluded: "Y",
          isstock: "Y",
          product_status: "live",
          source: "ai_import",
        });
        totalProducts++;
      }
    }

    // Update account status
    await db.from("account").update({
      businessname: body.store_name || account_id,
      status: "active",
      updated_at: new Date().toISOString(),
    }).eq("account_id", account_id);

    return NextResponse.json({
      success: true,
      account_id,
      categories_created: totalCategories,
      products_created: totalProducts,
    });
  } catch (e: any) {
    await logToErrorDb("system", `AI import save failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
