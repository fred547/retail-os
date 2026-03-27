import { NextRequest, NextResponse } from "next/server";
import { getCurrentSuperAdminRecord, isSuperAdmin } from "@/lib/super-admin";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getDb } from "@/lib/supabase/admin";
import {
  AccountType,
  defaultStatusForType,
  findOwnerByIdentity,
  normalizeAccountType,
  normalizeEmail,
  normalizePhone,
} from "@/lib/owner-lifecycle";
import { ensureAccountManager, ensureDefaultAccountManager } from "@/lib/account-manager";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PLATFORM",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

export async function POST(req: NextRequest) {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const businessName = body.businessname?.trim();
    const normalizedEmail = normalizeEmail(body.email);
    const normalizedPhone = normalizePhone(body.phone);
    const accountType = normalizeAccountType(body.type) || "trial";
    const currency = body.currency?.trim() || "MUR";

    if (!businessName) {
      return NextResponse.json(
        { error: "businessname is required" },
        { status: 400 }
      );
    }

    if (!normalizedEmail && !normalizedPhone) {
      return NextResponse.json(
        { error: "phone or email is required" },
        { status: 400 }
      );
    }

    const admin = await createServerSupabaseAdmin();
    const supabaseService = getDb();
    const actingSuperAdmin = await getCurrentSuperAdminRecord();
    const accountManagerId = actingSuperAdmin
      ? await ensureAccountManager(admin, {
          superAdminId: actingSuperAdmin.id,
          authUid: actingSuperAdmin.auth_uid,
          email: actingSuperAdmin.email,
          name: actingSuperAdmin.name,
        })
      : await ensureDefaultAccountManager(admin);

    const accountId = await generateUniqueAccountId(admin, accountType);
    const initialStatus = defaultStatusForType(accountType);

    // Create the account shell first so cleanup is straightforward on failures.
    const { error: accountError } = await admin.from("account").insert({
      account_id: accountId,
      businessname: businessName,
      currency,
      type: accountType,
      status: initialStatus,
      isactive: "Y",
    });

    if (accountError) {
      return NextResponse.json(
        { error: `Account creation failed: ${accountError.message}` },
        { status: 500 }
      );
    }

    const { owner: existingOwner, error: ownerLookupError } = await findOwnerByIdentity(admin, {
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    if (ownerLookupError) {
      await admin.from("account").delete().eq("account_id", accountId);
      return NextResponse.json(
        { error: `Owner lookup failed: ${ownerLookupError}` },
        { status: 500 }
      );
    }

    let ownerId: number | null = existingOwner?.id ?? null;
    let ownerAuthUid: string | null = existingOwner?.auth_uid ?? null;
    let tempPassword: string | null = null;
    let ownerCreated = false;
    let emailSent = false;

    if (!ownerId && normalizedEmail) {
      tempPassword = generateTempPassword();

      const { data: authUser, error: authError } =
        await supabaseService.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role: "OWNER",
            must_change_password: true,
          },
        });

      if (authError || !authUser?.user?.id) {
        await admin.from("account").delete().eq("account_id", accountId);
        return NextResponse.json(
          { error: `User creation failed: ${authError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      ownerAuthUid = authUser.user.id;
    }

    if (!ownerId) {
      const { data: insertedOwner, error: ownerInsertError } = await admin
        .from("owner")
        .insert({
          auth_uid: ownerAuthUid,
          email: normalizedEmail || `owner+${accountId}@local.posterita.invalid`,
          phone: normalizedPhone || null,
          phone_verified: false,
          account_manager_id: accountManagerId,
          name: businessName,
          is_active: true,
        })
        .select("id")
        .single();

      if (ownerInsertError || !insertedOwner?.id) {
        await admin.from("account").delete().eq("account_id", accountId);
        return NextResponse.json(
          { error: `Owner creation failed: ${ownerInsertError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      ownerId = insertedOwner.id;
      ownerCreated = true;
    } else {
      await admin
        .from("owner")
        .update({
          auth_uid: ownerAuthUid || existingOwner?.auth_uid || null,
          phone: normalizedPhone || existingOwner?.phone || null,
          email: normalizedEmail || existingOwner?.email,
          account_manager_id: existingOwner?.account_manager_id || accountManagerId,
        })
        .eq("id", ownerId);
    }

    if (normalizedEmail) {
      try {
        const { error: resetError } =
          await supabaseService.auth.admin.generateLink({
            type: "magiclink",
            email: normalizedEmail,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://web.posterita.com"}/customer/login`,
            },
          });

        if (!resetError) {
          emailSent = true;
        }
      } catch {
        // Non-fatal.
      }
    }

    const { error: accountOwnerError } = await admin
      .from("account")
      .update({ owner_id: ownerId })
      .eq("account_id", accountId);

    if (accountOwnerError) {
      await admin.from("account").delete().eq("account_id", accountId);
      return NextResponse.json(
        { error: `Failed to attach owner: ${accountOwnerError.message}` },
        { status: 500 }
      );
    }

    const { error: posUserError } = await admin.from("pos_user").insert({
      account_id: accountId,
      auth_uid: ownerAuthUid,
      username: normalizedEmail.split("@")[0] || normalizedPhone || accountId,
      firstname: businessName,
      lastname: "",
      email: normalizedEmail,
      phone1: normalizedPhone || null,
      role: "OWNER",
      isadmin: "Y",
      issalesrep: "Y",
      isactive: "Y",
    });

    if (posUserError) {
      console.error("pos_user creation failed:", posUserError.message);
    }

    const { error: sessionError } = await admin
      .from("owner_account_session")
      .upsert(
        {
          owner_id: ownerId,
          account_id: accountId,
        },
        { onConflict: "owner_id" }
      );

    if (sessionError) {
      console.error("owner_account_session upsert failed:", sessionError.message);
    }

    return NextResponse.json({
      success: true,
      account_id: accountId,
      businessname: businessName,
      owner_email: normalizedEmail,
      owner_phone: normalizedPhone,
      account_manager_id: accountManagerId,
      owner_created: ownerCreated,
      temp_password: tempPassword,
      email_sent: emailSent,
      account_type: accountType,
      account_status: initialStatus,
      message: ownerCreated
        ? `New owner created for ${normalizedPhone || normalizedEmail}.`
        : `Attached a new account to existing owner ${normalizedPhone || normalizedEmail}.`,
    });
  } catch (error: any) {
    await logToErrorDb("system", `Platform create-account failed: ${error.message}`, error.stack);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateUniqueAccountId(admin: any, type: AccountType): Promise<string> {
  const prefix = type === "demo" ? "demo" : type === "live" ? "live" : "trial";

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}_${randomId(8)}`;
    const { data: existing } = await admin
      .from("account")
      .select("account_id")
      .eq("account_id", candidate)
      .single();

    if (!existing || (Array.isArray(existing) && existing.length === 0)) {
      return candidate;
    }
  }

  return `${prefix}_${Date.now().toString(36)}`;
}

function randomId(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function generateTempPassword(): string {
  const words = [
    "Blue",
    "Red",
    "Green",
    "Gold",
    "Star",
    "Moon",
    "Sun",
    "Sky",
    "Wave",
    "Fire",
    "Rock",
    "Wind",
    "Lake",
    "Peak",
    "Pine",
    "Sage",
    "Mint",
    "Jade",
    "Opal",
    "Ruby",
    "Dawn",
    "Dusk",
    "Cove",
    "Vale",
  ];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${w1}-${w2}-${num}`;
}
