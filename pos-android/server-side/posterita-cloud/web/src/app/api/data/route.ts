import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";
import { getEffectivePlan, getRetentionDays } from "@/lib/billing";

export const dynamic = "force-dynamic";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "DATA",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * Data proxy API — allows client-side pages to query Supabase
 * through the service role key (bypassing RLS).
 *
 * SECURITY: Automatically injects account_id filter from the user's
 * session context. Client-supplied account_id filters are verified
 * against the session to prevent cross-account data leaks.
 *
 * Usage: POST /api/data
 * Body: { table, select, filters, order, limit, range }
 */

interface DataQuery {
  table: string;
  select?: string;
  filters?: { column: string; op: string; value: any }[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: [number, number];
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

// Whitelist of allowed tables to prevent abuse
const ALLOWED_TABLES = new Set([
  "account", "product", "productcategory", "orders", "orderline",
  "payment", "tax", "store", "terminal", "customer", "till",
  "till_adjustment", "hold_order", "restaurant_table", "preference",
  "modifier", "pos_user", "printer", "sync_log", "ai_import_job",
  "error_log", "discountcode",
  "v_daily_sales", "v_hourly_sales", "v_payment_methods",
  "v_platform_overview", "v_price_review", "v_terminal_status",
  "v_top_products",
  "intake_batch", "intake_item",
  "table_section", "preparation_station", "category_station_mapping",
  "inventory_count_session", "inventory_count_entry",
  "error_logs", "sync_inbox",
  "account_tax_config", "loyalty_config", "loyalty_wallet", "loyalty_transaction",
  "promotion", "menu_schedule", "shift", "delivery", "driver_shift",
  "serial_item", "supplier", "purchase_order", "purchase_order_line",
  "tag_group", "tag", "product_tag", "customer_tag", "order_tag",
  "quotation", "quotation_line",
  "webhook_subscription", "webhook_log",
  "staff_schedule", "staff_break", "leave_type", "leave_request", "leave_balance",
  "v_staff_performance",
  // SECURITY: "owner" removed — contains all owners' emails/phones, must go through /api/owner/[id]
]);

// Tables that don't have account_id column (skip auto-injection)
const NO_ACCOUNT_ID_TABLES = new Set([
  "v_platform_overview",
  // "owner" removed from allowed tables — no longer needs skip
  "orderline",       // linked via order_id FK, no own account_id
  "payment",         // linked via order_id FK, no own account_id
  "till_adjustment",  // linked via till_id FK, no own account_id
]);

// Tables with soft-delete (is_deleted column) — auto-filter unless client explicitly includes deleted
const SOFT_DELETE_TABLES = new Set([
  "product", "store", "terminal", "pos_user", "customer", "productcategory", "orders",
]);

// Sensitive tables where is_deleted=false is ALWAYS enforced (client cannot query deleted records)
const FORCE_SOFT_DELETE_TABLES = new Set(["pos_user", "orders"]);

// Historical/transactional tables subject to plan-based retention limits
const RETENTION_TABLES = new Set([
  "orders", "orderline", "payment", "till", "error_logs",
  "sync_request_log", "billing_event",
]);

// Retention date column per table (defaults to created_at)
const RETENTION_DATE_COLUMN: Record<string, string> = {
  orders: "created_at",
  orderline: "created_at",
  payment: "created_at",
  till: "created_at",
  error_logs: "created_at",
  sync_request_log: "request_at",
  billing_event: "created_at",
};

export async function POST(req: NextRequest) {
  try {
    // Resolve session account_id for security scoping
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const queries: DataQuery[] = await req.json();
    const queryList = Array.isArray(queries) ? queries : [queries];

    if (queryList.length > 20) {
      return NextResponse.json({ error: "Max 20 queries per batch" }, { status: 400 });
    }

    // Resolve effective plan + retention days once for all queries in the batch
    let retentionDays = 90; // default
    try {
      const effective = await getEffectivePlan(accountId);
      retentionDays = await getRetentionDays(effective.plan);
    } catch (_) { /* fallback to default */ }

    const results = await Promise.all(
      queryList.map(async (q) => {
        if (!ALLOWED_TABLES.has(q.table)) {
          return { data: null, error: `Table '${q.table}' not allowed`, count: 0 };
        }

        // Verify any client-supplied account_id filter matches the session
        if (q.filters) {
          const accountFilter = q.filters.find((f) => f.column === "account_id" && f.op === "eq");
          if (accountFilter && accountFilter.value !== accountId) {
            return { data: null, error: "Account ID mismatch", count: 0 };
          }
        }

        let query = getDb()
          .from(q.table)
          .select(q.select ?? "*", {
            count: q.count as any,
            head: q.head ?? false,
          });

        // Auto-inject account_id filter (unless table doesn't have one)
        if (!NO_ACCOUNT_ID_TABLES.has(q.table)) {
          const hasAccountFilter = q.filters?.some((f) => f.column === "account_id");
          if (!hasAccountFilter) {
            query = query.eq("account_id", accountId);
          }
        }

        // Auto-filter soft-deleted records (unless client explicitly filters is_deleted)
        if (SOFT_DELETE_TABLES.has(q.table)) {
          if (FORCE_SOFT_DELETE_TABLES.has(q.table)) {
            // Always enforce — client cannot query deleted users or orders
            query = query.eq("is_deleted", false);
          } else {
            const hasDeletedFilter = q.filters?.some((f) => f.column === "is_deleted");
            if (!hasDeletedFilter) {
              query = query.eq("is_deleted", false);
            }
          }
        }

        // Plan-based retention filter for historical/transactional tables
        if (RETENTION_TABLES.has(q.table)) {
          const dateCol = RETENTION_DATE_COLUMN[q.table] ?? "created_at";
          // Only apply if client hasn't already set a date filter on the retention column
          const hasDateFilter = q.filters?.some((f) => f.column === dateCol && (f.op === "gte" || f.op === "gt"));
          if (!hasDateFilter) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - retentionDays);
            query = query.gte(dateCol, cutoff.toISOString());
          }
        }

        if (q.filters) {
          for (const f of q.filters) {
            switch (f.op) {
              case "eq": query = query.eq(f.column, f.value); break;
              case "neq": query = query.neq(f.column, f.value); break;
              case "gt": query = query.gt(f.column, f.value); break;
              case "gte": query = query.gte(f.column, f.value); break;
              case "lt": query = query.lt(f.column, f.value); break;
              case "lte": query = query.lte(f.column, f.value); break;
              case "like": query = query.like(f.column, f.value); break;
              case "ilike": query = query.ilike(f.column, f.value); break;
              // SECURITY: "or" filter removed — can bypass account_id scoping
            }
          }
        }

        if (q.order) {
          query = query.order(q.order.column, { ascending: q.order.ascending ?? true });
        }

        if (q.limit) {
          query = query.limit(q.limit);
        }

        if (q.range) {
          query = query.range(q.range[0], q.range[1]);
        }

        const { data, error, count } = await query;
        if (error) {
          // Log query errors to error_logs table for debugging
          console.error(`[DataProxy] ${q.table}: ${error.message}`);
          try {
            await getDb().from("error_logs").insert({
              account_id: accountId,
              severity: "ERROR",
              tag: "DataProxy",
              message: `Query failed on '${q.table}': ${error.message}`.substring(0, 2000),
              device_info: "web_server",
              app_version: "web",
            });
          } catch (_) {}
        }
        return { data, error: error?.message ?? null, count };
      })
    );

    // If single query, return single result
    if (!Array.isArray(queries)) {
      return NextResponse.json(results[0]);
    }
    return NextResponse.json(results);
  } catch (e: any) {
    await logToErrorDb("system", `Data proxy failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
