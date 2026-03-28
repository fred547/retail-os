import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "AUTH",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/auth/lookup
 *
 * Looks up an existing owner by email or phone and returns their account IDs.
 * Used when Android signup gets 409 (account already exists) and needs the real IDs.
 *
 * Body: { email?, phone? }
 * Returns: { owner_id, live_account_id, demo_account_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase() || null;
    const phone = body.phone?.trim() || null;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone required" },
        { status: 400 }
      );
    }

    const supabase = getDb();

    // Find owner by email or phone
    let ownerQuery = supabase.from("owner").select("id");
    if (email) {
      ownerQuery = ownerQuery.eq("email", email);
    } else if (phone) {
      ownerQuery = ownerQuery.eq("phone", phone);
    }

    const { data: owner } = await ownerQuery.maybeSingle();
    if (!owner) {
      return NextResponse.json(
        { error: "No account found" },
        { status: 404 }
      );
    }

    // Find accounts for this owner
    const { data: accounts } = await supabase
      .from("account")
      .select("account_id, type")
      .eq("owner_id", owner.id);

    // Find live account (or fallback to trial/any non-demo account)
    const liveAccount = accounts?.find((a: any) => a.type === "live")
      || accounts?.find((a: any) => a.type !== "demo");
    const demoAccount = accounts?.find((a: any) => a.type === "demo");

    return NextResponse.json({
      owner_id: owner.id,
      live_account_id: liveAccount?.account_id || null,
      demo_account_id: demoAccount?.account_id || null,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Auth lookup failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
