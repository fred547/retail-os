import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats MUR by default", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("56");
  });

  it("formats USD", () => {
    const result = formatCurrency(99.99, "USD");
    expect(result).toContain("$");
    expect(result).toContain("99.99");
  });

  it("formats EUR", () => {
    const result = formatCurrency(50, "EUR");
    expect(result).toContain("50");
    expect(result).toContain("00");
  });

  it("handles zero", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("0.00");
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-25.5, "USD");
    expect(result).toContain("25.50");
  });

  it("falls back for invalid currency code", () => {
    const result = formatCurrency(100, "INVALID");
    expect(result).toBe("INVALID 100.00");
  });

  it("always shows 2 decimal places", () => {
    const result = formatCurrency(10, "USD");
    expect(result).toContain("10.00");
  });
});
