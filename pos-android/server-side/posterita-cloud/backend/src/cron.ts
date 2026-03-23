import cron from "node-cron";
import { getDb, logError } from "./db";

/**
 * Background cron jobs that run on Render (not possible on Vercel serverless).
 */
export function startCronJobs() {
  console.log("[cron] Starting background jobs");

  // Every hour: check for FATAL errors and log alert
  cron.schedule("0 * * * *", async () => {
    try {
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: fatals } = await getDb()
        .from("error_logs")
        .select("id, tag, message")
        .eq("severity", "FATAL")
        .eq("status", "open")
        .gte("created_at", hourAgo);

      if (fatals && fatals.length > 0) {
        console.error(`[cron] ⚠️ ${fatals.length} FATAL error(s) in the last hour!`);
        for (const f of fatals) {
          console.error(`  - [${f.tag}] ${f.message}`);
        }
        // TODO: Send WhatsApp/Slack alert when configured
      }
    } catch (err: any) {
      console.error("[cron] Error check failed:", err.message);
    }
  });

  // Every 6 hours: auto-close stale errors older than 30 days
  cron.schedule("0 */6 * * *", async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count } = await getDb()
        .from("error_logs")
        .update({ status: "ignored" }, { count: "exact" })
        .eq("status", "open")
        .lt("created_at", thirtyDaysAgo);

      if (count && count > 0) {
        console.log(`[cron] Auto-ignored ${count} errors older than 30 days`);
      }
    } catch (err: any) {
      console.error("[cron] Stale error cleanup failed:", err.message);
    }
  });

  // Daily at midnight: purge sync_request_log entries older than 90 days
  cron.schedule("0 0 * * *", async () => {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
      const { count } = await getDb()
        .from("sync_request_log")
        .delete({ count: "exact" })
        .lt("request_at", ninetyDaysAgo);

      if (count && count > 0) {
        console.log(`[cron] Purged ${count} sync logs older than 90 days`);
      }
    } catch (err: any) {
      console.error("[cron] Sync log cleanup failed:", err.message);
    }
  });
}
