/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startBarcodeListener, stopBarcodeListener } from "../../lib/pos/barcode-listener";

describe("Barcode Listener", () => {
  let scannedValues: string[] = [];

  beforeEach(() => {
    scannedValues = [];
    startBarcodeListener((barcode) => scannedValues.push(barcode));
  });

  afterEach(() => {
    stopBarcodeListener();
  });

  function simulateKeys(chars: string, delay: number = 10) {
    for (const ch of chars) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: ch }));
    }
  }

  function simulateEnter() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  }

  it("fires callback when Enter follows 4+ chars", () => {
    simulateKeys("1234567890123");
    simulateEnter();
    expect(scannedValues).toHaveLength(1);
    expect(scannedValues[0]).toBe("1234567890123");
  });

  it("does not fire for fewer than 4 chars", () => {
    simulateKeys("12");
    simulateEnter();
    expect(scannedValues).toHaveLength(0);
  });

  it("resets buffer after successful scan", () => {
    simulateKeys("1234");
    simulateEnter();
    simulateKeys("5678");
    simulateEnter();
    expect(scannedValues).toHaveLength(2);
    expect(scannedValues[1]).toBe("5678");
  });

  it("ignores events targeting input elements", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", { key: "1" });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);

    simulateEnter();
    expect(scannedValues).toHaveLength(0);

    document.body.removeChild(input);
  });

  it("stops listening after stopBarcodeListener", () => {
    stopBarcodeListener();
    simulateKeys("1234567");
    simulateEnter();
    expect(scannedValues).toHaveLength(0);
  });
});
