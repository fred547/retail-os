import { NextResponse } from "next/server";
import { getSuperAdminInfo } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "ADMIN",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

export async function GET() {
  try {
    const info = await getSuperAdminInfo();

    if (!info) {
      return NextResponse.json({ is_super_admin: false });
    }

    return NextResponse.json({
      is_super_admin: true,
      is_account_manager: true,
      email: info.email,
      name: info.name,
      impersonating: info.impersonating,
    });
  } catch (error: any) {
    console.error("Super admin status check failed:", error);
    await logToErrorDb("system", `Super admin status check failed: ${error.message}`, error.stack);
    return NextResponse.json({ is_super_admin: false });
  }
}
