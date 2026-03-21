import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PROTECTED_DELETE_STATUSES,
  defaultStatusForType,
  findOwnerByIdentity,
  normalizeAccountStatus,
  normalizeAccountType,
  normalizeEmail,
  normalizePhone,
} from "@/lib/owner-lifecycle";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function resolveOwnedAccount(
  accountId: string,
  identity: { phone?: string; email?: string }
): Promise<{ error: string } | { owner: any; account: any }> {
  const { owner, error: ownerError } = await findOwnerByIdentity(getDb(), identity);
  if (ownerError) {
    return { error: ownerError };
  }

  if (!owner?.id) {
    return { error: "Owner not found" };
  }

  const { data: account, error: accountError } = await getDb()
    .from("account")
    .select("account_id, businessname, type, status, created_at, owner_id")
    .eq("account_id", accountId)
    .eq("owner_id", owner.id)
    .single();

  if (accountError && accountError.code !== "PGRST116") {
    return { error: accountError.message };
  }

  if (!account?.account_id) {
    return { error: "Account not found" };
  }

  return { owner, account };
}

function formatAccount(account: any, owner: any) {
  return {
    ...account,
    owner_email: owner.email || "",
    owner_phone: owner.phone || "",
    created_at_ms: Date.parse(account.created_at || "") || Date.now(),
  };
}

async function parseDeleteBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const body = await req.json();
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const businessname = body.businessname?.trim();
  const type = normalizeAccountType(body.type);
  const status = normalizeAccountStatus(body.status);

  if (!businessname) {
    return NextResponse.json({ error: "businessname is required" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "type must be demo, trial, or live" }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json(
      { error: "status must be draft, in_progress, testing, onboarding, active, or failed" },
      { status: 400 }
    );
  }

  const resolved = await resolveOwnedAccount(accountId, { phone, email });
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const { owner } = resolved;
  const { data: account, error } = await getDb()
    .from("account")
    .update({
      businessname,
      type,
      status,
    })
    .eq("account_id", accountId)
    .select("account_id, businessname, type, status, created_at")
    .single();

  if (error || !account) {
    return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    account: formatAccount(account, owner),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const body = await parseDeleteBody(req);
  const phone = normalizePhone(body.phone || req.nextUrl.searchParams.get("phone"));
  const email = normalizeEmail(body.email || req.nextUrl.searchParams.get("email"));
  const verificationPhone = normalizePhone(body.verification_phone);
  const ownerPin = typeof body.owner_pin === "string" ? body.owner_pin.trim() : "";
  const resolved = await resolveOwnedAccount(accountId, { phone, email });

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const { owner, account } = resolved;
  const accountType = normalizeAccountType(account.type) || "trial";
  const accountStatus = normalizeAccountStatus(account.status) || defaultStatusForType(accountType);

  if (PROTECTED_DELETE_STATUSES.has(accountStatus)) {
    if (!verificationPhone || verificationPhone !== (owner.phone || "")) {
      return NextResponse.json(
        { error: "Owner phone verification is required before deleting this account" },
        { status: 403 }
      );
    }
    if (!ownerPin) {
      return NextResponse.json(
        { error: "Owner PIN verification is required before deleting this account" },
        { status: 403 }
      );
    }

    const { data: ownerUser, error: ownerUserError } = await getDb()
      .from("pos_user")
      .select("pin")
      .eq("account_id", accountId)
      .eq("role", "owner")
      .single();

    if (ownerUserError && ownerUserError.code !== "PGRST116") {
      return NextResponse.json({ error: ownerUserError.message }, { status: 500 });
    }
    if (!ownerUser?.pin || ownerUser.pin !== ownerPin) {
      return NextResponse.json({ error: "Owner PIN verification failed" }, { status: 403 });
    }
  }

  const { error: archiveError } = await getDb()
    .from("account")
    .update({
      status: "archived",
      isactive: "N",
    })
    .eq("account_id", accountId);

  if (archiveError) {
    return NextResponse.json({ error: archiveError.message }, { status: 500 });
  }

  const { data: fallbackAccount } = await getDb()
    .from("account")
    .select("account_id")
    .eq("owner_id", owner.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fallbackAccount?.account_id) {
    await getDb()
      .from("owner_account_session")
      .upsert(
        { owner_id: owner.id, account_id: fallbackAccount.account_id },
        { onConflict: "owner_id" }
      );
  } else {
    await getDb().from("owner_account_session").delete().eq("owner_id", owner.id);
  }

  return NextResponse.json({ success: true, archived: true });
}
