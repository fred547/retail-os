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

  // Every 15 minutes: retry pending MRA e-invoice submissions
  cron.schedule("*/15 * * * *", async () => {
    try {
      // Find orders that need MRA filing (pending or failed, not exempt)
      const { data: pendingOrders } = await getDb()
        .from("orders")
        .select("order_id, account_id")
        .in("mra_status", ["pending", "failed"])
        .order("date_ordered", { ascending: true })
        .limit(10); // batch of 10 to avoid overloading MRA

      if (!pendingOrders || pendingOrders.length === 0) return;

      // Check which accounts have MRA enabled
      const accountIds = [...new Set(pendingOrders.map((o: any) => o.account_id))];
      const { data: taxConfigs } = await getDb()
        .from("account_tax_config")
        .select("account_id")
        .in("account_id", accountIds)
        .eq("is_enabled", true);

      const enabledAccounts = new Set((taxConfigs || []).map((c: any) => c.account_id));
      const toSubmit = pendingOrders.filter((o: any) => enabledAccounts.has(o.account_id));

      if (toSubmit.length === 0) {
        // Mark non-enabled orders as exempt
        const exemptIds = pendingOrders
          .filter((o: any) => !enabledAccounts.has(o.account_id))
          .map((o: any) => o.order_id);
        if (exemptIds.length > 0) {
          await getDb()
            .from("orders")
            .update({ mra_status: "exempt" })
            .in("order_id", exemptIds);
        }
        return;
      }

      console.log(`[cron] MRA retry: ${toSubmit.length} pending invoice(s)`);

      // Submit each via the backend's own webhook
      const backendUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3001}`;
      for (const order of toSubmit) {
        try {
          const res = await fetch(`${backendUrl}/webhook/mra/submit-invoice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_id: order.account_id, order_id: order.order_id }),
          });
          const result = await res.json();
          console.log(`[cron] MRA order ${order.order_id}: ${result.status || result.error}`);
        } catch (e: any) {
          console.error(`[cron] MRA order ${order.order_id} failed: ${e.message}`);
        }
      }
    } catch (err: any) {
      console.error("[cron] MRA retry failed:", err.message);
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
