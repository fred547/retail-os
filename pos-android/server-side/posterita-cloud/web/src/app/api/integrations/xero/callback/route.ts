import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getConnections } from "@/lib/xero";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** GET /api/integrations/xero/callback — OAuth callback from Xero */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Decode state to get account_id
  let accountId = "system";
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      accountId = decoded.account_id;
    }
  } catch (_) { /* ignore */ }

  if (error) {
    await logToErrorDb(accountId, `Xero OAuth denied: ${error}`);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://web.posterita.com"}/customer/integrations?error=denied`);
  }

  if (!code || !accountId || accountId === "system") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://web.posterita.com"}/customer/integrations?error=invalid`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get connected organisation info
    const connections = await getConnections(tokens.access_token);
    const org = connections[0]; // First organisation

    if (!org) {
      await logToErrorDb(accountId, "Xero OAuth: no organisations found after token exchange");
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://web.posterita.com"}/customer/integrations?error=no_org`);
    }

    // Store connection (upsert)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbErr } = await getDb()
      .from("integration_connection")
      .upsert({
        account_id: accountId,
        provider: "xero",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        tenant_id: org.tenantId,
        org_name: org.tenantName,
        status: "active",
        error_message: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,provider" });

    if (dbErr) throw dbErr;

    // Log success event
    await getDb().from("integration_event_log").insert({
      account_id: accountId,
      provider: "xero",
      event_type: "oauth.connected",
      status: "sent",
      response_body: { org_name: org.tenantName, tenant_id: org.tenantId },
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://web.posterita.com"}/customer/integrations?success=xero`);
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero callback error: ${e.message}`, e.stack);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://web.posterita.com"}/customer/integrations?error=token_failed`);
  }
}
