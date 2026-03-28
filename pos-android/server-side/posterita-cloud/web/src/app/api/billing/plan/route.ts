import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getEffectivePlan, getPlanConstraints, getRetentionDays, getPlanLimit } from "@/lib/billing";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "BILLING_PLAN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * GET /api/billing/plan
 * Returns the effective plan + all constraints for the current account.
 * Used by the frontend to gate features in the sidebar and UI.
 */
export async function GET() {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [effective, allConstraints, accountResult] = await Promise.all([
      getEffectivePlan(accountId),
      getPlanConstraints(),
      getDb()
        .from("account")
        .select("country_code")
        .eq("account_id", accountId)
        .maybeSingle(),
    ]);

    const planConstraints = allConstraints[effective.plan] ?? {};

    // Extract numeric limits for convenience
    const maxUsers = parseInt(planConstraints["max_users"] ?? "2", 10);
    const maxTerminals = parseInt(planConstraints["max_terminals"] ?? "2", 10);
    const retentionDays = parseInt(planConstraints["retention_days"] ?? "90", 10);

    // Fetch country-specific modules (e.g., mra_einvoicing for Mauritius)
    const countryCode = accountResult?.data?.country_code ?? null;
    let countryModules: string[] = [];
    if (countryCode) {
      const { data: cc } = await getDb()
        .from("country_config")
        .select("modules")
        .eq("country_code", countryCode)
        .maybeSingle();
      if (cc?.modules && Array.isArray(cc.modules)) {
        countryModules = cc.modules;
      }
    }

    return NextResponse.json({
      plan: effective.plan,
      isTrial: effective.isTrial,
      trialEndsAt: effective.trialEndsAt,
      constraints: planConstraints,
      limits: {
        max_users: maxUsers,
        max_terminals: maxTerminals,
        retention_days: retentionDays,
      },
      country_code: countryCode,
      country_modules: countryModules,
    });
  } catch (e: any) {
    await logToErrorDb("system", `Billing plan GET failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
