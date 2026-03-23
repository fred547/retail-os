import { createClient } from "@supabase/supabase-js";

export function getDb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Log an error to the error_logs table.
 */
export async function logError(
  tag: string,
  message: string,
  severity: "FATAL" | "ERROR" | "WARN" | "INFO" = "ERROR",
  extra?: { stackTrace?: string; accountId?: string }
) {
  try {
    await getDb().from("error_logs").insert({
      account_id: extra?.accountId || "system",
      severity,
      tag,
      message: message.substring(0, 2000),
      stack_trace: extra?.stackTrace?.substring(0, 5000) || null,
      device_info: "render_backend",
      app_version: process.env.npm_package_version || "1.0.0",
    });
  } catch (_) {
    console.error(`[error-logger] Failed to log: ${tag}: ${message}`);
  }
}
