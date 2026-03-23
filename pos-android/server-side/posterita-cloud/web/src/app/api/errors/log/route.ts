import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const maxDuration = 30;

/**
 * POST /api/errors/log
 * Logs errors from web console (client + API) to the error_logs table.
 * Same table as Android AppErrorLogger — unified error view on /errors page.
 *
 * Body: { severity, tag, message, stacktrace?, screen?, extra? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = await getSessionAccountId();

    await getDb().from("error_logs").insert({
      account_id: accountId || "web_unknown",
      severity: body.severity || "ERROR",
      tag: body.tag || "WebConsole",
      message: (body.message || "Unknown error").substring(0, 2000),
      stack_trace: body.stacktrace?.substring(0, 5000) || null,
      device_info: body.screen ? `web_browser | ${body.screen}` : "web_browser",
      app_version: "web",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    // Don't fail — error logging should never crash the app
    console.error("[error-log] Failed to log error:", e.message);
    return NextResponse.json({ success: false });
  }
}
