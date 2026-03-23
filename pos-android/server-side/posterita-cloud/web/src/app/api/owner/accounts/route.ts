import { NextRequest, NextResponse } from "next/server";
import { findOwnerByIdentity, normalizeEmail, normalizePhone } from "@/lib/owner-lifecycle";
import { getDb } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = getDb();
  const email = normalizeEmail(req.nextUrl.searchParams.get("email"));
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone"));
  if (!email && !phone) {
    return NextResponse.json({ error: "phone or email is required" }, { status: 400 });
  }

  const { owner, error: ownerError } = await findOwnerByIdentity(supabase, { phone, email });
  if (ownerError) {
    return NextResponse.json({ error: ownerError }, { status: 500 });
  }

  if (!owner?.id) {
    return NextResponse.json({ accounts: [] });
  }

  const { data: accounts, error: accountError } = await supabase
    .from("account")
    .select("account_id, businessname, type, status, created_at")
    .eq("owner_id", owner.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 });
  }

  return NextResponse.json({
    accounts: (accounts || []).map((account: any) => ({
      ...account,
      owner_email: owner.email,
      owner_phone: owner.phone || "",
      created_at_ms: Date.parse(account.created_at || "") || Date.now(),
    })),
  });
}
