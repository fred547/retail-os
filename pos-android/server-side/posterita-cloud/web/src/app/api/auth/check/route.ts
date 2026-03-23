import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

/**
 * POST /api/auth/check
 * Body: { email?, phone? }
 * Returns: { exists: boolean, matched_on: "email"|"phone"|null }
 *
 * Lightweight check — no auth required. Used by Android signup
 * to validate fields in real-time before submitting.
 */
export async function POST(req: NextRequest) {
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
