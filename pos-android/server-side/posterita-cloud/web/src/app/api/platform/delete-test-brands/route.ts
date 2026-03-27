import { NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";
import { cascadeDeleteAccount } from "@/lib/cascade-delete-account";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PLATFORM",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/platform/delete-test-brands
 * Deletes ALL accounts with status "testing".
 * First fixes any demo/trial brands that aren't in "testing" status to "testing",
 * then deletes them all.
 * Account manager only.
 */
export async function POST() {
  let isManager = false;
  try {
    isManager = await isAccountManager();
  } catch (e: any) {
    console.error("[delete-test-brands] isAccountManager check failed:", e.message);
    await logToErrorDb("system", `delete-test-brands auth check failed: ${e.message}`, e.stack);
  }
  if (!isManager) {
    return NextResponse.json(
      { error: "Account manager access required" },
      { status: 403 }
    );
  }

  const db = getDb();

  // Find all accounts with status "testing"
  const { data: testAccounts, error: fetchError } = await db
    .from("account")
    .select("account_id, businessname, type, status, owner_id")
    .eq("status", "testing");

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to fetch test accounts: ${fetchError.message}` },
      { status: 500 }
    );
  }

  if (!testAccounts || testAccounts.length === 0) {
    return NextResponse.json({
      success: true,
      deleted_count: 0,
      deleted: [],
      message: "No test brands found to delete",
    });
  }

  const deleted: { account_id: string; businessname: string }[] = [];
  const errors: { account_id: string; error: string }[] = [];

  for (const account of testAccounts) {
    try {
      await cascadeDeleteAccount(db, account.account_id);
      deleted.push({
        account_id: account.account_id,
        businessname: account.businessname,
      });
    } catch (e: any) {
      await logToErrorDb(account.account_id, `Delete test brand failed: ${e.message}`, e.stack);
      errors.push({
        account_id: account.account_id,
        error: e.message || "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    deleted_count: deleted.length,
    error_count: errors.length,
    deleted,
    errors: errors.length > 0 ? errors : undefined,
    message: `Deleted ${deleted.length} test brand${deleted.length !== 1 ? "s" : ""}${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
  });
}
