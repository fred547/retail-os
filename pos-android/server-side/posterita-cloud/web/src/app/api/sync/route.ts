import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export const maxDuration = 30;

/**
 * Sync API version — increment when making breaking changes to the sync protocol.
 * Android checks this against its expected version and warns/blocks if mismatched.
 *
 * History:
 *   1 — initial sync protocol
 *   2 — added soft delete, device registration, inventory count, server-assigned IDs
 */
const SYNC_API_VERSION = 2;
const MIN_CLIENT_VERSION = 1; // oldest client version we still accept

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface SyncRequest {
  account_id: string;
  terminal_id: number;
  store_id: number;
  last_sync_at: string;
  // Client version — for compatibility checking
  client_sync_version?: number;
  // Device registration
  device_id?: string;
  device_name?: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
  // Push: terminal → cloud (transactional)
  orders?: any[];
  order_lines?: any[];
  payments?: any[];
  tills?: any[];
  till_adjustments?: any[];
  customers?: any[];
  // Push: terminal → cloud (master data)
  stores?: any[];
  terminals?: any[];
  users?: any[];
  categories?: any[];
  products?: any[];
  taxes?: any[];
  // Push: restaurant tables
  restaurant_tables?: any[];
  // Push: inventory count entries
  inventory_count_entries?: any[];
  // Push: error logs for remote debugging
  error_logs?: any[];
}

/**
 * Insert-first helper for tables where `uuid` has no unique constraint
 * (so Supabase upsert cannot be used).
 *
 * Strategy: attempt INSERT first. If it fails with a duplicate-key error
 * (Postgres 23505), fall back to UPDATE. This is more robust than the
 * previous select-then-insert pattern which had a TOCTOU race window.
 */
async function insertOrUpdate(
  table: string,
  record: Record<string, any>,
  uuidValue: string
): Promise<{ error: any }> {
  // Try INSERT first
  const insertResult = await getDb().from(table).insert(record);

  if (insertResult.error) {
    const code = (insertResult.error as any).code;
    const msg = insertResult.error.message || "";
    // Postgres unique-violation or duplicate key → fall back to UPDATE
    if (code === "23505" || msg.includes("duplicate")) {
      const updateResult = await getDb()
        .from(table)
        .update(record)
        .eq("uuid", uuidValue);
      return { error: updateResult.error };
    }
    return { error: insertResult.error };
  }

  return { error: null };
}

/**
 * Multi-tenant safe upsert: checks if the PK exists for THIS account.
 * - If it exists and belongs to this account → UPDATE
 * - If it exists but belongs to another account → skip (log error)
 * - If it doesn't exist → INSERT
 *
 * This prevents cross-tenant PK collisions when multiple accounts
 * share the same auto-incrementing IDs (e.g. store_id=1 for two accounts).
 */
async function tenantUpsert(
  table: string,
  record: Record<string, any>,
  pkColumn: string,
  pkValue: number | string,
  accountId: string
): Promise<{ error: any }> {
  // Check if record exists at all
  const { data: existing } = await (getDb()
    .from(table) as any)
    .select(`${pkColumn}, account_id`)
    .eq(pkColumn, pkValue)
    .maybeSingle();

  if (existing) {
    if (existing.account_id !== accountId) {
      // PK collision with another account — skip
      return { error: { message: `PK ${pkValue} belongs to another account, skipped` } };
    }
    // Same account → update
    const { error } = await getDb()
      .from(table)
      .update(record)
      .eq(pkColumn, pkValue)
      .eq("account_id", accountId);
    return { error };
  }

  // Doesn't exist → insert
  const { error } = await getDb().from(table).insert(record);
  if (error) {
    const code = (error as any).code;
    // Handle race condition: another sync inserted between our check and insert
    if (code === "23505") {
      const { error: updateErr } = await getDb()
        .from(table)
        .update(record)
        .eq(pkColumn, pkValue)
        .eq("account_id", accountId);
      return { error: updateErr };
    }
    return { error };
  }
  return { error: null };
}

export async function POST(req: NextRequest) {
  try {
    const body: SyncRequest = await req.json();

    // Check client sync version compatibility
    const clientVersion = body.client_sync_version ?? 1;
    if (clientVersion < MIN_CLIENT_VERSION) {
      return NextResponse.json(
        {
          error: "Your app is outdated. Please update to continue syncing.",
          code: "CLIENT_TOO_OLD",
          server_sync_version: SYNC_API_VERSION,
          min_client_version: MIN_CLIENT_VERSION,
        },
        { status: 426 } // 426 Upgrade Required
      );
    }

    // Validate required fields
    if (!body.account_id || body.account_id === "null" || !body.terminal_id) {
      return NextResponse.json(
        { error: "Valid account_id and terminal_id are required" },
        { status: 400 }
      );
    }

    // ========================================
    // HMAC-SHA256 sync authentication
    // ========================================
    const syncTimestamp = req.headers.get("x-sync-timestamp");
    const syncSignature = req.headers.get("x-sync-signature");
    const requireAuth = process.env.REQUIRE_SYNC_AUTH === "true";

    if (syncTimestamp && syncSignature) {
      // Validate timestamp is within 300 seconds
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(syncTimestamp, 10);
      if (isNaN(ts) || Math.abs(now - ts) > 300) {
        return NextResponse.json(
          { error: "Sync timestamp expired or invalid" },
          { status: 401 }
        );
      }

      // Look up sync_secret for this account
      const { data: secretRow } = await getDb()
        .from("account")
        .select("sync_secret")
        .eq("account_id", body.account_id)
        .single();

      const secret = secretRow?.sync_secret;
      if (secret) {
        const expectedPayload = `${body.account_id}:${syncTimestamp}`;
        const expectedSig = createHmac("sha256", secret)
          .update(expectedPayload)
          .digest("hex");

        // Constant-time comparison
        const sigBuf = Buffer.from(syncSignature, "hex");
        const expectedBuf = Buffer.from(expectedSig, "hex");
        if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
          return NextResponse.json(
            { error: "Invalid sync signature" },
            { status: 401 }
          );
        }
      } else if (requireAuth) {
        return NextResponse.json(
          { error: "Account has no sync secret configured" },
          { status: 401 }
        );
      }
    } else if (requireAuth) {
      return NextResponse.json(
        { error: "Sync authentication required (missing x-sync-timestamp / x-sync-signature headers)" },
        { status: 401 }
      );
    } else if (!syncTimestamp && !syncSignature) {
      // No auth headers — log warning but allow through
      console.warn(`[sync] Unauthenticated sync request from account ${body.account_id}`);
    }

    // Verify account exists — auto-create if missing (defensive: handles
    // cases where registration was marked done on the client but never
    // reached the cloud, e.g. network timeout after server committed).
    const { data: account } = await getDb()
      .from("account")
      .select("account_id")
      .eq("account_id", body.account_id)
      .single();

    if (!account) {
      const { error: createErr } = await getDb().from("account").insert({
        account_id: body.account_id,
        businessname: body.account_id, // placeholder — will be updated on next register call
        currency: "MUR",
        isactive: "Y",
      });
      if (createErr) {
        // Only fail if it's not a duplicate (another request created it concurrently)
        const code = (createErr as any).code;
        if (code !== "23505") {
          return NextResponse.json(
            { error: "Failed to auto-create account" },
            { status: 500 }
          );
        }
      }
    }

    // Register/update device if device_id provided
    if (body.device_id) {
      await getDb().from("registered_device").upsert({
        device_id: body.device_id,
        account_id: body.account_id,
        device_name: body.device_name || null,
        device_model: body.device_model || null,
        os_version: body.os_version || null,
        app_version: body.app_version || null,
        terminal_id: body.terminal_id,
        last_sync_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "device_id,account_id" });
    }

    const requestStart = Date.now();
    const errors: string[] = [];
    let ordersSynced = 0;
    let orderLinesSynced = 0;
    let paymentsSynced = 0;
    let tillsSynced = 0;
    let storesSynced = 0;
    let terminalsSynced = 0;
    let usersSynced = 0;
    let categoriesSynced = 0;
    let productsSynced = 0;
    let taxesSynced = 0;
    let tablesSynced = 0;
    let inventoryEntriesSynced = 0;
    let errorLogsSynced = 0;

    // ========================================
    // PUSH: Error logs (before everything else — fire-and-forget)
    // ========================================
    if (body.error_logs?.length) {
      for (const log of body.error_logs) {
        try {
          const { error } = await getDb().from("error_logs").insert({
            account_id: body.account_id,
            timestamp: log.timestamp ?? 0,
            severity: log.severity ?? "ERROR",
            tag: log.tag ?? "",
            message: log.message ?? "",
            stacktrace: log.stacktrace,
            screen: log.screen,
            user_id: log.user_id ?? 0,
            user_name: log.user_name,
            store_id: log.store_id ?? body.store_id,
            terminal_id: log.terminal_id ?? body.terminal_id,
            device_id: log.device_id,
            app_version: log.app_version,
            os_version: log.os_version,
          });
          if (!error) errorLogsSynced++;
        } catch (e: any) {
          // Don't fail sync for error log issues
          console.warn("Error log insert failed:", e.message);
        }
      }
    }

    // ========================================
    // PUSH: Terminal → Cloud
    // (Order matters: tills before orders due to FK constraints)
    // ========================================

    // Sync tills FIRST (orders reference till_id via FK)
    if (body.tills?.length) {
      for (const till of body.tills) {
        try {
          // NOTE: Use ?? (nullish coalescing) for ALL numeric fields.
          // Using || would coerce 0 (a valid financial value) to falsy and apply the fallback.
          const dbTill = {
            till_id: till.tillId ?? till.till_id,
            account_id: body.account_id,
            store_id: till.store_id ?? till.storeId ?? body.store_id,
            terminal_id: till.terminal_id ?? till.terminalId ?? body.terminal_id,
            open_by: till.openBy ?? till.open_by ?? 0,
            close_by: till.closeBy ?? till.close_by ?? 0,
            opening_amt: till.openingAmt ?? till.opening_amt ?? 0,
            closing_amt: till.closingAmt ?? till.closing_amt ?? 0,
            date_opened: till.dateOpened || till.date_opened,
            date_closed: till.dateClosed || till.date_closed,
            json_data: till.json || till.json_data,
            is_sync: true,
            uuid: till.uuid,
            documentno: till.documentno,
            vouchers: till.vouchers,
            adjustment_total: till.adjustmenttotal ?? till.adjustment_total ?? 0,
            cash_amt: till.cashamt ?? till.cash_amt ?? 0,
            card_amt: till.cardamt ?? till.card_amt ?? 0,
            subtotal: till.subtotal ?? 0,
            tax_total: till.taxtotal ?? till.tax_total ?? 0,
            grand_total: till.grandtotal ?? till.grand_total ?? 0,
            forex_currency: till.forexcurrency || till.forex_currency,
            forex_amt: till.forexamt ?? till.forex_amt ?? 0,
          };

          // Insert-first pattern: avoids TOCTOU race on uuid (no unique constraint).
          const { error } = await insertOrUpdate("till", dbTill, till.uuid);

          if (error) {
            errors.push(`Till ${till.uuid}: ${error.message}`);
          } else {
            tillsSynced++;
          }
        } catch (e: any) {
          errors.push(`Till: ${e.message}`);
        }
      }
    }

    // Sync orders (after tills, since orders.till_id references till)
    if (body.orders?.length) {
      for (const order of body.orders) {
        try {
          // Map Android field names to Supabase column names
          // Handle till_id: if till doesn't exist in cloud yet, set to null
          let tillId = order.tillId ?? order.till_id ?? 0;

          const dbOrder: any = {
            order_id: order.orderId ?? order.order_id,
            customer_id: order.customerId ?? order.customer_id ?? 0,
            sales_rep_id: order.salesRepId ?? order.sales_rep_id ?? 0,
            terminal_id: order.terminalId ?? order.terminal_id ?? body.terminal_id,
            store_id: order.storeId ?? order.store_id ?? body.store_id,
            account_id: body.account_id,
            order_type: order.orderType || order.order_type,
            document_no: order.documentNo || order.document_no,
            doc_status: order.docStatus || order.doc_status,
            is_paid: order.isPaid ?? order.is_paid ?? false,
            tax_total: order.taxTotal ?? order.tax_total ?? 0,
            grand_total: order.grandTotal ?? order.grand_total ?? 0,
            qty_total: order.qtyTotal ?? order.qty_total ?? 0,
            subtotal: order.subtotal ?? 0,
            date_ordered: order.dateOrdered || order.date_ordered,
            json_data: order.json || order.json_data,
            is_sync: true,
            uuid: order.uuid,
            currency: order.currency,
            tips: order.tips ?? 0,
            note: order.note,
            couponids: order.couponids,
          };

          // Only set till_id if the till actually exists in the cloud
          // Otherwise omit to avoid FK violation
          if (tillId > 0) {
            const { data: tillExists } = await getDb()
              .from("till")
              .select("till_id")
              .eq("till_id", tillId)
              .single();
            if (tillExists) {
              dbOrder.till_id = tillId;
            }
          }

          // Insert-first pattern: avoids TOCTOU race on uuid (no unique constraint).
          const { error } = await insertOrUpdate("orders", dbOrder, order.uuid);

          if (error) {
            errors.push(`Order ${order.uuid}: ${error.message}`);
          } else {
            ordersSynced++;
          }
        } catch (e: any) {
          errors.push(`Order ${order.uuid}: ${e.message}`);
        }
      }
    }

    // Sync order lines
    if (body.order_lines?.length) {
      for (const line of body.order_lines) {
        try {
          const dbLine = {
            orderline_id: line.orderline_id ?? line.orderLineId,
            order_id: line.order_id ?? line.orderId,
            product_id: line.product_id ?? line.productId,
            productcategory_id: line.productcategory_id ?? line.productCategoryId ?? 0,
            tax_id: line.tax_id ?? line.taxId ?? 0,
            qtyentered: line.qtyentered ?? line.qtyEntered ?? 0,
            lineamt: line.lineamt ?? line.lineAmt ?? 0,
            linenetamt: line.linenetamt ?? line.lineNetAmt ?? 0,
            priceentered: line.priceentered ?? line.priceEntered ?? 0,
            costamt: line.costamt ?? line.costAmt ?? 0,
            productname: line.productname || line.productName,
            productdescription: line.productdescription || line.productDescription,
          };

          const { error } = await getDb()
            .from("orderline")
            .upsert(dbLine, { onConflict: "orderline_id" });

          if (error) {
            errors.push(`OrderLine ${dbLine.orderline_id}: ${error.message}`);
          } else {
            orderLinesSynced++;
          }
        } catch (e: any) {
          errors.push(`OrderLine: ${e.message}`);
        }
      }
    }

    // Sync payments
    if (body.payments?.length) {
      for (const payment of body.payments) {
        try {
          const dbPayment = {
            payment_id: payment.paymentId ?? payment.payment_id,
            order_id: payment.orderId ?? payment.order_id,
            document_no: payment.documentNo || payment.document_no,
            tendered: payment.tendered ?? 0,
            amount: payment.amount ?? 0,
            change: payment.change ?? 0,
            payment_type: payment.paymentType || payment.payment_type,
            date_paid: payment.datePaid || payment.date_paid,
            pay_amt: payment.payAmt ?? payment.pay_amt ?? 0,
            status: payment.status,
            checknumber: payment.checknumber,
            extra_info: payment.extraInfo || payment.extra_info,
          };

          const { error } = await getDb()
            .from("payment")
            .upsert(dbPayment, { onConflict: "payment_id" });

          if (error) {
            errors.push(`Payment ${dbPayment.payment_id}: ${error.message}`);
          } else {
            paymentsSynced++;
          }
        } catch (e: any) {
          errors.push(`Payment: ${e.message}`);
        }
      }
    }

    // Sync till adjustments
    if (body.till_adjustments?.length) {
      try {
        const mapped = body.till_adjustments.map((adj: any) => ({
          ...adj,
          account_id: body.account_id,
        }));
        await getDb().from("till_adjustment").upsert(mapped);
      } catch (e: any) {
        errors.push(`Till adjustments: ${e.message}`);
      }
    }

    // Sync customers created at POS
    if (body.customers?.length) {
      for (const customer of body.customers) {
        try {
          const dbCustomer = {
            customer_id: customer.customer_id ?? customer.customerId,
            account_id: body.account_id,
            name: customer.name,
            identifier: customer.identifier,
            phone1: customer.phone1,
            phone2: customer.phone2,
            mobile: customer.mobile,
            email: customer.email,
            address1: customer.address1,
            address2: customer.address2,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            country: customer.country,
            gender: customer.gender,
            dob: customer.dob,
            regno: customer.regno,
            note: customer.note,
            allowcredit: customer.allowcredit || "N",
            creditlimit: customer.creditlimit ?? customer.credit_limit ?? customer.creditLimit ?? 0,
            creditterm: customer.creditterm ?? 0,
            openbalance: customer.openbalance ?? customer.balance ?? 0,
            isactive: customer.isactive || "Y",
            loyaltypoints: customer.loyaltypoints ?? customer.loyalty_points ?? customer.loyaltyPoints ?? 0,
            discountcode_id: customer.discountcode_id ?? customer.discountcodeId ?? 0,
          };

          const { error } = await tenantUpsert("customer", dbCustomer, "customer_id", dbCustomer.customer_id, body.account_id);

          if (error) {
            errors.push(`Customer ${dbCustomer.customer_id}: ${error.message}`);
          }
        } catch (e: any) {
          errors.push(`Customer: ${e.message}`);
        }
      }
    }

    // ========================================
    // PUSH: Master data (stores, terminals, users, categories, products, taxes)
    // These are upserted by their primary key so the cloud stays in sync
    // with any changes made on the POS terminal.
    // ========================================

    // Sync stores
    if (body.stores?.length) {
      for (const store of body.stores) {
        try {
          const dbStore = {
            store_id: store.store_id ?? store.storeId,
            account_id: body.account_id,
            name: store.name,
            address: store.address,
            city: store.city,
            state: store.state,
            zip: store.zip,
            country: store.country,
            currency: store.currency,
            isactive: store.isactive ?? store.isActive ?? "Y",
          };
          const { error } = await tenantUpsert("store", dbStore, "store_id", dbStore.store_id, body.account_id);
          if (error) {
            errors.push(`Store ${dbStore.store_id}: ${error.message}`);
          } else {
            storesSynced++;
          }
        } catch (e: any) {
          errors.push(`Store: ${e.message}`);
        }
      }
    }

    // Sync terminals
    if (body.terminals?.length) {
      for (const terminal of body.terminals) {
        try {
          const dbTerminal = {
            terminal_id: terminal.terminal_id ?? terminal.terminalId,
            account_id: body.account_id,
            store_id: terminal.store_id ?? terminal.storeId ?? body.store_id,
            name: terminal.name,
            prefix: terminal.prefix,
            sequence: terminal.sequence ?? 0,
            cash_up_sequence: terminal.cash_up_sequence ?? terminal.cashUpSequence ?? 0,
            isactive: terminal.isactive ?? terminal.isActive ?? "Y",
          };
          const { error } = await tenantUpsert("terminal", dbTerminal, "terminal_id", dbTerminal.terminal_id, body.account_id);
          if (error) {
            errors.push(`Terminal ${dbTerminal.terminal_id}: ${error.message}`);
          } else {
            terminalsSynced++;
          }
        } catch (e: any) {
          errors.push(`Terminal: ${e.message}`);
        }
      }
    }

    // Sync users
    if (body.users?.length) {
      for (const user of body.users) {
        try {
          const dbUser = {
            user_id: user.user_id ?? user.userId,
            account_id: body.account_id,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            pin: user.pin,
            role: user.role,
            isadmin: user.isadmin ?? user.isAdmin,
            issalesrep: user.issalesrep ?? user.isSalesRep,
            permissions: user.permissions,
            discountlimit: user.discountlimit ?? user.discountLimit ?? 0,
            isactive: user.isactive ?? user.isActive ?? "Y",
          };
          const { error } = await tenantUpsert("pos_user", dbUser, "user_id", dbUser.user_id, body.account_id);
          if (error) {
            errors.push(`User ${dbUser.user_id}: ${error.message}`);
          } else {
            usersSynced++;
          }
        } catch (e: any) {
          errors.push(`User: ${e.message}`);
        }
      }
    }

    // Sync categories
    if (body.categories?.length) {
      for (const cat of body.categories) {
        try {
          const dbCat = {
            productcategory_id: cat.productcategory_id ?? cat.productCategoryId,
            account_id: body.account_id,
            name: cat.name,
            isactive: cat.isactive ?? cat.isActive ?? "Y",
            display: cat.display,
            position: cat.position ?? 0,
            tax_id: cat.tax_id ?? cat.taxId,
          };
          const { error } = await tenantUpsert("productcategory", dbCat, "productcategory_id", dbCat.productcategory_id, body.account_id);
          if (error) {
            errors.push(`Category ${dbCat.productcategory_id}: ${error.message}`);
          } else {
            categoriesSynced++;
          }
        } catch (e: any) {
          errors.push(`Category: ${e.message}`);
        }
      }
    }

    // Sync products
    if (body.products?.length) {
      for (const prod of body.products) {
        try {
          const dbProduct = {
            product_id: prod.product_id ?? prod.productId,
            account_id: body.account_id,
            name: prod.name,
            description: prod.description,
            sellingprice: prod.sellingprice ?? prod.sellingPrice ?? 0,
            costprice: prod.costprice ?? prod.costPrice ?? 0,
            taxamount: prod.taxamount ?? prod.taxAmount ?? 0,
            tax_id: prod.tax_id ?? prod.taxId ?? 0,
            productcategory_id: prod.productcategory_id ?? prod.productCategoryId ?? 0,
            image: prod.image,
            upc: prod.upc,
            itemcode: prod.itemcode ?? prod.itemCode,
            barcodetype: prod.barcodetype ?? prod.barcodeType,
            isactive: prod.isactive ?? prod.isActive ?? "Y",
            istaxincluded: prod.istaxincluded ?? prod.isTaxIncluded,
            isstock: prod.isstock ?? prod.isStock,
            isvariableitem: prod.isvariableitem ?? prod.isVariableItem,
            iskitchenitem: prod.iskitchenitem ?? prod.isKitchenItem,
            ismodifier: prod.ismodifier ?? prod.isModifier,
            isfavourite: prod.isfavourite ?? prod.isFavourite,
            wholesaleprice: prod.wholesaleprice ?? prod.wholesalePrice ?? 0,
            needs_price_review: prod.needs_price_review ?? prod.needsPriceReview,
            price_set_by: prod.price_set_by ?? prod.priceSetBy ?? 0,
          };
          const { error } = await tenantUpsert("product", dbProduct, "product_id", dbProduct.product_id, body.account_id);
          if (error) {
            errors.push(`Product ${dbProduct.product_id}: ${error.message}`);
          } else {
            productsSynced++;
          }
        } catch (e: any) {
          errors.push(`Product: ${e.message}`);
        }
      }
    }

    // Sync taxes
    if (body.taxes?.length) {
      for (const tax of body.taxes) {
        try {
          const dbTax = {
            tax_id: tax.tax_id ?? tax.taxId,
            account_id: body.account_id,
            name: tax.name,
            rate: tax.rate ?? 0,
            taxcode: tax.taxcode ?? tax.taxCode,
            isactive: tax.isactive ?? tax.isActive ?? "Y",
          };
          const { error } = await tenantUpsert("tax", dbTax, "tax_id", dbTax.tax_id, body.account_id);
          if (error) {
            errors.push(`Tax ${dbTax.tax_id}: ${error.message}`);
          } else {
            taxesSynced++;
          }
        } catch (e: any) {
          errors.push(`Tax: ${e.message}`);
        }
      }
    }

    // Sync restaurant tables
    if (body.restaurant_tables?.length) {
      for (const table of body.restaurant_tables) {
        try {
          const tableId = table.table_id ?? table.tableId;
          const dbTable = {
            table_id: tableId,
            table_name: table.table_name ?? table.tableName,
            seats: table.seats ?? 4,
            is_occupied: table.is_occupied ?? table.isOccupied ?? false,
            current_order_id: table.current_order_id ?? table.currentOrderId,
            store_id: table.store_id ?? table.storeId ?? body.store_id,
            terminal_id: table.terminal_id ?? table.terminalId ?? body.terminal_id,
            account_id: body.account_id,
            updated_at: new Date().toISOString(),
          };
          const { error } = await tenantUpsert("restaurant_table", dbTable, "table_id", tableId, body.account_id);
          if (error) {
            errors.push(`Table ${tableId}: ${error.message}`);
          } else {
            tablesSynced++;
          }
        } catch (e: any) {
          errors.push(`Table: ${e.message}`);
        }
      }
    }

    // Sync inventory count entries
    if (body.inventory_count_entries?.length) {
      for (const entry of body.inventory_count_entries) {
        try {
          const sessionId = entry.session_id ?? entry.sessionId;
          const productId = entry.product_id ?? entry.productId;

          // Check if entry already exists for this product in this session
          const { data: existing } = await getDb()
            .from("inventory_count_entry")
            .select("entry_id, quantity")
            .eq("session_id", sessionId)
            .eq("product_id", productId)
            .maybeSingle();

          if (existing) {
            // Increment quantity
            const newQty = existing.quantity + (entry.quantity ?? 1);
            await getDb()
              .from("inventory_count_entry")
              .update({
                quantity: newQty,
                scanned_at: new Date().toISOString(),
                scanned_by: entry.scanned_by ?? entry.scannedBy ?? 0,
              })
              .eq("entry_id", existing.entry_id);
          } else {
            await getDb().from("inventory_count_entry").insert({
              session_id: sessionId,
              account_id: body.account_id,
              product_id: productId,
              product_name: entry.product_name ?? entry.productName,
              upc: entry.upc,
              quantity: entry.quantity ?? 1,
              scanned_by: entry.scanned_by ?? entry.scannedBy ?? 0,
              terminal_id: entry.terminal_id ?? entry.terminalId ?? body.terminal_id,
            });
          }

          // Auto-transition session created → active
          const { data: session } = await getDb()
            .from("inventory_count_session")
            .select("status")
            .eq("session_id", sessionId)
            .single();

          if (session?.status === "created") {
            await getDb()
              .from("inventory_count_session")
              .update({
                status: "active",
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("session_id", sessionId);
          } else {
            await getDb()
              .from("inventory_count_session")
              .update({ updated_at: new Date().toISOString() })
              .eq("session_id", sessionId);
          }

          inventoryEntriesSynced++;
        } catch (e: any) {
          errors.push(`InventoryEntry: ${e.message}`);
        }
      }
    }

    // ========================================
    // PULL: Cloud → Terminal
    // ========================================
    const lastSync = body.last_sync_at || "1970-01-01T00:00:00Z";

    // Get updated products (exclude soft-deleted)
    const { data: products } = await getDb()
      .from("product")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("product_status", "live")
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    // Get updated categories (exclude soft-deleted)
    const { data: categories } = await getDb()
      .from("productcategory")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    // Get updated taxes
    const { data: taxes } = await getDb()
      .from("tax")
      .select("*")
      .eq("account_id", body.account_id)
      .gte("updated_at", lastSync);

    // Get updated modifiers
    const { data: modifiers } = await getDb()
      .from("modifier")
      .select("*")
      .eq("account_id", body.account_id)
      .gte("updated_at", lastSync);

    // Get updated customers (exclude soft-deleted)
    const { data: customers } = await getDb()
      .from("customer")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    // Get preferences
    const { data: preferences } = await getDb()
      .from("preference")
      .select("*")
      .eq("account_id", body.account_id)
      .gte("updated_at", lastSync);

    // Get updated users (exclude soft-deleted)
    const { data: users } = await getDb()
      .from("pos_user")
      .select(
        "user_id, username, firstname, lastname, pin, role, isadmin, issalesrep, permissions, discountlimit, isactive, is_deleted"
      )
      .eq("account_id", body.account_id)
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    // Get discount codes
    const { data: discountCodes } = await getDb()
      .from("discountcode")
      .select("*")
      .eq("account_id", body.account_id)
      .gte("updated_at", lastSync);

    // Get restaurant tables for this store
    const { data: tables } = await getDb()
      .from("restaurant_table")
      .select("*")
      .eq("store_id", body.store_id)
      .gte("updated_at", lastSync);

    // Get table sections for this store
    const { data: tableSections } = await getDb()
      .from("table_section")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("store_id", body.store_id)
      .gte("updated_at", lastSync);

    // Get preparation stations for this store
    const { data: preparationStations } = await getDb()
      .from("preparation_station")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("store_id", body.store_id)
      .gte("updated_at", lastSync);

    // Get category → station mappings (always pull full set for consistency)
    const { data: categoryStationMappings } = await getDb()
      .from("category_station_mapping")
      .select("*")
      .eq("account_id", body.account_id);

    // Get stores and terminals (for config changes, exclude soft-deleted)
    const { data: stores } = await getDb()
      .from("store")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    const { data: terminals } = await getDb()
      .from("terminal")
      .select("*")
      .eq("account_id", body.account_id)
      .eq("is_deleted", false)
      .gte("updated_at", lastSync);

    // Get all sibling brands for this owner (so Android can register them)
    let siblingBrands: any[] = [];
    const { data: thisAccount } = await getDb()
      .from("account")
      .select("owner_id")
      .eq("account_id", body.account_id)
      .single();
    if (thisAccount?.owner_id) {
      const { data: allBrands } = await getDb()
        .from("account")
        .select("account_id, businessname, type, status, currency")
        .eq("owner_id", thisAccount.owner_id);
      siblingBrands = allBrands ?? [];
    }

    // Get active/created inventory count sessions for this store
    const { data: inventorySessions } = await getDb()
      .from("inventory_count_session")
      .select("*")
      .eq("account_id", body.account_id)
      .in("status", ["created", "active"])
      .gte("updated_at", lastSync);

    const serverTime = new Date().toISOString();

    // Log sync request for monitoring
    try {
      await getDb().from("sync_request_log").insert({
        account_id: body.account_id,
        terminal_id: body.terminal_id,
        store_id: body.store_id,
        device_id: body.device_id || null,
        device_model: body.device_model || null,
        app_version: body.app_version || null,
        client_sync_version: body.client_sync_version || 0,
        request_at: new Date(requestStart).toISOString(),
        response_at: serverTime,
        duration_ms: Date.now() - requestStart,
        status: errors.length > 0 ? "partial" : "success",
        error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
        orders_pushed: ordersSynced,
        tills_pushed: tillsSynced,
        customers_pushed: body.customers?.length ?? 0,
        error_logs_pushed: errorLogsSynced,
        products_pulled: (products ?? []).length,
        categories_pulled: (categories ?? []).length,
        users_pulled: (users ?? []).length,
        stores_pulled: (stores ?? []).length,
        terminals_pulled: (terminals ?? []).length,
        sync_errors: errors.length > 0 ? errors : null,
      });
    } catch (_) { /* never fail sync for logging */ }

    return NextResponse.json({
      success: errors.length === 0,
      server_time: serverTime,
      // Version info — client should check and warn if outdated
      server_sync_version: SYNC_API_VERSION,
      min_client_version: MIN_CLIENT_VERSION,
      // Pull data
      products: products ?? [],
      product_categories: categories ?? [],
      taxes: taxes ?? [],
      modifiers: modifiers ?? [],
      customers: customers ?? [],
      preferences: preferences ?? [],
      users: users ?? [],
      discount_codes: discountCodes ?? [],
      restaurant_tables: tables ?? [],
      table_sections: tableSections ?? [],
      preparation_stations: preparationStations ?? [],
      category_station_mappings: categoryStationMappings ?? [],
      stores: stores ?? [],
      terminals: terminals ?? [],
      inventory_sessions: inventorySessions ?? [],
      sibling_brands: siblingBrands,
      // Stats
      error_logs_synced: errorLogsSynced,
      orders_synced: ordersSynced,
      order_lines_synced: orderLinesSynced,
      payments_synced: paymentsSynced,
      tills_synced: tillsSynced,
      stores_synced: storesSynced,
      terminals_synced: terminalsSynced,
      users_synced: usersSynced,
      categories_synced: categoriesSynced,
      products_synced: productsSynced,
      taxes_synced: taxesSynced,
      tables_synced: tablesSynced,
      inventory_entries_synced: inventoryEntriesSynced,
      errors,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "posterita-cloud-sync",
    sync_api_version: SYNC_API_VERSION,
    min_client_version: MIN_CLIENT_VERSION,
    timestamp: new Date().toISOString(),
  });
}
