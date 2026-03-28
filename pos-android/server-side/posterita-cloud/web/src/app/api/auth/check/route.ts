import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

// ════════════════════════════════════════════════════════
// Rate limiting — 30 requests per minute per IP
// ════════════════════════════════════════════════════════
const authCheckRateLimiter = new Map<string, { count: number; firstAttempt: number }>();
const AUTH_CHECK_MAX = 30;
const AUTH_CHECK_WINDOW_MS = 60 * 1000; // 1 minute

function checkAuthCheckRate(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = authCheckRateLimiter.get(key);
  if (!entry || now - entry.firstAttempt > AUTH_CHECK_WINDOW_MS) {
    authCheckRateLimiter.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= AUTH_CHECK_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.firstAttempt + AUTH_CHECK_WINDOW_MS - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

/**
 * POST /api/auth/check
 * Body: { email?, phone? }
 * Returns: { exists: boolean, matched_on: "email"|"phone"|null }
 *
 * Lightweight check — no auth required. Used by Android signup
 * to validate fields in real-time before submitting.
 */
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkAuthCheckRate(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } }
    );
  }

  const body = await req.json();
  const email = body.email?.trim()?.toLowerCase() || "";
  const phone = body.phone?.trim() || "";

  if (!email && !phone) {
    return NextResponse.json({ exists: false, matched_on: null });
  }

  const supabase = getDb();

  // Check email
  if (email) {
    const { data } = await supabase
      .from("owner")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (data) {
      return NextResponse.json({ exists: true, matched_on: "email" });
    }
  }

  // Check phone
  if (phone) {
    const { data } = await supabase
      .from("owner")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (data) {
      return NextResponse.json({ exists: true, matched_on: "phone" });
    }
  }

  return NextResponse.json({ exists: false, matched_on: null });
}
