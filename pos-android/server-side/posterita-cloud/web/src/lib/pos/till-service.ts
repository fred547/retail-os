import { getOfflineDb, getSyncMeta, setSyncMeta } from "@/lib/offline/db";
import { pushNow } from "@/lib/offline/sync-worker";
import type { Till } from "@/lib/offline/schema";

/**
 * Till lifecycle — mirrors Android TillService.
 *
 * Open till → sync (pass 1) → cashier makes sales → close till → sync (pass 2)
 *
 * Two-pass sync: till syncs once at open (is_sync=true), then when closed,
 * is_sync is set to false again to trigger second sync with final amounts.
 */

/**
 * Open a new till with an opening amount.
 * Returns the till UUID.
 */
export async function openTill(openingAmt: number): Promise<string> {
  const db = getOfflineDb();
  const accountId = await getSyncMeta("account_id") || "";
  const storeId = parseInt(await getSyncMeta("store_id") || "0");
  const terminalId = parseInt(await getSyncMeta("terminal_id") || "0");

  // Check for existing active till
  const existing = await getActiveTill();
  if (existing) {
    throw new Error("A till is already open. Close it before opening a new one.");
  }

  const uuid = crypto.randomUUID();
  const now = new Date().toISOString();

  const till: Till = {
    till_id: 0, // auto-increment
    account_id: accountId,
    store_id: storeId,
    terminal_id: terminalId,
    open_by: parseInt(await getSyncMeta("user_id") || "0"),
    close_by: 0,
    opening_amt: openingAmt,
    closing_amt: 0,
    date_opened: now,
    date_closed: null,
    json_data: null,
    is_sync: false, // triggers first sync pass
    sync_error_message: null,
    uuid,
    documentno: null,
    vouchers: null,
    adjustment_total: 0,
    cash_amt: 0,
    card_amt: 0,
    subtotal: 0,
    tax_total: 0,
    grand_total: 0,
    forex_currency: null,
    forex_amt: 0,
  };

  await db.till.add(till);
  await setSyncMeta("active_till_uuid", uuid);

  // Trigger immediate sync (fire-and-forget)
  pushNow().catch(() => {});

  return uuid;
}

/**
 * Close the active till with a closing amount.
 * Calculates session totals from orders.
 */
export async function closeTill(closingAmt: number): Promise<Till | null> {
  const db = getOfflineDb();
  const activeTill = await getActiveTill();
  if (!activeTill) return null;

  const accountId = await getSyncMeta("account_id") || "";
  const now = new Date().toISOString();

  // Calculate session totals from orders linked to this till
  const orders = await db.order
    .where("till_uuid")
    .equals(activeTill.uuid)
    .toArray();

  let cashAmt = 0;
  let cardAmt = 0;
  let subtotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  for (const order of orders) {
    subtotal += order.subtotal || 0;
    taxTotal += order.tax_total || 0;
    grandTotal += order.grand_total || 0;

    // Get payments for this order
    const payments = await db.payment.where("order_id").equals(order.order_id).toArray();
    for (const p of payments) {
      if (p.payment_type === "CASH") cashAmt += p.amount || 0;
      else cardAmt += p.amount || 0;
    }
  }

  // Update till with closing data
  await db.till.update(activeTill.till_id, {
    close_by: parseInt(await getSyncMeta("user_id") || "0"),
    closing_amt: closingAmt,
    date_closed: now,
    cash_amt: round2(cashAmt),
    card_amt: round2(cardAmt),
    subtotal: round2(subtotal),
    tax_total: round2(taxTotal),
    grand_total: round2(grandTotal),
    is_sync: false, // triggers second sync pass
  });

  await setSyncMeta("active_till_uuid", "");

  // Trigger sync
  pushNow().catch(() => {});

  return await db.till.get(activeTill.till_id) || null;
}

/**
 * Get the currently active (open) till, if any.
 */
export async function getActiveTill(): Promise<Till | null> {
  const uuid = await getSyncMeta("active_till_uuid");
  if (!uuid) return null;

  const db = getOfflineDb();
  const till = await db.till.where("uuid").equals(uuid).first();
  if (!till || till.date_closed) return null;

  return till;
}

/**
 * Get the cash discrepancy (expected vs actual).
 */
export function calcDiscrepancy(till: Till, closingAmt: number): number {
  const expected = till.opening_amt + till.cash_amt + till.adjustment_total;
  return round2(closingAmt - expected);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
