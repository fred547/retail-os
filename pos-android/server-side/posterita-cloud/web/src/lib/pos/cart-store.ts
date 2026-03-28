/**
 * Cart state manager — mirrors Android ShoppingCart + ShoppingCartViewModel.
 * Pure state + functions, no React dependency. UI subscribes via useCart() hook.
 */

import type { Product, Tax } from "@/lib/offline/schema";

export interface CartItem {
  product_id: number;
  name: string;
  qty: number;
  price: number;        // unit price (selling price or overridden)
  cost: number;         // unit cost
  tax_id: number;
  tax_rate: number;     // from tax table
  tax_amount: number;   // computed per-line
  line_total: number;   // qty * price * (1 - discount)
  line_net: number;     // line_total + tax
  discount_percent: number; // per-line discount (0-100)
  image: string | null;
  upc: string | null;
  productcategory_id: number;
  serial_item_id?: number | null;
}

export interface HeldOrder {
  id: string;           // UUID
  items: CartItem[];
  customer_id: number;
  customer_name: string | null;
  order_type: string | null;
  note: string | null;
  tips: number;
  held_at: string;      // ISO timestamp
}

export interface CartState {
  items: CartItem[];
  customer_id: number;
  customer_name: string | null;
  order_type: string | null;  // dine_in, takeaway, delivery
  note: string | null;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  qty_total: number;
  tips: number;
}

type Listener = (state: CartState) => void;

const listeners = new Set<Listener>();
let taxMap: Record<number, number> = {}; // tax_id → rate

let state: CartState = emptyCart();

function emptyCart(): CartState {
  return {
    items: [],
    customer_id: 0,
    customer_name: null,
    order_type: null,
    note: null,
    subtotal: 0,
    tax_total: 0,
    grand_total: 0,
    qty_total: 0,
    tips: 0,
  };
}

function notify() {
  for (const fn of listeners) {
    try { fn(state); } catch { /* ignore */ }
  }
  // Auto-save to localStorage for crash recovery
  try {
    localStorage.setItem("posterita_cart", JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

function recalcTotals() {
  let subtotal = 0;
  let taxTotal = 0;
  let qtyTotal = 0;

  for (const item of state.items) {
    const rate = taxMap[item.tax_id] ?? item.tax_rate ?? 0;
    const gross = round2(item.qty * item.price);
    const discountAmt = round2(gross * (item.discount_percent || 0) / 100);
    item.line_total = round2(gross - discountAmt);
    item.tax_amount = round2(item.line_total * rate / 100);
    item.line_net = round2(item.line_total + item.tax_amount);
    item.tax_rate = rate;

    subtotal += item.line_total;
    taxTotal += item.tax_amount;
    qtyTotal += item.qty;
  }

  state.subtotal = round2(subtotal);
  state.tax_total = round2(taxTotal);
  state.grand_total = round2(subtotal + taxTotal + state.tips);
  state.qty_total = round2(qtyTotal);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Public API ──

export function getCart(): CartState {
  return state;
}

export function subscribeCart(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function setTaxMap(taxes: Tax[]) {
  taxMap = {};
  for (const t of taxes) {
    taxMap[t.tax_id] = t.rate;
  }
  recalcTotals();
  notify();
}

export function addProduct(product: Product, qty: number = 1, priceOverride?: number) {
  const existing = state.items.find((i) => i.product_id === product.product_id && !i.serial_item_id);
  if (existing) {
    existing.qty += qty;
    if (priceOverride !== undefined) existing.price = priceOverride;
  } else {
    state.items.push({
      product_id: product.product_id,
      name: product.name || "Product",
      qty,
      price: priceOverride ?? product.sellingprice,
      cost: product.costprice,
      tax_id: product.tax_id,
      tax_rate: taxMap[product.tax_id] ?? 0,
      tax_amount: 0,
      line_total: 0,
      line_net: 0,
      discount_percent: 0,
      image: product.image,
      upc: product.upc,
      productcategory_id: product.productcategory_id,
    });
  }
  recalcTotals();
  notify();
}

export function updateItemQty(productId: number, qty: number) {
  const item = state.items.find((i) => i.product_id === productId);
  if (!item) return;
  if (qty <= 0) {
    state.items = state.items.filter((i) => i.product_id !== productId);
  } else {
    item.qty = qty;
  }
  recalcTotals();
  notify();
}

export function removeItem(productId: number) {
  state.items = state.items.filter((i) => i.product_id !== productId);
  recalcTotals();
  notify();
}

export function setCustomer(customerId: number, name: string | null) {
  state.customer_id = customerId;
  state.customer_name = name;
  notify();
}

export function setOrderType(type: string | null) {
  state.order_type = type;
  notify();
}

export function setNote(note: string | null) {
  state.note = note;
  notify();
}

export function setTips(tips: number) {
  state.tips = tips;
  recalcTotals();
  notify();
}

export function clearCart() {
  state = emptyCart();
  notify();
}

/** Set per-line discount (0-100 percent) */
export function setLineDiscount(productId: number, percent: number) {
  const item = state.items.find((i) => i.product_id === productId);
  if (!item) return;
  item.discount_percent = Math.max(0, Math.min(100, percent));
  recalcTotals();
  notify();
}

/** Set price override for a specific item */
export function setItemPrice(productId: number, price: number) {
  const item = state.items.find((i) => i.product_id === productId);
  if (!item) return;
  item.price = Math.max(0, price);
  recalcTotals();
  notify();
}

// ── Hold Orders (park/recall) ──

const HOLD_KEY = "posterita_hold_orders";

function getHeldOrders(): HeldOrder[] {
  try {
    return JSON.parse(localStorage.getItem(HOLD_KEY) || "[]");
  } catch { return []; }
}

function saveHeldOrders(orders: HeldOrder[]) {
  localStorage.setItem(HOLD_KEY, JSON.stringify(orders));
}

/** Park the current cart as a held order. Clears the cart. */
export function holdCurrentCart(): HeldOrder | null {
  if (state.items.length === 0) return null;
  const held: HeldOrder = {
    id: crypto.randomUUID(),
    items: [...state.items],
    customer_id: state.customer_id,
    customer_name: state.customer_name,
    order_type: state.order_type,
    note: state.note,
    tips: state.tips,
    held_at: new Date().toISOString(),
  };
  const orders = getHeldOrders();
  orders.unshift(held);
  saveHeldOrders(orders);
  state = emptyCart();
  notify();
  return held;
}

/** Recall a held order back into the active cart. Removes from hold list. */
export function recallHeldOrder(holdId: string): boolean {
  const orders = getHeldOrders();
  const idx = orders.findIndex((o) => o.id === holdId);
  if (idx === -1) return false;
  const held = orders[idx];
  orders.splice(idx, 1);
  saveHeldOrders(orders);

  state.items = held.items;
  state.customer_id = held.customer_id;
  state.customer_name = held.customer_name;
  state.order_type = held.order_type;
  state.note = held.note;
  state.tips = held.tips;
  recalcTotals();
  notify();
  return true;
}

/** Delete a held order without recalling it. */
export function deleteHeldOrder(holdId: string) {
  const orders = getHeldOrders();
  saveHeldOrders(orders.filter((o) => o.id !== holdId));
}

/** Get all held orders. */
export function listHeldOrders(): HeldOrder[] {
  return getHeldOrders();
}

/** Restore cart from localStorage (call on page load) */
export function restoreCart() {
  try {
    const saved = localStorage.getItem("posterita_cart");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.items?.length > 0) {
        state = parsed;
        recalcTotals();
        notify();
      }
    }
  } catch { /* ignore */ }
}
