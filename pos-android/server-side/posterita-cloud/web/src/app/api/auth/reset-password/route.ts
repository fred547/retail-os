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

    const supabase = getDb();

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
    await logToErrorDb("system", `Password reset failed: ${e.message}`, e.stack);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
