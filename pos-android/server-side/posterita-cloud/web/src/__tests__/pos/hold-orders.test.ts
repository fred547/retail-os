/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  addProduct, clearCart, setCustomer, setNote, setTips,
  holdCurrentCart, listHeldOrders, recallHeldOrder, deleteHeldOrder,
  getCart, setTaxMap, setLineDiscount, setItemPrice,
  addProductWithModifiers,
} from "../../lib/pos/cart-store";
import type { Product } from "../../lib/offline/schema";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1, account_id: "test", name: "Test", description: null,
    sellingprice: 10, costprice: 5, taxamount: 1.5, tax_id: 1,
    productcategory_id: 1, image: null, upc: null, itemcode: null,
    barcodetype: null, isactive: "Y", istaxincluded: null, isstock: null,
    isvariableitem: null, iskitchenitem: null, ismodifier: null,
    isfavourite: null, iseditable: null, wholesaleprice: 0,
    needs_price_review: null, price_set_by: 0, product_status: "live",
    source: "manual", is_serialized: "N", quantity_on_hand: 100,
    reorder_point: 10, track_stock: true, shelf_location: null,
    batch_number: null, expiry_date: null, is_deleted: false,
    created_at: null, updated_at: null,
    ...overrides,
  };
}

describe("Hold Orders", () => {
  beforeEach(() => {
    clearCart();
    setTaxMap([{ tax_id: 1, account_id: "test", name: "VAT", rate: 15, taxcode: "V15", isactive: "Y" }]);
    // Clear held orders
    localStorage.removeItem("posterita_hold_orders");
  });

  it("holds a cart and clears active cart", () => {
    addProduct(makeProduct());
    setCustomer(1, "Alice");
    setNote("Rush order");
    const held = holdCurrentCart();

    expect(held).not.toBeNull();
    expect(held!.items).toHaveLength(1);
    expect(held!.customer_name).toBe("Alice");
    expect(held!.note).toBe("Rush order");
    expect(getCart().items).toHaveLength(0);
  });

  it("returns null when holding empty cart", () => {
    expect(holdCurrentCart()).toBeNull();
  });

  it("lists held orders", () => {
    addProduct(makeProduct({ product_id: 1 }));
    holdCurrentCart();

    addProduct(makeProduct({ product_id: 2, name: "B" }));
    holdCurrentCart();

    const orders = listHeldOrders();
    expect(orders).toHaveLength(2);
  });

  it("recalls a held order", () => {
    addProduct(makeProduct());
    setCustomer(5, "Bob");
    const held = holdCurrentCart()!;

    const success = recallHeldOrder(held.id);
    expect(success).toBe(true);
    expect(getCart().items).toHaveLength(1);
    expect(getCart().customer_name).toBe("Bob");
    expect(listHeldOrders()).toHaveLength(0);
  });

  it("returns false for non-existent hold ID", () => {
    expect(recallHeldOrder("fake-id")).toBe(false);
  });

  it("deletes a held order", () => {
    addProduct(makeProduct());
    const held = holdCurrentCart()!;
    deleteHeldOrder(held.id);
    expect(listHeldOrders()).toHaveLength(0);
  });

  it("preserves tips when holding", () => {
    addProduct(makeProduct());
    setTips(5);
    const held = holdCurrentCart()!;
    expect(held.tips).toBe(5);
  });
});

describe("Line Discount", () => {
  beforeEach(() => {
    clearCart();
    setTaxMap([{ tax_id: 1, account_id: "test", name: "VAT", rate: 15, taxcode: "V15", isactive: "Y" }]);
  });

  it("applies percentage discount to line", () => {
    addProduct(makeProduct({ sellingprice: 100 }));
    setLineDiscount(1, 20);
    const cart = getCart();
    expect(cart.items[0].discount_percent).toBe(20);
    expect(cart.items[0].line_total).toBe(80); // 100 - 20%
    expect(cart.subtotal).toBe(80);
  });

  it("100% discount zeroes the line", () => {
    addProduct(makeProduct({ sellingprice: 50 }));
    setLineDiscount(1, 100);
    expect(getCart().items[0].line_total).toBe(0);
  });

  it("clamps discount to 0-100", () => {
    addProduct(makeProduct());
    setLineDiscount(1, 150);
    expect(getCart().items[0].discount_percent).toBe(100);
    setLineDiscount(1, -10);
    expect(getCart().items[0].discount_percent).toBe(0);
  });

  it("recalculates tax after discount", () => {
    addProduct(makeProduct({ sellingprice: 100 }));
    setLineDiscount(1, 50);
    const cart = getCart();
    // line_total = 50, tax = 50 * 15% = 7.5
    expect(cart.items[0].line_total).toBe(50);
    expect(cart.items[0].tax_amount).toBe(7.5);
    expect(cart.grand_total).toBe(57.5);
  });
});

describe("Price Override", () => {
  beforeEach(() => {
    clearCart();
    setTaxMap([]);
  });

  it("overrides item price", () => {
    addProduct(makeProduct({ sellingprice: 10 }));
    setItemPrice(1, 25);
    expect(getCart().items[0].price).toBe(25);
    expect(getCart().subtotal).toBe(25);
  });

  it("does not allow negative price", () => {
    addProduct(makeProduct());
    setItemPrice(1, -5);
    expect(getCart().items[0].price).toBe(0);
  });
});

describe("Modifiers in Cart", () => {
  beforeEach(() => {
    clearCart();
    setTaxMap([{ tax_id: 1, account_id: "test", name: "VAT", rate: 15, taxcode: "V15", isactive: "Y" }]);
  });

  it("adds product with modifiers at combined price", () => {
    const product = makeProduct({ sellingprice: 10 });
    addProductWithModifiers(product, [
      { name: "Large", price: 2 },
      { name: "Extra Cheese", price: 1.5 },
    ]);
    const cart = getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].price).toBe(13.5); // 10 + 2 + 1.5
    expect(cart.items[0].modifiers).toBe("Large, Extra Cheese");
    expect(cart.items[0].modifier_total).toBe(3.5);
  });

  it("always adds as new line (no merge with existing)", () => {
    const product = makeProduct({ sellingprice: 10 });
    addProduct(product); // plain
    addProductWithModifiers(product, [{ name: "Large", price: 2 }]);
    expect(getCart().items).toHaveLength(2);
  });

  it("handles empty modifier list", () => {
    addProductWithModifiers(makeProduct({ sellingprice: 10 }), []);
    const cart = getCart();
    expect(cart.items[0].price).toBe(10);
    expect(cart.items[0].modifiers).toBeNull();
  });
});
