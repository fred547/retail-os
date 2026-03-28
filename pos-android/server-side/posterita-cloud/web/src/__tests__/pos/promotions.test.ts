import { describe, it, expect } from "vitest";
import { findBestPromotion } from "../../lib/pos/promotions";
import type { Promotion } from "../../lib/offline/schema";
import type { CartItem } from "../../lib/pos/cart-store";

function makePromo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 1,
    account_id: "test",
    name: "Test Promo",
    description: null,
    type: "percentage_off",
    discount_value: 10,
    buy_quantity: null,
    get_quantity: null,
    applies_to: "order",
    product_ids: null,
    category_ids: null,
    min_order_amount: null,
    max_discount_amount: null,
    promo_code: null,
    max_uses: null,
    max_uses_per_customer: null,
    start_date: null,
    end_date: null,
    days_of_week: null,
    start_time: null,
    end_time: null,
    is_active: true,
    store_id: null,
    priority: 0,
    is_deleted: false,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    product_id: 1,
    name: "Item",
    qty: 1,
    price: 100,
    cost: 50,
    tax_id: 1,
    tax_rate: 15,
    tax_amount: 0,
    line_total: 100,
    line_net: 115,
    discount_percent: 0,
    image: null,
    upc: null,
    productcategory_id: 1,
    ...overrides,
  };
}

describe("Promotion Engine — findBestPromotion", () => {
  it("returns null when no promotions", () => {
    expect(findBestPromotion([], [makeItem()], 100)).toBeNull();
  });

  it("returns null when all promotions are inactive", () => {
    const promo = makePromo({ is_active: false });
    expect(findBestPromotion([promo], [makeItem()], 100)).toBeNull();
  });

  it("returns null when all promotions are deleted", () => {
    const promo = makePromo({ is_deleted: true });
    expect(findBestPromotion([promo], [makeItem()], 100)).toBeNull();
  });

  it("applies percentage_off correctly", () => {
    const promo = makePromo({ type: "percentage_off", discount_value: 20 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result).not.toBeNull();
    expect(result!.discount).toBe(20);
    expect(result!.description).toBe("20% off");
  });

  it("caps percentage_off at max_discount_amount", () => {
    const promo = makePromo({ type: "percentage_off", discount_value: 50, max_discount_amount: 10 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result!.discount).toBe(10);
  });

  it("applies fixed_amount_off correctly", () => {
    const promo = makePromo({ type: "fixed_amount_off", discount_value: 15 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result!.discount).toBe(15);
    expect(result!.description).toBe("15.00 off");
  });

  it("fixed_amount_off does not exceed subtotal", () => {
    const promo = makePromo({ type: "fixed_amount_off", discount_value: 200 });
    const result = findBestPromotion([promo], [makeItem()], 50);
    expect(result!.discount).toBe(50);
  });

  it("applies flat_price correctly", () => {
    const promo = makePromo({ type: "flat_price", discount_value: 75 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result!.discount).toBe(25);
    expect(result!.description).toContain("75.00");
  });

  it("flat_price returns null if price is higher than subtotal", () => {
    const promo = makePromo({ type: "flat_price", discount_value: 150 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result).toBeNull();
  });

  it("respects min_order_amount", () => {
    const promo = makePromo({ min_order_amount: 200 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result).toBeNull();
  });

  it("applies when min_order_amount is met", () => {
    const promo = makePromo({ min_order_amount: 50 });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result).not.toBeNull();
  });

  it("filters by start_date (future promo not applied)", () => {
    const promo = makePromo({ start_date: "2099-01-01" });
    expect(findBestPromotion([promo], [makeItem()], 100)).toBeNull();
  });

  it("filters by end_date (expired promo not applied)", () => {
    const promo = makePromo({ end_date: "2020-01-01" });
    expect(findBestPromotion([promo], [makeItem()], 100)).toBeNull();
  });

  it("applies promo within valid date range", () => {
    const promo = makePromo({ start_date: "2020-01-01", end_date: "2099-12-31" });
    const result = findBestPromotion([promo], [makeItem()], 100);
    expect(result).not.toBeNull();
  });

  it("picks the highest discount when multiple promos apply", () => {
    const promos = [
      makePromo({ id: 1, name: "Small", type: "percentage_off", discount_value: 5 }),
      makePromo({ id: 2, name: "Big", type: "percentage_off", discount_value: 25 }),
      makePromo({ id: 3, name: "Medium", type: "percentage_off", discount_value: 15 }),
    ];
    const result = findBestPromotion(promos, [makeItem()], 100);
    expect(result!.name).toBe("Big");
    expect(result!.discount).toBe(25);
  });

  it("buy_x_get_y applies when qty threshold met", () => {
    const promo = makePromo({
      type: "buy_x_get_y",
      buy_quantity: 2,
      get_quantity: 1,
      discount_value: 0,
    });
    const items = [makeItem({ qty: 3, price: 10 })];
    const result = findBestPromotion([promo], items, 30);
    expect(result).not.toBeNull();
    expect(result!.description).toContain("Buy 2 get 1 free");
    expect(result!.discount).toBe(10); // 1 free item at cheapest price (10)
  });

  it("buy_x_get_y does not apply when qty below threshold", () => {
    const promo = makePromo({
      type: "buy_x_get_y",
      buy_quantity: 3,
      get_quantity: 1,
      discount_value: 0,
    });
    const items = [makeItem({ qty: 2, price: 10 })];
    expect(findBestPromotion([promo], items, 20)).toBeNull();
  });

  it("handles empty cart gracefully", () => {
    const promo = makePromo();
    expect(findBestPromotion([promo], [], 0)).toBeNull();
  });
});
