import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { pushNow } from "@/lib/offline/sync-worker";
import { getCart, clearCart, type CartState } from "./cart-store";
import type { Order, OrderLine, Payment } from "@/lib/offline/schema";

/**
 * Complete the current cart as a paid order.
 * Saves order + lines + payment to IndexedDB (is_sync=false),
 * then triggers immediate sync — mirrors Android order completion flow.
 */
export async function completeOrder(payments: {
  type: string;
  amount: number;
  tendered: number;
  change: number;
}[]): Promise<{ orderId: number; uuid: string }> {
  const cart = getCart();
  if (cart.items.length === 0) throw new Error("Cart is empty");

  const db = getOfflineDb();
  const accountId = await getSyncMeta("account_id") || "";
  const storeId = parseInt(await getSyncMeta("store_id") || "0");
  const terminalId = parseInt(await getSyncMeta("terminal_id") || "0");
  const tillUuid = await getSyncMeta("active_till_uuid");

  const uuid = crypto.randomUUID();
  const now = new Date().toISOString();

  // Build order
  const order: Order = {
    order_id: 0, // auto-increment
    account_id: accountId,
    customer_id: cart.customer_id,
    sales_rep_id: 0,
    till_id: 0,
    till_uuid: tillUuid || null,
    terminal_id: terminalId,
    store_id: storeId,
    order_type: cart.order_type,
    document_no: null,
    doc_status: "CO",
    is_paid: true,
    subtotal: cart.subtotal,
    tax_total: cart.tax_total,
    grand_total: cart.grand_total,
    qty_total: cart.qty_total,
    date_ordered: now,
    json_data: null,
    is_sync: false,
    sync_error_message: null,
    uuid,
    currency: null,
    tips: cart.tips,
    note: cart.note,
    couponids: null,
  };

  // Save order (auto-increment returns the new ID)
  const orderId = await db.order.add(order) as number;

  // Build order lines
  const lines: OrderLine[] = cart.items.map((item, i) => ({
    orderline_id: 0, // auto-increment
    order_id: orderId,
    product_id: item.product_id,
    productcategory_id: item.productcategory_id,
    tax_id: item.tax_id,
    qtyentered: item.qty,
    lineamt: item.line_total,
    linenetamt: item.line_net,
    priceentered: item.price,
    costamt: item.cost * item.qty,
    productname: item.name,
    productdescription: null,
    serial_item_id: item.serial_item_id ?? null,
  }));

  await db.orderline.bulkAdd(lines);

  // Build payments
  const paymentRecords: Payment[] = payments.map((p) => ({
    payment_id: 0, // auto-increment
    order_id: orderId,
    document_no: null,
    tendered: p.tendered,
    amount: p.amount,
    change: p.change,
    payment_type: p.type,
    date_paid: now,
    pay_amt: p.amount,
    status: "completed",
    checknumber: null,
    extra_info: null,
  }));

  await db.payment.bulkAdd(paymentRecords);

  // Clear the cart
  clearCart();

  // Trigger immediate sync (fire-and-forget, like Android pushOrdersNow)
  pushNow().catch(() => { /* will retry on next cycle */ });

  return { orderId, uuid };
}
