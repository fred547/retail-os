import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTH",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/account/create-demo
 * Creates a demo brand on the server with seeded products + images.
 * Called by Android ManageBrandsActivity when creating a demo brand.
 *
 * Body: { owner_id?, owner_email?, name, currency? }
 * Returns: { account_id, store_id, terminal_id, user_id, product_count }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name?.trim() || "Demo Store";
    const currency = body.currency?.trim() || "MUR";
    const ownerEmail = body.owner_email?.trim() || "";
    let ownerId = body.owner_id || null;

    const db = getDb();

    // Find owner — sanitize "null" string
    const cleanEmail = (ownerEmail && ownerEmail !== "null" && ownerEmail !== "undefined") ? ownerEmail.toLowerCase().trim() : "";
    if (!ownerId && cleanEmail) {
      const { data: owner } = await db
        .from("owner")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();
      ownerId = owner?.id || null;
    }

    // Also try finding owner by phone if email didn't work
    if (!ownerId) {
      const phone = body.phone?.trim() || "";
      if (phone && phone !== "null") {
        const { data: owner } = await db
          .from("owner")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();
        ownerId = owner?.id || null;
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "Could not find owner. Provide a valid owner_email, phone, or owner_id." },
        { status: 400 }
      );
    }

    const demoAccountId = `demo_${crypto.randomBytes(4).toString("hex")}`;

    // Create account — always linked to an owner
    const { error: accErr } = await db.from("account").insert({
      account_id: demoAccountId,
      businessname: name,
      type: "demo",
      status: "testing",
      owner_id: ownerId,
      currency,
    });
    if (accErr) {
      return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }

    // Store + Terminal
    const { data: store } = await db.from("store").insert({
      account_id: demoAccountId, name, country: "Mauritius", isactive: "Y",
    }).select("store_id").single();
    const storeId = store?.store_id ?? 0;

    const { data: terminal } = await db.from("terminal").insert({
      account_id: demoAccountId, store_id: storeId, name: "POS 1",
      prefix: "DMO", isactive: "Y",
    }).select("terminal_id").single();
    const terminalId = terminal?.terminal_id ?? 0;

    // Taxes
    await db.from("tax").insert([
      { account_id: demoAccountId, name: "VAT 15%", rate: 15, isactive: "Y" },
      { account_id: demoAccountId, name: "No Tax", rate: 0, isactive: "Y" },
    ]);

    // Owner user
    const { data: userData } = await db.from("pos_user").insert({
      account_id: demoAccountId,
      firstname: "Demo", lastname: "Owner",
      username: "demo", pin: "0000",
      role: "owner", isadmin: "Y", issalesrep: "Y", isactive: "Y",
      email: cleanEmail || null,
    }).select("user_id").single();
    const userId = userData?.user_id ?? 0;

    // Categories
    await db.from("productcategory").insert([
      { account_id: demoAccountId, name: "Food", position: 1, isactive: "Y" },
      { account_id: demoAccountId, name: "Drinks", position: 2, isactive: "Y" },
      { account_id: demoAccountId, name: "Snacks", position: 3, isactive: "Y" },
      { account_id: demoAccountId, name: "Desserts", position: 4, isactive: "Y" },
    ]);

    // Get category IDs
    const { data: cats } = await db.from("productcategory")
      .select("productcategory_id, name").eq("account_id", demoAccountId);
    const catMap: Record<string, number> = {};
    for (const c of cats ?? []) catMap[c.name] = c.productcategory_id;

    const { data: taxes } = await db.from("tax")
      .select("tax_id").eq("account_id", demoAccountId).eq("name", "VAT 15%");
    const taxId = taxes?.[0]?.tax_id || 0;

    // 15 products with images
    const products = [
      { name: "Burger", price: 250, cat: "Food", kitchen: true, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop" },
      { name: "Pizza Slice", price: 180, cat: "Food", kitchen: true, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop" },
      { name: "Chicken Wrap", price: 220, cat: "Food", kitchen: true, image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop" },
      { name: "Salad Bowl", price: 200, cat: "Food", kitchen: true, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop" },
      { name: "Sandwich", price: 160, cat: "Food", kitchen: true, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop" },
      { name: "Coffee", price: 80, cat: "Drinks", kitchen: false, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop" },
      { name: "Orange Juice", price: 120, cat: "Drinks", kitchen: false, image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop" },
      { name: "Water", price: 30, cat: "Drinks", kitchen: false, image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop" },
      { name: "Soda", price: 60, cat: "Drinks", kitchen: false, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop" },
      { name: "Smoothie", price: 150, cat: "Drinks", kitchen: false, image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200&h=200&fit=crop" },
      { name: "Chips", price: 45, cat: "Snacks", kitchen: false, image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop" },
      { name: "Samosa", price: 35, cat: "Snacks", kitchen: true, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop" },
      { name: "Energy Bar", price: 65, cat: "Snacks", kitchen: false, image: "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=200&h=200&fit=crop" },
      { name: "Ice Cream", price: 100, cat: "Desserts", kitchen: false, image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop" },
      { name: "Chocolate Cake", price: 150, cat: "Desserts", kitchen: true, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
    ];

    for (const p of products) {
      await db.from("product").insert({
        account_id: demoAccountId, name: p.name, sellingprice: p.price,
        costprice: Math.round(p.price * 0.4), productcategory_id: catMap[p.cat] || 0,
        tax_id: taxId, istaxincluded: "Y", isactive: "Y", isstock: "Y",
        iskitchenitem: p.kitchen ? "Y" : "N", image: p.image, product_status: "live",
      });
    }

    return NextResponse.json({
      success: true,
      account_id: demoAccountId,
      store_id: storeId,
      terminal_id: terminalId,
      user_id: userId,
      product_count: products.length,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Create demo brand failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
