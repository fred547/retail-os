import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { getAccounts, getTaxRates, refreshAccessToken } from "@/lib/xero";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "XERO",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/** Helper: get a valid token, refreshing if needed */
async function getValidToken(accountId: string) {
  const { data: conn } = await getDb()
    .from("integration_connection")
    .select("*")
    .eq("account_id", accountId)
    .eq("provider", "xero")
    .eq("status", "active")
    .single();

  if (!conn?.access_token || !conn?.refresh_token) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const tokens = await refreshAccessToken(conn.refresh_token);
    await getDb().from("integration_connection").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conn.id);
    return { accessToken: tokens.access_token, tenantId: conn.tenant_id };
  }
  return { accessToken: conn.access_token, tenantId: conn.tenant_id };
}

/**
 * GET /api/integrations/xero/settings — fetch Xero accounts + tax rates for config dropdowns
 * Also returns current settings and local taxes for mapping
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // Get current connection + settings
    const { data: conn } = await getDb()
      .from("integration_connection")
      .select("settings, status, org_name")
      .eq("account_id", accountId)
      .eq("provider", "xero")
      .single();

    if (!conn || conn.status === "disconnected") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 404 });
    }

    // Get local taxes for mapping UI
    const { data: localTaxes } = await getDb()
      .from("tax")
      .select("tax_id, name, rate")
      .eq("account_id", accountId);

    // Try to fetch Xero accounts + tax rates (needs valid token)
    let xeroAccounts: any[] = [];
    let xeroTaxRates: any[] = [];

    try {
      const auth = await getValidToken(accountId);
      if (auth) {
        const [accounts, taxRates] = await Promise.all([
          getAccounts(auth.accessToken, auth.tenantId),
          getTaxRates(auth.accessToken, auth.tenantId),
        ]);
        xeroAccounts = accounts.map(a => ({ code: a.Code, name: a.Name, type: a.Type, class: a.Class }));
        xeroTaxRates = taxRates.filter(t => t.Status === "ACTIVE").map(t => ({
          taxType: t.TaxType, name: t.Name, rate: t.EffectiveRate,
        }));
      }
    } catch (e: any) {
      // Token might be invalid — return settings without Xero data
      await logToErrorDb(accountId, `Xero fetch accounts/tax failed: ${e.message}`);
    }

    return NextResponse.json({
      settings: conn.settings || {},
      org_name: conn.org_name,
      local_taxes: localTaxes ?? [],
      xero_accounts: xeroAccounts,
      xero_tax_rates: xeroTaxRates,
    });
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero settings GET error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

/** POST /api/integrations/xero/settings — update sync preferences */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();

    const ALLOWED_KEYS = [
      "sync_mode", "auto_push",
      "sales_account_code", "cash_account_code", "card_account_code",
      "tips_account_code", "discount_account_code", "rounding_account_code",
      "cash_variance_account_code", "tax_mappings",
    ];

    const settings: Record<string, any> = {};
    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) settings[key] = body[key];
    }

    // Merge with existing settings
    const { data: existing } = await getDb()
      .from("integration_connection")
      .select("settings")
      .eq("account_id", accountId)
      .eq("provider", "xero")
      .single();

    const merged = { ...(existing?.settings || {}), ...settings };

    const { data, error } = await getDb()
      .from("integration_connection")
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq("account_id", accountId)
      .eq("provider", "xero")
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ connection: data });
  } catch (e: any) {
    await logToErrorDb(accountId, `Xero settings error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
