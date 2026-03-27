import { NextRequest, NextResponse } from "next/server";
import {
  deriveLifecycleStatus,
  findOwnerByIdentity,
  normalizeAccountType,
  normalizeEmail,
  normalizePhone,
} from "@/lib/owner-lifecycle";
import { ensureDefaultAccountManager } from "@/lib/account-manager";
import { getDb } from "@/lib/supabase/admin";

/**
 * Auto-register/link a POS account to the cloud.
 *
 * Called once when the Android app first syncs. Uses the owner's phone/email
 * as the identifier. If the account_id already exists, returns it.
 * If not, creates the account record with all provided data.
 *
 * The account_id is permanent — even if the owner contact changes later,
 * the account_id stays the same forever.
 */

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "SYNC",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

async function linkAccountOwner(
  accountId: string,
  identity: { email?: unknown; phone?: unknown },
  businessName: string
) {
  const normalizedEmail = normalizeEmail(identity.email);
  const normalizedPhone = normalizePhone(identity.phone);
  if (!normalizedEmail && !normalizedPhone) return;

  const { owner: existingOwner, error: ownerLookupError } = await findOwnerByIdentity(getDb(), {
    email: normalizedEmail,
    phone: normalizedPhone,
  });

  if (ownerLookupError) {
    console.error("Owner lookup failed:", ownerLookupError);
    return;
  }

  const accountManagerId = await ensureDefaultAccountManager(getDb());

  let ownerId = existingOwner?.id ?? null;

  if (!ownerId) {
    const { data: insertedOwner, error: ownerInsertError } = await getDb()
      .from("owner")
      .insert({
        email: normalizedEmail || `owner+${accountId}@local.posterita.invalid`,
        phone: normalizedPhone || null,
        phone_verified: false,
        account_manager_id: accountManagerId,
        name: businessName || normalizedEmail.split("@")[0] || normalizedPhone || "Owner",
        is_active: true,
      })
      .select("id")
      .single();

    if (ownerInsertError || !insertedOwner?.id) {
      console.error("Owner creation failed:", ownerInsertError?.message || "Unknown error");
      return;
    }

    ownerId = insertedOwner.id;
  } else {
    await getDb()
      .from("owner")
      .update({
        phone: normalizedPhone || existingOwner?.phone || null,
        email:
          normalizedEmail ||
          (existingOwner?.email?.includes("@local.posterita.invalid") ? null : existingOwner?.email) ||
          `owner+${accountId}@local.posterita.invalid`,
        account_manager_id: existingOwner?.account_manager_id || accountManagerId,
      })
      .eq("id", ownerId);
  }

  const { error: accountOwnerError } = await getDb()
    .from("account")
    .update({ owner_id: ownerId })
    .eq("account_id", accountId);

  if (accountOwnerError) {
    console.error("Account owner update failed:", accountOwnerError.message);
  }

  const { error: sessionError } = await getDb()
    .from("owner_account_session")
    .upsert({ owner_id: ownerId, account_id: accountId }, { onConflict: "owner_id" });

  if (sessionError) {
    console.error("Owner account session upsert failed:", sessionError.message);
  }
}

async function pushInitialData(body: any, accountId: string, currency: string) {
  const { taxes, categories, products, users, stores, terminals } = body;

  if (taxes?.length) {
    for (const tax of taxes) {
      await getDb().from("tax").upsert(
        {
          tax_id: tax.tax_id,
          account_id: accountId,
          name: tax.name,
          taxcode: tax.taxcode || "",
          rate: tax.rate ?? 0,
          isactive: tax.isactive || "Y",
        },
        { onConflict: "tax_id" }
      );
    }
  }
  if (categories?.length) {
    for (const cat of categories) {
      await getDb().from("productcategory").upsert(
        {
          productcategory_id: cat.productcategory_id,
          account_id: accountId,
          name: cat.name,
          display: cat.display || cat.name,
          tax_id: cat.tax_id || "",
          position: cat.position ?? 0,
          isactive: cat.isactive || "Y",
        },
        { onConflict: "productcategory_id" }
      );
    }
  }
  if (products?.length) {
    for (const product of products) {
      await getDb().from("product").upsert(
        {
          product_id: product.product_id,
          account_id: accountId,
          name: product.name,
          description: product.description || "",
          sellingprice: product.sellingprice ?? 0,
          costprice: product.costprice ?? 0,
          taxamount: product.taxamount ?? 0,
          tax_id: product.tax_id ?? 0,
          productcategory_id: product.productcategory_id ?? 0,
          image: product.image || "",
          upc: product.upc || "",
          itemcode: product.itemcode || "",
          barcodetype: product.barcodetype || "",
          isactive: product.isactive || "Y",
          istaxincluded: product.istaxincluded || "N",
          isstock: product.isstock || "Y",
          isvariableitem: product.isvariableitem || "N",
          iskitchenitem: product.iskitchenitem || "N",
          ismodifier: product.ismodifier || "N",
          isfavourite: product.isfavourite || "N",
        },
        { onConflict: "product_id" }
      );
    }
  }
  if (users?.length) {
    for (const user of users) {
      await getDb().from("pos_user").upsert(
        {
          user_id: user.user_id || user.userId,
          account_id: accountId,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          phone1: user.phone1 || user.phone,
          pin: user.pin,
          role: user.role || "owner",
          isadmin: user.isadmin,
          issalesrep: user.issalesrep,
          permissions: user.permissions,
          discountlimit: user.discountlimit ?? 0,
          isactive: user.isactive || "Y",
        },
        { onConflict: "user_id" }
      );
    }
  }
  if (stores?.length) {
    for (const store of stores) {
      await getDb().from("store").upsert(
        {
          store_id: store.storeId || store.store_id,
          account_id: accountId,
          name: store.name,
          address: store.address || store.address1 || "",
          city: store.city || "",
          state: store.state || "",
          zip: store.zip || "",
          country: store.country || "",
          currency: store.currency || currency || "MUR",
          isactive: "Y",
        },
        { onConflict: "store_id" }
      );
    }
  }
  if (terminals?.length) {
    for (const terminal of terminals) {
      await getDb().from("terminal").upsert(
        {
          terminal_id: terminal.terminalId || terminal.terminal_id,
          account_id: accountId,
          store_id: terminal.storeId || terminal.store_id,
          name: terminal.name,
          prefix: terminal.prefix,
          sequence: terminal.sequence ?? 0,
          cash_up_sequence: terminal.cash_up_sequence ?? terminal.cashUpSequence ?? 0,
          isactive: "Y",
        },
        { onConflict: "terminal_id" }
      );
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      account_id,
      email,
      phone,
      businessname,
      currency,
      users,
      type,
      status,
    } = body;

    if (!account_id || account_id === "null" || account_id === "0" || account_id.trim().length === 0) {
      return NextResponse.json({ error: "Valid account_id is required" }, { status: 400 });
    }

    const accountType = normalizeAccountType(type) || "trial";
    const lifecycleStatus = deriveLifecycleStatus({
      requestedStatus: status,
      accountType,
      activeUserCount: Array.isArray(users) ? users.filter((user: any) => user?.isactive !== "N").length : 0,
    });

    const { data: existing } = await getDb()
      .from("account")
      .select("account_id, businessname, type")
      .eq("account_id", account_id)
      .single();

    if (existing) {
      await pushInitialData(body, account_id, currency || "MUR");
      // Only update type/status if NOT already set to a higher tier (don't downgrade live → trial)
      const currentType = existing.type || "trial";
      const shouldUpdateType = currentType === "trial" && accountType !== "trial";
      if (shouldUpdateType) {
        await getDb()
          .from("account")
          .update({
            type: accountType,
            status: lifecycleStatus,
          })
          .eq("account_id", account_id);
      }

      await linkAccountOwner(account_id, { email, phone }, existing.businessname || businessname || "Unnamed Business");

      return NextResponse.json({
        success: true,
        account_id: existing.account_id,
        businessname: existing.businessname,
        is_new: false,
      });
    }

    const { error: accountError } = await getDb().from("account").insert({
      account_id,
      businessname: businessname || "Unnamed Business",
      currency: currency || "MUR",
      type: accountType,
      status: lifecycleStatus,
      isactive: "Y",
    });

    if (accountError) {
      return NextResponse.json(
        { error: `Account creation failed: ${accountError.message}` },
        { status: 500 }
      );
    }

    await pushInitialData(body, account_id, currency || "MUR");
    await linkAccountOwner(account_id, { email, phone }, businessname || "Unnamed Business");

    return NextResponse.json({
      success: true,
      account_id,
      businessname: businessname || "Unnamed Business",
      is_new: true,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    await logToErrorDb("system", `Sync register failed: ${error.message}`, error.stack);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
