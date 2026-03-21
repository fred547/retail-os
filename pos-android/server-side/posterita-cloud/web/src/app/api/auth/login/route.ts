import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Authenticates a user via Supabase Auth (email + password).
 * Returns account IDs so the Android app can set up locally and sync.
 *
 * Body: { email, password }
 * Returns: { owner_id, live_account_id, demo_account_id, user }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Authenticate via Supabase Auth
    // Use a separate client for auth sign-in (service role can't sign in as user)
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authErr } =
      await authClient.auth.signInWithPassword({ email, password });

    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Find owner by email
    const { data: owner } = await supabase
      .from("owner")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!owner) {
      return NextResponse.json(
        { error: "No POS account found for this email" },
        { status: 404 }
      );
    }

    // Find accounts for this owner
    const { data: accounts } = await supabase
      .from("account")
      .select("account_id, type, businessname, currency, status")
      .eq("owner_id", owner.id);

    const liveAccount = accounts?.find((a: any) => a.type === "live");
    const demoAccount = accounts?.find((a: any) => a.type === "demo");

    return NextResponse.json({
      owner_id: owner.id,
      live_account_id: liveAccount?.account_id || null,
      demo_account_id: demoAccount?.account_id || null,
      brand_name: liveAccount?.businessname || null,
      currency: liveAccount?.currency || null,
      auth_user_id: authData.user.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
