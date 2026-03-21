import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    const liveAccount = accounts?.find((a: any) => a.type === "live");
    const demoAccount = accounts?.find((a: any) => a.type === "demo");

    return NextResponse.json({
      owner_id: owner.id,
      live_account_id: liveAccount?.account_id || null,
      demo_account_id: demoAccount?.account_id || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
