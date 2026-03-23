import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
  "error_logs",
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

export async function POST(req: NextRequest) {
  try {
    // Resolve session account_id for security scoping
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const queries: DataQuery[] = await req.json();
    const queryList = Array.isArray(queries) ? queries : [queries];

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
          const hasDeletedFilter = q.filters?.some((f) => f.column === "is_deleted");
          if (!hasDeletedFilter) {
            query = query.eq("is_deleted", false);
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
