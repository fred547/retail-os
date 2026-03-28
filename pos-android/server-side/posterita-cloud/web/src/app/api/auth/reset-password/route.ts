import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════
// Rate limiting — 5 requests per hour per email
// ════════════════════════════════════════════════════════
const resetPasswordRateLimiter = new Map<string, { count: number; firstAttempt: number }>();
const RESET_MAX = 5;
const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkResetRate(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = resetPasswordRateLimiter.get(key);
  if (!entry || now - entry.firstAttempt > RESET_WINDOW_MS) {
    resetPasswordRateLimiter.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= RESET_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.firstAttempt + RESET_WINDOW_MS - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

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

    // Rate limit by email
    const rateCheck = checkResetRate(email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts" },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
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
