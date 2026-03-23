import { NextRequest, NextResponse } from "next/server";
import {
  normalizeEmail,
  normalizePhone,
  findOwnerByIdentity,
} from "@/lib/owner-lifecycle";
import crypto from "crypto";
import { getDb } from "@/lib/supabase/admin";

export const maxDuration = 60;

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
    const password = body.password?.trim() || "";
    const pin = body.pin?.trim() || "";
    const firstname = body.firstname?.trim() || "";
    const lastname = body.lastname?.trim() || "";
    const country = body.country?.trim() || "Mauritius";
    const currency = body.currency?.trim() || "MUR";
    const businessName = body.businessname?.trim() || `${firstname}'s Store`;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    // Password is optional — if not provided, auth user won't be created
    // but the POS account will still be set up
    if (!firstname) {
      return NextResponse.json({ error: "First name required" }, { status: 400 });
    }

    const supabase = getDb();

    // Check if owner already exists (by email or phone)
    const { owner: existingOwner } = await findOwnerByIdentity(supabase, { phone, email });
    if (existingOwner?.id) {
      // Determine which field matched
      const matchedOn = existingOwner.email === email ? "email" : "phone";
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please sign in instead, or use a different email.",
          code: "ACCOUNT_EXISTS",
          matched_on: matchedOn,
          existing_email: existingOwner.email,
        },
        { status: 409 }
      );
    }

    // Create Supabase Auth user (email + password)
    // Non-blocking: if auth fails, we still create the POS account
    let authUserId: string | null = null;
    try {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { firstname, phone },
      });
      if (authErr) {
        console.warn("Supabase Auth user creation failed (non-blocking):", authErr.message);
      } else {
        authUserId = authUser.user?.id || null;
      }
    } catch (e: any) {
      console.warn("Supabase Auth error (non-blocking):", e.message);
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
        name: firstname,
        auth_uid: authUserId || null,
        is_active: true,
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

    // 5. Create store + terminal for BOTH brands (before users, so store_id exists)
    const liveIds = await createStoreAndTerminal(supabase, liveAccountId, businessName, country);
    const demoIds = await createStoreAndTerminal(supabase, demoAccountId, `${firstname}'s Demo Store`, country);

    // 6. Create default taxes for both brands
    await seedDefaultTaxes(supabase, liveAccountId);
    await seedDemoTaxes(supabase, demoAccountId);

    // 7. Create POS owner user for both accounts — return server-assigned user_id
    let liveUserId = 0;
    let demoUserId = 0;
    for (const accId of [liveAccountId, demoAccountId]) {
      const { data: userData, error: userErr } = await supabase.from("pos_user").insert({
        account_id: accId,
        auth_uid: authUserId,
        firstname,
        lastname: lastname || null,
        username: firstname.toLowerCase(),
        email: email || null,
        phone1: phone || null,
        role: "owner",
        isadmin: "Y",
        issalesrep: "Y",
        isactive: "Y",
        pin: pin || null,
        country,
      }).select("user_id").single();
      if (userErr) {
        console.warn(`User insert for ${accId} failed:`, userErr.message);
      } else if (userData) {
        if (accId === liveAccountId) liveUserId = userData.user_id;
        else demoUserId = userData.user_id;
      }
    }

    // 8. Seed demo brand with categories, products (with images), and modifiers
    await seedDemoCategories(supabase, demoAccountId);
    await seedDemoProducts(supabase, demoAccountId, currency);

    // 9. Read back sync_secret for the live account (auto-generated by DB default)
    const { data: liveAcc } = await supabase
      .from("account")
      .select("sync_secret")
      .eq("account_id", liveAccountId)
      .single();

    return NextResponse.json({
      owner_id: ownerId,
      live_account_id: liveAccountId,
      demo_account_id: demoAccountId,
      sync_secret: liveAcc?.sync_secret || null,
      // Server-assigned IDs — Android must use these instead of hardcoding 1
      live_store_id: liveIds.storeId,
      live_terminal_id: liveIds.terminalId,
      live_user_id: liveUserId,
      demo_store_id: demoIds.storeId,
      demo_terminal_id: demoIds.terminalId,
      demo_user_id: demoUserId,
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
): Promise<{ storeId: number; terminalId: number }> {
  const { data: store, error: storeErr } = await supabase
    .from("store")
    .insert({
      account_id: accountId,
      name: storeName,
      country,
      isactive: "Y",
    })
    .select("store_id")
    .single();

  if (storeErr) {
    console.error(`Store insert for ${accountId} failed:`, storeErr.message);
    return { storeId: 0, terminalId: 0 };
  }

  const storeId = store?.store_id ?? 0;

  if (storeId > 0) {
    const { data: terminal, error: termErr } = await supabase.from("terminal").insert({
      account_id: accountId,
      store_id: storeId,
      name: "POS 1",
      prefix: accountId.substring(0, 3).toUpperCase(),
      isactive: "Y",
      floatamt: 0,
      sequence: 1,
    }).select("terminal_id").single();
    if (termErr) console.error(`Terminal insert for ${accountId} failed:`, termErr.message);
    return { storeId, terminalId: terminal?.terminal_id ?? 0 };
  }

  return { storeId: 0, terminalId: 0 };
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
    // Food
    { name: "Burger", price: 250, cat: "Food", kitchen: true,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop" },
    { name: "Pizza Slice", price: 180, cat: "Food", kitchen: true,
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop" },
    { name: "Chicken Wrap", price: 220, cat: "Food", kitchen: true,
      image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop" },
    { name: "Salad Bowl", price: 200, cat: "Food", kitchen: true,
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop" },
    { name: "Sandwich", price: 160, cat: "Food", kitchen: true,
      image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop" },
    // Drinks
    { name: "Coffee", price: 80, cat: "Drinks", kitchen: false,
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop" },
    { name: "Orange Juice", price: 120, cat: "Drinks", kitchen: false,
      image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop" },
    { name: "Water", price: 30, cat: "Drinks", kitchen: false,
      image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop" },
    { name: "Soda", price: 60, cat: "Drinks", kitchen: false,
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop" },
    { name: "Smoothie", price: 150, cat: "Drinks", kitchen: false,
      image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200&h=200&fit=crop" },
    // Snacks
    { name: "Chips", price: 45, cat: "Snacks", kitchen: false,
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&h=200&fit=crop" },
    { name: "Samosa", price: 35, cat: "Snacks", kitchen: true,
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop" },
    { name: "Energy Bar", price: 65, cat: "Snacks", kitchen: false,
      image: "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=200&h=200&fit=crop" },
    // Desserts
    { name: "Ice Cream", price: 100, cat: "Desserts", kitchen: false,
      image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop" },
    { name: "Chocolate Cake", price: 150, cat: "Desserts", kitchen: true,
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
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
      image: p.image,
      product_status: "live",
    });
  }

  // Seed modifiers for food products (category-level)
  const foodCatId = catMap["Food"] || 0;
  const drinksCatId = catMap["Drinks"] || 0;
  if (foodCatId > 0) {
    const foodModifiers = [
      { name: "Extra Cheese", price: 30 },
      { name: "No Onion", price: 0 },
      { name: "Gluten Free", price: 20 },
      { name: "Spicy", price: 0 },
      { name: "Medium Rare", price: 0 },
      { name: "Well Done", price: 0 },
      { name: "Add Bacon", price: 40 },
      { name: "Large Portion", price: 50 },
    ];
    for (const m of foodModifiers) {
      await supabase.from("modifier").insert({
        account_id: accountId,
        productcategory_id: foodCatId,
        product_id: 0,
        name: m.name,
        sellingprice: m.price,
        isactive: "Y",
        ismodifier: "Y",
      });
    }
  }
  if (drinksCatId > 0) {
    const drinkModifiers = [
      { name: "Extra Shot", price: 20 },
      { name: "Oat Milk", price: 15 },
      { name: "No Sugar", price: 0 },
      { name: "No Ice", price: 0 },
    ];
    for (const m of drinkModifiers) {
      await supabase.from("modifier").insert({
        account_id: accountId,
        productcategory_id: drinksCatId,
        product_id: 0,
        name: m.name,
        sellingprice: m.price,
        isactive: "Y",
        ismodifier: "Y",
      });
    }
  }
}
