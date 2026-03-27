import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase/admin";
import net from "net";

async function logToErrorDb(accountId: string, message: string, stackTrace?: string) {
  try {
    await getDb().from("error_logs").insert({
      account_id: accountId, severity: "ERROR", tag: "PRINT",
      message, stack_trace: stackTrace ?? null, device_info: "web-api", app_version: "web",
    });
  } catch (_) { /* swallow */ }
}

/**
 * POST /api/print — TCP print relay.
 *
 * Receives ESC/POS bytes (base64) + printer IP/port,
 * opens a TCP socket and sends the raw bytes to the printer.
 *
 * This exists because browsers cannot open TCP sockets directly.
 * The Vercel serverless function acts as a relay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { printer_ip, printer_port, data } = body;

    if (!printer_ip || !data) {
      return NextResponse.json(
        { error: "printer_ip and data (base64) are required" },
        { status: 400 }
      );
    }

    const port = printer_port ?? 9100; // Standard ESC/POS port

    // Validate IP format (prevent SSRF)
    if (!isValidPrinterIp(printer_ip)) {
      return NextResponse.json(
        { error: "Invalid printer IP address" },
        { status: 400 }
      );
    }

    // Decode base64 to bytes
    const bytes = Buffer.from(data, "base64");

    if (bytes.length === 0) {
      return NextResponse.json({ error: "Empty print data" }, { status: 400 });
    }

    if (bytes.length > 1_000_000) {
      return NextResponse.json({ error: "Print data too large (max 1MB)" }, { status: 400 });
    }

    // Send to printer via TCP
    await sendToPrinter(printer_ip, port, bytes);

    return NextResponse.json({ success: true, bytes_sent: bytes.length });
  } catch (e: any) {
    const msg = e.message || "Print failed";
    await logToErrorDb("system", `Print relay failed: ${msg}`, e.stack);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function sendToPrinter(ip: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10_000; // 10 second timeout

    socket.setTimeout(timeout);

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Printer connection timed out (${ip}:${port})`));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(new Error(`Printer error (${ip}:${port}): ${err.message}`));
    });

    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        socket.end();
        if (err) reject(new Error(`Write error: ${err.message}`));
        else resolve();
      });
    });
  });
}

/**
 * Validate printer IP — must be a private/local network address.
 * Blocks public IPs and special ranges to prevent SSRF attacks.
 */
function isValidPrinterIp(ip: string): boolean {
  // Must look like an IP address
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  // Allow private ranges only (RFC 1918 + link-local)
  const [a, b] = nums;
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  if (a === 169 && b === 254) return true;             // 169.254.0.0/16 (link-local)
  if (a === 127) return true;                          // 127.0.0.0/8 (localhost)

  return false;
}
