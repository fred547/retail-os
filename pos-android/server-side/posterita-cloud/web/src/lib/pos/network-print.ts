/**
 * Network printer client.
 *
 * Browsers cannot open raw TCP sockets, so we send ESC/POS bytes
 * to our print relay API which forwards them to the printer via TCP.
 *
 * Printer config is stored in localStorage.
 */

export interface PrinterConfig {
  ip: string;
  port: number;
  name: string;
}

const STORAGE_KEY = "posterita_printer";

/**
 * Get saved printer configuration.
 */
export function getPrinterConfig(): PrinterConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * Save printer configuration.
 */
export function savePrinterConfig(config: PrinterConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Clear printer configuration.
 */
export function clearPrinterConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Send raw ESC/POS bytes to a network printer via the print relay API.
 *
 * @param data ESC/POS byte array
 * @param config Printer IP/port (uses saved config if not provided)
 * @returns true if print succeeded
 */
export async function printReceipt(
  data: Uint8Array,
  config?: PrinterConfig,
): Promise<boolean> {
  const printer = config ?? getPrinterConfig();
  if (!printer) {
    throw new Error("No printer configured. Go to POS Settings to add a printer.");
  }

  // Convert bytes to base64 for JSON transport
  const base64 = uint8ToBase64(data);

  const response = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      printer_ip: printer.ip,
      printer_port: printer.port,
      data: base64,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Print failed" }));
    throw new Error(err.error || `Print failed: ${response.status}`);
  }

  return true;
}

/**
 * Open the cash drawer (sends ESC/POS drawer kick command).
 */
export async function openCashDrawer(config?: PrinterConfig): Promise<boolean> {
  const { EscPosBuilder } = await import("./escpos");
  const cmd = new EscPosBuilder().init().openDrawer().build();
  return printReceipt(cmd, config);
}

/**
 * Test printer connectivity.
 */
export async function testPrinter(config: PrinterConfig): Promise<boolean> {
  const { EscPosBuilder } = await import("./escpos");
  const cmd = new EscPosBuilder()
    .init()
    .align(1)
    .bold(true)
    .text("Posterita Printer Test")
    .newline()
    .bold(false)
    .text(new Date().toLocaleString())
    .newline()
    .text(`${config.ip}:${config.port}`)
    .newline(2)
    .partialCut()
    .build();

  return printReceipt(cmd, config);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
