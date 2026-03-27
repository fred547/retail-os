import { describe, it, expect, beforeEach } from "vitest";
import {
  addProduct, updateItemQty, removeItem, setCustomer, setOrderType,
  setNote, setTips, clearCart, getCart, setTaxMap,
} from "../../lib/pos/cart-store";
import type { Product, Tax } from "../../lib/offline/schema";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    account_id: "test",
    name: "Test Product",
    description: null,
    sellingprice: 10.00,
    costprice: 5.00,
    taxamount: 1.50,
    tax_id: 1,
    productcategory_id: 1,
    image: null,
    upc: "1234567890123",
    itemcode: null,
    barcodetype: null,
    isactive: "Y",
    istaxincluded: null,
    isstock: null,
    isvariableitem: null,
    iskitchenitem: null,
    ismodifier: null,
    isfavourite: null,
    iseditable: null,
    wholesaleprice: 0,
    needs_price_review: null,
    price_set_by: 0,
    product_status: "live",
    source: "manual",
    is_serialized: "N",
    quantity_on_hand: 100,
    reorder_point: 10,
    track_stock: true,
    shelf_location: null,
    batch_number: null,
    expiry_date: null,
    is_deleted: false,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe("Cart Store", () => {
  beforeEach(() => {
    clearCart();
    setTaxMap([{ tax_id: 1, account_id: "test", name: "VAT", rate: 15, taxcode: "V15", isactive: "Y" }]);
  });

  it("starts with empty cart", () => {
    const cart = getCart();
    expect(cart.items).toHaveLength(0);
    expect(cart.grand_total).toBe(0);
    expect(cart.qty_total).toBe(0);
  });

  it("adds a product", () => {
    addProduct(makeProduct());
    const cart = getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe("Test Product");
    expect(cart.items[0].qty).toBe(1);
    expect(cart.items[0].price).toBe(10.00);
  });

  it("increments qty when adding same product twice", () => {
    const p = makeProduct();
    addProduct(p);
    addProduct(p);
    const cart = getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].qty).toBe(2);
  });

  it("adds different products as separate items", () => {
    addProduct(makeProduct({ product_id: 1, name: "A" }));
    addProduct(makeProduct({ product_id: 2, name: "B" }));
    const cart = getCart();
    expect(cart.items).toHaveLength(2);
  });

  it("calculates subtotal correctly", () => {
    addProduct(makeProduct({ sellingprice: 20.00 }));
    addProduct(makeProduct({ sellingprice: 20.00 })); // same product, qty=2
    const cart = getCart();
    expect(cart.subtotal).toBe(40.00);
  });

  it("calculates tax correctly (15%)", () => {
    addProduct(makeProduct({ sellingprice: 100.00 }));
    const cart = getCart();
    expect(cart.tax_total).toBe(15.00);
    expect(cart.grand_total).toBe(115.00);
  });

  it("updates item quantity", () => {
    addProduct(makeProduct());
    updateItemQty(1, 5);
    const cart = getCart();
    expect(cart.items[0].qty).toBe(5);
    expect(cart.subtotal).toBe(50.00);
  });

  it("removes item when qty set to 0", () => {
    addProduct(makeProduct());
    updateItemQty(1, 0);
    const cart = getCart();
    expect(cart.items).toHaveLength(0);
  });

  it("removes item by product_id", () => {
    addProduct(makeProduct({ product_id: 1 }));
    addProduct(makeProduct({ product_id: 2, name: "Other" }));
    removeItem(1);
    const cart = getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product_id).toBe(2);
  });

  it("sets customer", () => {
    setCustomer(42, "John Doe");
    const cart = getCart();
    expect(cart.customer_id).toBe(42);
    expect(cart.customer_name).toBe("John Doe");
  });

  it("sets order type", () => {
    setOrderType("takeaway");
    expect(getCart().order_type).toBe("takeaway");
  });

  it("sets note", () => {
    setNote("Extra sauce please");
    expect(getCart().note).toBe("Extra sauce please");
  });

  it("adds tips to grand total", () => {
    addProduct(makeProduct({ sellingprice: 100.00 }));
    setTips(10.00);
    const cart = getCart();
    expect(cart.tips).toBe(10.00);
    expect(cart.grand_total).toBe(125.00); // 100 + 15% tax + 10 tips
  });

  it("clears cart completely", () => {
    addProduct(makeProduct());
    setCustomer(1, "Test");
    setTips(5);
    clearCart();
    const cart = getCart();
    expect(cart.items).toHaveLength(0);
    expect(cart.customer_id).toBe(0);
    expect(cart.tips).toBe(0);
    expect(cart.grand_total).toBe(0);
  });

  it("allows price override", () => {
    addProduct(makeProduct({ sellingprice: 10.00 }), 1, 25.00);
    const cart = getCart();
    expect(cart.items[0].price).toBe(25.00);
    expect(cart.subtotal).toBe(25.00);
  });

  it("allows custom quantity", () => {
    addProduct(makeProduct(), 3);
    const cart = getCart();
    expect(cart.items[0].qty).toBe(3);
    expect(cart.subtotal).toBe(30.00);
  });

  it("handles zero-tax products", () => {
    setTaxMap([{ tax_id: 1, account_id: "test", name: "VAT", rate: 15, taxcode: "V15", isactive: "Y" }]);
    addProduct(makeProduct({ tax_id: 99 })); // no matching tax → 0%
    const cart = getCart();
    expect(cart.tax_total).toBe(0);
    expect(cart.grand_total).toBe(10.00);
  });

  it("calculates qty_total across items", () => {
    addProduct(makeProduct({ product_id: 1 }), 2);
    addProduct(makeProduct({ product_id: 2, name: "B" }), 3);
    expect(getCart().qty_total).toBe(5);
  });

  it("handles decimal precision for financial values", () => {
    addProduct(makeProduct({ sellingprice: 19.99 }), 3);
    const cart = getCart();
    expect(cart.subtotal).toBe(59.97);
    // 15% of 59.97 = 8.9955 → rounds to 9.00
    expect(cart.tax_total).toBe(9.00);
    expect(cart.grand_total).toBe(68.97);
  });
});
