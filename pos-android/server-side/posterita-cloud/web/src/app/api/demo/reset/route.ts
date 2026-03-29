import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET || process.env.DEMO_RESET_SECRET;

async function logDemoError(message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: "system",
      severity: "ERROR",
      tag: "DEMO_POOL",
      message,
      stack_trace: stackTrace ?? null,
      device_info: "web-api",
      app_version: "web",
    });
  } catch (_) {
    /* swallow */
  }
}

/**
 * POST /api/demo/reset — Reset expired/released demo accounts.
 *
 * Protected by CRON_SECRET header. Called periodically by cron.
 * Finds all accounts that are expired AND have no heartbeat for 15 min,
 * or are in resetting state. Deletes transactional data, re-seeds sample
 * data from the template, and marks them available again.
 */
export async function POST(req: NextRequest) {
  // Auth: require secret header or allow from Vercel Cron
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-vercel-cron");

  if (!cronHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  try {
    // Find accounts to reset:
    // 1. Claimed, expired, AND no heartbeat for 15 minutes
    // 2. Marked as resetting (released by user)
    const { data: toReset, error: findError } = await db
      .from("demo_pool")
      .select("id, account_id, template_id")
      .or(`and(status.eq.claimed,expires_at.lt.${now},heartbeat_at.lt.${fifteenMinAgo}),status.eq.resetting`);

    if (findError) {
      await logDemoError(`Failed to find accounts to reset: ${findError.message}`);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!toReset || toReset.length === 0) {
      return NextResponse.json({ reset_count: 0, message: "No accounts to reset" });
    }

    let resetCount = 0;
    const errors: string[] = [];

    for (const pool of toReset) {
      try {
        await resetAccountData(db, pool.account_id);

        // Re-seed with sample data from the template
        if (pool.template_id) {
          await reseedFromTemplate(db, pool.account_id, pool.template_id);
        }

        // Mark as available again
        const { error: updateError } = await db
          .from("demo_pool")
          .update({
            status: "available",
            claimed_at: null,
            claimed_by_ip: null,
            session_token: null,
            expires_at: null,
            heartbeat_at: null,
            last_reset_at: now,
          })
          .eq("id", pool.id);

        if (updateError) {
          errors.push(`${pool.account_id}: update failed - ${updateError.message}`);
        } else {
          resetCount++;
        }
      } catch (e: any) {
        errors.push(`${pool.account_id}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      await logDemoError(`Demo reset partial failure: ${errors.join("; ")}`);
    }

    return NextResponse.json({
      reset_count: resetCount,
      total_found: toReset.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    await logDemoError(`Demo reset error: ${e.message}`, e.stack);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}

/**
 * Delete transactional data for a demo account, preserving master data
 * (products, categories, taxes, modifiers, store, terminal, users).
 */
async function resetAccountData(db: any, accountId: string) {
  // Delete in FK order: most dependent first
  const tables = [
    // Order-related
    { table: "order_tag", column: "account_id" },
    { table: "payment", column: "account_id" },
    { table: "orderline", column: "account_id" },
    { table: "orders", column: "account_id" },

    // Till-related
    { table: "till", column: "account_id" },

    // Shift-related
    { table: "shift", column: "account_id" },

    // Customer-related
    { table: "customer_tag", column: "account_id" },
    { table: "loyalty_transaction", column: "account_id" },
    { table: "loyalty_wallet", column: "account_id" },
    { table: "customer", column: "account_id" },

    // Error logs
    { table: "error_logs", column: "account_id" },

    // Sync logs
    { table: "sync_request_log", column: "account_id" },

    // Quotation-related
    { table: "quotation_line", column: "account_id" },
    { table: "quotation", column: "account_id" },

    // Delivery-related
    { table: "delivery", column: "account_id" },

    // Serial items (transactional)
    { table: "serial_item", column: "account_id" },

    // Inventory sessions
    { table: "inventory_count_line", column: "account_id" },
    { table: "inventory_count_session", column: "account_id" },

    // Stock journal
    { table: "stock_journal", column: "account_id" },
  ];

  for (const { table, column } of tables) {
    try {
      await db.from(table).delete().eq(column, accountId);
    } catch (_) {
      // Some tables may not exist — that's fine, skip
    }
  }
}

/**
 * Re-seed a demo account with sample orders and customers from its template.
 * The template's `products` JSONB contains the product_ids to use in order lines.
 */
async function reseedFromTemplate(db: any, accountId: string, templateId: string) {
  try {
    // Fetch template data
    const { data: template } = await db
      .from("demo_pool_template")
      .select("products, sample_customers, sample_orders")
      .eq("id", templateId)
      .single();

    if (!template) return;

    // Get store and terminal for context
    const { data: store } = await db
      .from("store")
      .select("store_id")
      .eq("account_id", accountId)
      .eq("isactive", true)
      .limit(1)
      .single();

    const storeId = store?.store_id;
    if (!storeId) return;

    const { data: terminal } = await db
      .from("terminal")
      .select("terminal_id")
      .eq("account_id", accountId)
      .eq("store_id", storeId)
      .limit(1)
      .single();

    const terminalId = terminal?.terminal_id;

    const { data: user } = await db
      .from("pos_user")
      .select("user_id")
      .eq("account_id", accountId)
      .eq("role", "owner")
      .limit(1)
      .single();

    const userId = user?.user_id;

    // Parse product list from template
    const products: Array<{ product_id: number; name: string; price: number }> =
      Array.isArray(template.products) ? template.products : [];

    if (products.length === 0) return;

    // Seed customers (10)
    const sampleCustomers: Array<{ name: string; email: string; phone?: string }> =
      Array.isArray(template.sample_customers) ? template.sample_customers : [];

    const customerIds: number[] = [];
    for (const cust of sampleCustomers.slice(0, 10)) {
      try {
        const { data: inserted } = await db
          .from("customer")
          .insert({
            account_id: accountId,
            name: cust.name,
            email: cust.email,
            phone: cust.phone ?? null,
          })
          .select("customer_id")
          .single();
        if (inserted) customerIds.push(inserted.customer_id);
      } catch (_) {
        // Skip duplicates
      }
    }

    // Seed orders (30)
    const orderCount = 30;
    const now = Date.now();

    for (let i = 0; i < orderCount; i++) {
      try {
        // Spread orders over the last 7 days
        const orderDate = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();

        // Pick 1-4 random products per order
        const lineCount = Math.floor(Math.random() * 4) + 1;
        const orderProducts: Array<{ product_id: number; name: string; price: number; qty: number }> = [];

        for (let j = 0; j < lineCount; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 3) + 1;
          orderProducts.push({ ...product, qty });
        }

        const grandTotal = orderProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
        const customerId = customerIds.length > 0
          ? customerIds[Math.floor(Math.random() * customerIds.length)]
          : null;

        const documentNo = `DEMO-${String(i + 1).padStart(4, "0")}`;
        const orderUuid = crypto.randomUUID();

        const { data: order } = await db
          .from("orders")
          .insert({
            account_id: accountId,
            store_id: storeId,
            terminal_id: terminalId ?? null,
            user_id: userId ?? null,
            customer_id: customerId,
            document_no: documentNo,
            uuid: orderUuid,
            grand_total: Math.round(grandTotal * 100) / 100,
            status: "completed",
            created_at: orderDate,
            updated_at: orderDate,
          })
          .select("order_id")
          .single();

        if (!order) continue;

        // Insert order lines
        const lines = orderProducts.map((p, idx) => ({
          order_id: order.order_id,
          account_id: accountId,
          product_id: p.product_id,
          qtyentered: p.qty,
          priceentered: p.price,
          lineamt: Math.round(p.price * p.qty * 100) / 100,
          linenetamt: Math.round(p.price * p.qty * 100) / 100,
          line_no: (idx + 1) * 10,
        }));

        await db.from("orderline").insert(lines);

        // Insert payment
        await db.from("payment").insert({
          order_id: order.order_id,
          account_id: accountId,
          amount: Math.round(grandTotal * 100) / 100,
          payment_method: Math.random() > 0.4 ? "cash" : "card",
          created_at: orderDate,
        });
      } catch (_) {
        // Skip failed orders
      }
    }
  } catch (_) {
    // Template seeding is best-effort — don't fail the reset
  }
}
