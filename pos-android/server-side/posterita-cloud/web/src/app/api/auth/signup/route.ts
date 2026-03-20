import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeEmail,
  normalizePhone,
  findOwnerByIdentity,
} from "@/lib/owner-lifecycle";
import crypto from "crypto";

/**
 * POST /api/auth/signup
 *
 * Public endpoint (no auth required) for new user registration.
 * Creates:
 *   1. Owner record
 *   2. Live brand (their real store — empty, ready for products)
 *   3. Demo brand (playground — pre-seeded with sample data)
 *   4. Each brand gets: 1 store, 1 terminal, default taxes
 *   5. Demo brand also gets: sample categories + products
 *
 * Body: { phone, email?, firstname, lastname?, country?, currency? }
 * Returns: { owner_id, live_account_id, demo_account_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const firstname = body.firstname?.trim() || "";
    const lastname = body.lastname?.trim() || "";
    const country = body.country?.trim() || "Mauritius";
    const currency = body.currency?.trim() || "MUR";
    const businessName = body.businessname?.trim() || `${firstname}'s Store`;

    if (!phone && !email) {
      return NextResponse.json({ error: "Phone or email required" }, { status: 400 });
    }
    if (!firstname) {
      return NextResponse.json({ error: "First name required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if owner already exists
    const existingOwner = await findOwnerByIdentity(supabase, { phone, email });
    if (existingOwner) {
      return NextResponse.json(
        { error: "An account with this phone/email already exists" },
        { status: 409 }
      );
    }

    // Generate IDs
    const randomId = () => crypto.randomBytes(4).toString("hex");
    const liveAccountId = `live_${randomId()}`;
    const demoAccountId = `demo_${randomId()}`;

    // 1. Create owner
    const { data: owner, error: ownerErr } = await supabase
      .from("owner")
      .insert({
        email: email || null,
        phone: phone || null,
      })
      .select("id")
      .single();

    if (ownerErr) {
      return NextResponse.json({ error: `Owner creation failed: ${ownerErr.message}` }, { status: 500 });
    }

    const ownerId = owner.id;

    // 2. Create LIVE brand (their real store)
    const { error: liveAccErr } = await supabase.from("account").insert({
      account_id: liveAccountId,
      businessname: businessName,
      type: "live",
      status: "onboarding",
      owner_id: ownerId,
      currency,
    });
    if (liveAccErr) {
      return NextResponse.json({ error: `Live account failed: ${liveAccErr.message}` }, { status: 500 });
    }

    // 3. Create DEMO brand (playground)
    const { error: demoAccErr } = await supabase.from("account").insert({
      account_id: demoAccountId,
      businessname: `${firstname}'s Demo`,
      type: "demo",
      status: "testing",
      owner_id: ownerId,
      currency,
    });
    if (demoAccErr) {
      return NextResponse.json({ error: `Demo account failed: ${demoAccErr.message}` }, { status: 500 });
    }

    // 4. Create owner-account sessions for both
    await supabase.from("owner_account_session").upsert({
      owner_id: ownerId,
      account_id: liveAccountId,
    });

    // 5. Create POS owner user for both accounts
    for (const accountId of [liveAccountId, demoAccountId]) {
      await supabase.from("pos_user").insert({
        account_id: accountId,
        firstname,
        lastname: lastname || null,
        username: firstname.toLowerCase(),
        email: email || null,
        phone1: phone || null,
        role: "owner",
        isadmin: "Y",
        issalesrep: "Y",
        isactive: "Y",
        pin: "1234",
        country,
      });
    }

    // 6. Create store + terminal for LIVE brand
    await createStoreAndTerminal(supabase, liveAccountId, businessName, country);

    // 7. Create store + terminal + demo data for DEMO brand
    await createStoreAndTerminal(supabase, demoAccountId, `${firstname}'s Demo Store`, country);
    await seedDemoTaxes(supabase, demoAccountId);
    await seedDemoCategories(supabase, demoAccountId);
    await seedDemoProducts(supabase, demoAccountId, currency);

    // 8. Create default taxes for live brand too
    await seedDefaultTaxes(supabase, liveAccountId);

    return NextResponse.json({
      owner_id: ownerId,
      live_account_id: liveAccountId,
      demo_account_id: demoAccountId,
      message: "Account created with 2 brands",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---- HELPERS ----

async function createStoreAndTerminal(
  supabase: any,
  accountId: string,
  storeName: string,
  country: string
) {
  const { data: store } = await supabase
    .from("store")
    .insert({
      account_id: accountId,
      name: storeName,
      country,
      isactive: "Y",
    })
    .select("store_id")
    .single();

  if (store) {
    await supabase.from("terminal").insert({
      account_id: accountId,
      store_id: store.store_id,
      name: "POS 1",
      prefix: accountId.substring(0, 3).toUpperCase(),
      isactive: "Y",
      floatamt: 0,
      sequence: 1,
    });
  }
}

async function seedDefaultTaxes(supabase: any, accountId: string) {
  await supabase.from("tax").insert([
    { account_id: accountId, name: "VAT 15%", rate: 15, isactive: "Y" },
    { account_id: accountId, name: "No Tax", rate: 0, isactive: "Y" },
  ]);
}

async function seedDemoTaxes(supabase: any, accountId: string) {
  await supabase.from("tax").insert([
    { account_id: accountId, name: "VAT 15%", rate: 15, isactive: "Y" },
    { account_id: accountId, name: "No Tax", rate: 0, isactive: "Y" },
  ]);
}

async function seedDemoCategories(supabase: any, accountId: string) {
  await supabase.from("productcategory").insert([
    { account_id: accountId, name: "Food", position: 1, isactive: "Y" },
    { account_id: accountId, name: "Drinks", position: 2, isactive: "Y" },
    { account_id: accountId, name: "Snacks", position: 3, isactive: "Y" },
    { account_id: accountId, name: "Desserts", position: 4, isactive: "Y" },
  ]);
}

async function seedDemoProducts(
  supabase: any,
  accountId: string,
  currency: string
) {
  // Get category IDs
  const { data: cats } = await supabase
    .from("productcategory")
    .select("productcategory_id, name")
    .eq("account_id", accountId);

  const catMap: Record<string, number> = {};
  for (const c of cats || []) {
    catMap[c.name] = c.productcategory_id;
  }

  // Get tax ID
  const { data: taxes } = await supabase
    .from("tax")
    .select("tax_id, name")
    .eq("account_id", accountId)
    .eq("name", "VAT 15%");
  const taxId = taxes?.[0]?.tax_id || 0;

  const products = [
    { name: "Classic Burger", price: 250, cat: "Food", kitchen: true },
    { name: "Cheese Burger", price: 290, cat: "Food", kitchen: true },
    { name: "Grilled Chicken", price: 350, cat: "Food", kitchen: true },
    { name: "Fish & Chips", price: 320, cat: "Food", kitchen: true },
    { name: "Caesar Salad", price: 220, cat: "Food", kitchen: true },
    { name: "Coca Cola", price: 60, cat: "Drinks", kitchen: false },
    { name: "Fresh Juice", price: 120, cat: "Drinks", kitchen: false },
    { name: "Coffee", price: 80, cat: "Drinks", kitchen: false },
    { name: "Iced Tea", price: 90, cat: "Drinks", kitchen: false },
    { name: "Water", price: 30, cat: "Drinks", kitchen: false },
    { name: "Chips", price: 45, cat: "Snacks", kitchen: false },
    { name: "Samosa", price: 35, cat: "Snacks", kitchen: true },
    { name: "Ice Cream", price: 100, cat: "Desserts", kitchen: false },
    { name: "Chocolate Cake", price: 150, cat: "Desserts", kitchen: true },
    { name: "Fruit Salad", price: 130, cat: "Desserts", kitchen: false },
  ];

  for (const p of products) {
    await supabase.from("product").insert({
      account_id: accountId,
      name: p.name,
      sellingprice: p.price,
      costprice: Math.round(p.price * 0.4),
      productcategory_id: catMap[p.cat] || 0,
      tax_id: taxId,
      istaxincluded: "Y",
      isactive: "Y",
      isstock: "Y",
      iskitchenitem: p.kitchen ? "Y" : "N",
    });
  }
}
