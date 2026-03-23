import { NextRequest, NextResponse } from "next/server";
import { switchAccount } from "@/lib/super-admin";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { account_id } = body;

  const success = await switchAccount(account_id ?? null);

  if (!success) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Clear account cache so next request re-resolves from DB
  try {
    const cookieStore = await cookies();
    cookieStore.delete("posterita_account_cache");
  } catch (_) {}

  return NextResponse.json({ success: true, account_id });
}
