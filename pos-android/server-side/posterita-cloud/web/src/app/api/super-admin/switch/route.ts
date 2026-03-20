import { NextRequest, NextResponse } from "next/server";
import { switchAccount } from "@/lib/super-admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { account_id } = body;

  const success = await switchAccount(account_id ?? null);

  if (!success) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json({ success: true, account_id });
}
