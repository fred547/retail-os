import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { isAccountManager } from "@/lib/super-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  if (!(await isAccountManager())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await params;
  const body = await req.json();
  const accountManagerId = Number(body.account_manager_id);

  if (!Number.isFinite(accountManagerId) || accountManagerId <= 0) {
    return NextResponse.json({ error: "account_manager_id is required" }, { status: 400 });
  }

  const admin = await createServerSupabaseAdmin();
  const { data: account, error: accountError } = await admin
    .from("account")
    .select("account_id, owner_id")
    .eq("account_id", accountId)
    .single();

  if (accountError || !account?.owner_id) {
    return NextResponse.json({ error: "Account owner not found" }, { status: 404 });
  }

  const { error: ownerError } = await admin
    .from("owner")
    .update({ account_manager_id: accountManagerId })
    .eq("id", account.owner_id);

  if (ownerError) {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, account_id: accountId, account_manager_id: accountManagerId });
}
