import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

async function logToErrorDb(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "MARKETING_SUBSCRIBE",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST: Subscribe to email list (public, no auth) */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { limited } = checkRateLimit(`subscribe:${ip}`, 5);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, name, source } = body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();

    // Check if already subscribed
    const { data: existing } = await db
      .from("marketing_subscriber")
      .select("id, unsubscribed")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      if (existing.unsubscribed) {
        // Re-subscribe
        await db
          .from("marketing_subscriber")
          .update({
            unsubscribed: false,
            drip_step: 0,
            drip_next_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", existing.id);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: true, message: "Already subscribed" });
    }

    // New subscriber
    const { error: insertError } = await db.from("marketing_subscriber").insert({
      email: normalizedEmail,
      name: name ?? null,
      source: source ?? "website",
      drip_step: 0,
      drip_next_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      // Handle unique constraint violation gracefully
      if (insertError.code === "23505") {
        return NextResponse.json({ success: true, message: "Already subscribed" });
      }
      await logToErrorDb(`Failed to insert subscriber: ${insertError.message}`);
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logToErrorDb(err.message, err.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
