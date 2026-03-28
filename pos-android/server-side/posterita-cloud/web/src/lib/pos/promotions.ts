/**
 * Promotion engine — auto-apply active promotions to the cart.
 * Mirrors Android promotion validation logic.
 *
 * Checks: active, date range, day of week, time window, min order amount.
 * Types: percentage_off, fixed_amount_off, buy_x_get_y, flat_price.
 */

import type { Promotion } from "@/lib/offline/schema";
import type { CartItem } from "./cart-store";

export interface AppliedPromotion {
  id: number;
  name: string;
  type: string;
  discount: number;       // total discount amount
  description: string;    // human-readable
}

/**
 * Find and apply the best promotion for the current cart.
 * Returns the best single promotion (highest discount wins).
 */
export function findBestPromotion(
  promotions: Promotion[],
  items: CartItem[],
  subtotal: number,
): AppliedPromotion | null {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const timeStr = now.toTimeString().substring(0, 5); // HH:MM

  let best: AppliedPromotion | null = null;

  for (const promo of promotions) {
    if (!promo.is_active || promo.is_deleted) continue;

    // Date range check
    if (promo.start_date && new Date(promo.start_date) > now) continue;
    if (promo.end_date && new Date(promo.end_date) < now) continue;

    // Day of week check
    if (promo.days_of_week) {
      const days = promo.days_of_week.toLowerCase().split(",").map((d) => d.trim());
      if (!days.includes(dayOfWeek)) continue;
    }

    // Time window check
    if (promo.start_time && timeStr < promo.start_time) continue;
    if (promo.end_time && timeStr > promo.end_time) continue;

    // Min order amount check
    if (promo.min_order_amount && subtotal < promo.min_order_amount) continue;

    // Calculate discount based on type
    let discount = 0;
    let description = "";

    switch (promo.type) {
      case "percentage_off": {
        discount = subtotal * (promo.discount_value / 100);
        if (promo.max_discount_amount && discount > promo.max_discount_amount) {
          discount = promo.max_discount_amount;
        }
        description = `${promo.discount_value}% off`;
        break;
      }
      case "fixed_amount_off": {
        discount = Math.min(promo.discount_value, subtotal);
        description = `${promo.discount_value.toFixed(2)} off`;
        break;
      }
      case "buy_x_get_y": {
        // Check if cart has enough qty of applicable products
        const buyQty = promo.buy_quantity ?? 0;
        const getQty = promo.get_quantity ?? 0;
        if (buyQty > 0 && getQty > 0) {
          const applicableQty = items.reduce((sum, i) => {
            if (promo.product_ids) {
              const ids = promo.product_ids.split(",").map(Number);
              return ids.includes(i.product_id) ? sum + i.qty : sum;
            }
            if (promo.category_ids) {
              const ids = promo.category_ids.split(",").map(Number);
              return ids.includes(i.productcategory_id) ? sum + i.qty : sum;
            }
            return sum + i.qty;
          }, 0);
          const sets = Math.floor(applicableQty / (buyQty + getQty));
          if (sets > 0) {
            // Find cheapest item price for "free" items
            const cheapest = Math.min(...items.map((i) => i.price));
            discount = sets * getQty * cheapest;
            description = `Buy ${buyQty} get ${getQty} free`;
          }
        }
        break;
      }
      case "flat_price": {
        if (promo.discount_value < subtotal) {
          discount = subtotal - promo.discount_value;
          description = `Flat price: ${promo.discount_value.toFixed(2)}`;
        }
        break;
      }
    }

    if (discount <= 0) continue;
    discount = Math.round(discount * 100) / 100;

    if (!best || discount > best.discount) {
      best = {
        id: promo.id,
        name: promo.name,
        type: promo.type,
        discount,
        description,
      };
    }
  }

  return best;
}
