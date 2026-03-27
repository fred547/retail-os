import { getCart, clearCart } from "./cart-store";
import { getSyncMeta } from "@/lib/offline/db";

/**
 * Save the current cart as a draft quotation on the server.
 * Unlike orders (saved to IndexedDB offline), quotes are created
 * via API since they need document_no generation and PDF support.
 */
export async function saveCartAsQuote(): Promise<{ quotationId: number; documentNo: string } | null> {
  const cart = getCart();
  if (cart.items.length === 0) return null;

  const storeId = parseInt(await getSyncMeta("store_id") || "0");
  const terminalId = parseInt(await getSyncMeta("terminal_id") || "0");

  const res = await fetch("/api/quotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store_id: storeId,
      terminal_id: terminalId,
      customer_name: cart.customer_name || null,
      lines: cart.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        discount_percent: 0,
        tax_id: item.tax_id,
        tax_rate: item.tax_rate,
      })),
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.quotation) return null;

  clearCart();

  return {
    quotationId: data.quotation.quotation_id,
    documentNo: data.quotation.document_no,
  };
}
