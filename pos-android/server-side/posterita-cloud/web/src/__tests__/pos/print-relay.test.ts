import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Print relay tests — test the IP validation logic and request validation.
 * The actual TCP socket send is server-only (Node net) and tested via integration.
 */

// Extract the IP validation logic (same as in the route)
function isValidPrinterIp(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;

  return false;
}

describe("Print relay — IP validation (SSRF protection)", () => {
  // Private IPs (should be allowed)
  it("allows 192.168.x.x", () => {
    expect(isValidPrinterIp("192.168.1.100")).toBe(true);
    expect(isValidPrinterIp("192.168.0.1")).toBe(true);
    expect(isValidPrinterIp("192.168.255.255")).toBe(true);
  });

  it("allows 10.x.x.x", () => {
    expect(isValidPrinterIp("10.0.0.1")).toBe(true);
    expect(isValidPrinterIp("10.255.255.255")).toBe(true);
  });

  it("allows 172.16-31.x.x", () => {
    expect(isValidPrinterIp("172.16.0.1")).toBe(true);
    expect(isValidPrinterIp("172.31.255.255")).toBe(true);
  });

  it("allows 127.x.x.x (localhost)", () => {
    expect(isValidPrinterIp("127.0.0.1")).toBe(true);
  });

  it("allows 169.254.x.x (link-local)", () => {
    expect(isValidPrinterIp("169.254.1.1")).toBe(true);
  });

  // Public IPs (should be blocked)
  it("blocks public IPs", () => {
    expect(isValidPrinterIp("8.8.8.8")).toBe(false);
    expect(isValidPrinterIp("1.2.3.4")).toBe(false);
    expect(isValidPrinterIp("203.0.113.1")).toBe(false);
    expect(isValidPrinterIp("142.250.80.46")).toBe(false);
  });

  it("blocks 172.32+ (outside private range)", () => {
    expect(isValidPrinterIp("172.32.0.1")).toBe(false);
    expect(isValidPrinterIp("172.15.0.1")).toBe(false);
  });

  it("blocks 192.167.x.x (not 192.168)", () => {
    expect(isValidPrinterIp("192.167.1.1")).toBe(false);
  });

  // Invalid formats
  it("rejects non-IP strings", () => {
    expect(isValidPrinterIp("not-an-ip")).toBe(false);
    expect(isValidPrinterIp("")).toBe(false);
    expect(isValidPrinterIp("192.168.1")).toBe(false);
    expect(isValidPrinterIp("192.168.1.1.1")).toBe(false);
  });

  it("rejects out-of-range octets", () => {
    expect(isValidPrinterIp("192.168.1.256")).toBe(false);
    expect(isValidPrinterIp("192.168.-1.1")).toBe(false);
  });
});
