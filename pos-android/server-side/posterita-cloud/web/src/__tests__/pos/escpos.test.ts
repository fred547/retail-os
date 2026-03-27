import { describe, it, expect } from "vitest";
import { EscPosBuilder, buildReceipt } from "../../lib/pos/escpos";

describe("EscPosBuilder", () => {
  it("init produces ESC @ command", () => {
    const data = new EscPosBuilder().init().build();
    expect(data[0]).toBe(0x1b); // ESC
    expect(data[1]).toBe(0x40); // @
  });

  it("text encodes ASCII characters", () => {
    const data = new EscPosBuilder().text("Hello").build();
    expect(data.length).toBe(5);
    expect(String.fromCharCode(...data)).toBe("Hello");
  });

  it("newline produces LF", () => {
    const data = new EscPosBuilder().newline().build();
    expect(data[0]).toBe(0x0a);
  });

  it("multiple newlines", () => {
    const data = new EscPosBuilder().newline(3).build();
    expect(data.length).toBe(3);
    expect(data.every((b: number) => b === 0x0a)).toBe(true);
  });

  it("align center produces ESC a 1", () => {
    const data = new EscPosBuilder().align(1).build();
    expect(data[0]).toBe(0x1b);
    expect(data[1]).toBe(0x61);
    expect(data[2]).toBe(1);
  });

  it("bold on produces ESC E 1", () => {
    const data = new EscPosBuilder().bold(true).build();
    expect(data[0]).toBe(0x1b);
    expect(data[1]).toBe(0x45);
    expect(data[2]).toBe(1);
  });

  it("bold off produces ESC E 0", () => {
    const data = new EscPosBuilder().bold(false).build();
    expect(data[2]).toBe(0);
  });

  it("cut produces GS V 0", () => {
    const data = new EscPosBuilder().cut().build();
    // 4 LFs + GS V 0
    expect(data[4]).toBe(0x1d); // GS
    expect(data[5]).toBe(0x56); // V
    expect(data[6]).toBe(0x00);
  });

  it("openDrawer produces ESC p command", () => {
    const data = new EscPosBuilder().openDrawer().build();
    expect(data[0]).toBe(0x1b); // ESC
    expect(data[1]).toBe(0x70); // p
  });

  it("separator generates dashes", () => {
    const data = new EscPosBuilder().separator(10).build();
    const text = String.fromCharCode(...data.slice(0, 10));
    expect(text).toBe("----------");
  });

  it("columns pads between left and right text", () => {
    const data = new EscPosBuilder().columns("Item", "10.00", 20).build();
    const text = String.fromCharCode(...data.slice(0, 20));
    expect(text.startsWith("Item")).toBe(true);
    expect(text.endsWith("10.00")).toBe(true);
    expect(text.length).toBe(20);
  });
});

describe("buildReceipt", () => {
  it("generates non-empty byte array", () => {
    const data = buildReceipt({
      storeName: "Test Store",
      dateOrdered: "2024-01-15T10:30:00Z",
      items: [
        { name: "Burger", qty: 2, price: 5.00, lineTotal: 10.00 },
        { name: "Coke", qty: 1, price: 2.50, lineTotal: 2.50 },
      ],
      subtotal: 12.50,
      taxTotal: 1.88,
      grandTotal: 14.38,
      payments: [{ type: "CASH", amount: 14.38, tendered: 20.00, change: 5.62 }],
    });

    expect(data.length).toBeGreaterThan(100);
    // Should start with ESC @ (init)
    expect(data[0]).toBe(0x1b);
    expect(data[1]).toBe(0x40);
  });

  it("includes store name in output", () => {
    const data = buildReceipt({
      storeName: "My Shop",
      dateOrdered: "2024-01-15T10:30:00Z",
      items: [{ name: "Item", qty: 1, price: 1, lineTotal: 1 }],
      subtotal: 1,
      taxTotal: 0,
      grandTotal: 1,
      payments: [{ type: "CASH", amount: 1 }],
    });

    const text = String.fromCharCode(...data);
    expect(text).toContain("My Shop");
  });

  it("includes BRN/TAN when provided", () => {
    const data = buildReceipt({
      storeName: "Store",
      dateOrdered: "2024-01-15T10:30:00Z",
      items: [{ name: "A", qty: 1, price: 10, lineTotal: 10 }],
      subtotal: 10,
      taxTotal: 1.5,
      grandTotal: 11.5,
      payments: [{ type: "CASH", amount: 11.5 }],
      brn: "C12345678",
      tan: "T98765432",
    });

    const text = String.fromCharCode(...data);
    expect(text).toContain("C12345678");
    expect(text).toContain("T98765432");
  });

  it("ends with partial cut command", () => {
    const data = buildReceipt({
      storeName: "S",
      dateOrdered: "2024-01-15T10:30:00Z",
      items: [{ name: "X", qty: 1, price: 1, lineTotal: 1 }],
      subtotal: 1,
      taxTotal: 0,
      grandTotal: 1,
      payments: [{ type: "CARD", amount: 1 }],
    });

    // Last 3 bytes should be GS V 1 (partial cut)
    const len = data.length;
    expect(data[len - 3]).toBe(0x1d); // GS
    expect(data[len - 2]).toBe(0x56); // V
    expect(data[len - 1]).toBe(0x01); // 1 (partial)
  });
});
