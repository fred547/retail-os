import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

/**
 * POST /api/auth/reset-password
 *
 * Sends a password reset email via Supabase Auth.
 * Body: { email }
 * Returns: { success: true } or { error: "..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase() || "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://web.posterita.com/auth/reset-confirm",
    });

    if (error) {
      console.error("Password reset error:", error.message);
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again." },
        { status: 500 }
      );
    }

    // Always return success even if email doesn't exist (security best practice)
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Password reset exception:", e.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
