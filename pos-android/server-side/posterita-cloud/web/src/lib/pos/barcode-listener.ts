/**
 * USB barcode scanner listener.
 *
 * USB scanners emulate a keyboard — they type characters rapidly (< 50ms gaps)
 * and end with Enter. This module detects that pattern and fires a callback
 * with the scanned value.
 *
 * Does NOT intercept when user is typing in an input/textarea.
 */

type ScanCallback = (barcode: string) => void;

let buffer = "";
let timer: ReturnType<typeof setTimeout> | undefined;
let listener: ((e: KeyboardEvent) => void) | null = null;

/**
 * Start listening for USB barcode scans.
 * Call `stopBarcodeListener()` to clean up.
 *
 * @param onScan Callback with the scanned barcode string
 * @param minLength Minimum characters to consider a valid scan (default 4)
 * @param maxGapMs Maximum ms between keystrokes to still count as scanner input (default 100)
 */
export function startBarcodeListener(
  onScan: ScanCallback,
  minLength: number = 4,
  maxGapMs: number = 100,
): void {
  // Prevent double-registration
  if (listener) stopBarcodeListener();

  listener = (e: KeyboardEvent) => {
    // Don't intercept when user is typing in a form field
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return;
    }

    clearTimeout(timer);

    if (e.key === "Enter" && buffer.length >= minLength) {
      const barcode = buffer;
      buffer = "";
      onScan(barcode);
      e.preventDefault(); // Don't let Enter trigger other actions
    } else if (e.key.length === 1) {
      // Single printable character
      buffer += e.key;
    }

    // Reset buffer if no keystroke within the gap (user typed manually)
    timer = setTimeout(() => {
      buffer = "";
    }, maxGapMs);
  };

  document.addEventListener("keydown", listener);
}

/**
 * Stop listening for barcode scans.
 */
export function stopBarcodeListener(): void {
  if (listener) {
    document.removeEventListener("keydown", listener);
    listener = null;
  }
  clearTimeout(timer);
  buffer = "";
}
