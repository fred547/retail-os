"use client";

import { useState, useEffect } from "react";
import { subscribeCart, type CartState } from "./cart-store";

export function useCart(): CartState {
  const [cart, setCart] = useState<CartState>({
    items: [], customer_id: 0, customer_name: null,
    order_type: null, note: null, subtotal: 0,
    tax_total: 0, grand_total: 0, qty_total: 0, tips: 0,
  });

  useEffect(() => subscribeCart(setCart), []);

  return cart;
}
