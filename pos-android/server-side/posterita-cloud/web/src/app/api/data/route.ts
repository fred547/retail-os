import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

/**
 * Data proxy API — allows client-side pages to query Supabase
 * through the service role key (bypassing RLS).
 *
 * This is necessary because the web dashboard doesn't have per-user
 * Supabase Auth sessions yet. Auth is handled by Next.js middleware.
 *
 * Usage: POST /api/data
 * Body: { table, select, filters, order, limit, range }
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  "v_daily_sales", "v_hourly_sales", "v_payment_methods",
  "v_platform_overview", "v_price_review", "v_terminal_status",
  "v_top_products",
]);

export async function POST(req: NextRequest) {
  try {
    const queries: DataQuery[] = await req.json();
    const queryList = Array.isArray(queries) ? queries : [queries];

    const results = await Promise.all(
      queryList.map(async (q) => {
        if (!ALLOWED_TABLES.has(q.table)) {
          return { data: null, error: `Table '${q.table}' not allowed`, count: 0 };
        }

        let query = supabase
          .from(q.table)
          .select(q.select ?? "*", {
            count: q.count as any,
            head: q.head ?? false,
          });

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
              case "or": query = query.or(f.value); break;
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
