import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * POST /api/ai-import/save
 * Saves AI-discovered products to Supabase for an existing account.
 * Called by Android AiImportService after Claude returns products.
 *
 * Body: {
 *   account_id: string,
 *   store_name?: string,
 *   currency?: string,
 *   tax_name?: string,
 *   tax_rate?: number,
 *   categories: [{ name: string, products: [{ name, price, description?, image_url? }] }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, categories } = body;

    if (!account_id || !categories?.length) {
      return NextResponse.json({ error: "account_id and categories required" }, { status: 400 });
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
