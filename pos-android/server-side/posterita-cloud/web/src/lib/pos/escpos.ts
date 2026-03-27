/**
 * ESC/POS command builder for thermal receipt printers.
 * Generates raw byte arrays that can be sent to any ESC/POS printer.
 *
 * Mirrors the receipt layout from Android PrinterManager.
 */

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export class EscPosBuilder {
  private buf: number[] = [];

  /** Initialize printer */
  init(): this {
    this.buf.push(ESC, 0x40); // ESC @ — reset
    return this;
  }

  /** Raw text */
  text(s: string): this {
    for (let i = 0; i < s.length; i++) {
      this.buf.push(s.charCodeAt(i) & 0xff);
    }
    return this;
  }

  /** Line feed */
  newline(count: number = 1): this {
    for (let i = 0; i < count; i++) this.buf.push(LF);
    return this;
  }

  /** Set text alignment: 0=left, 1=center, 2=right */
  align(a: 0 | 1 | 2): this {
    this.buf.push(ESC, 0x61, a);
    return this;
  }

  /** Bold on/off */
  bold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  /** Double height on/off */
  doubleHeight(on: boolean): this {
    this.buf.push(ESC, 0x21, on ? 0x10 : 0x00);
    return this;
  }

  /** Double width+height (for totals) */
  doubleSize(on: boolean): this {
    this.buf.push(GS, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  /** Print a dashed separator line (48 chars for 80mm, 32 for 58mm) */
  separator(width: number = 48): this {
    this.text("-".repeat(width));
    this.newline();
    return this;
  }

  /** Print two columns: left-aligned text + right-aligned text */
  columns(left: string, right: string, width: number = 48): this {
    const gap = width - left.length - right.length;
    if (gap > 0) {
      this.text(left + " ".repeat(gap) + right);
    } else {
      this.text(left.substring(0, width - right.length - 1) + " " + right);
    }
    this.newline();
    return this;
  }

  /** Feed + cut */
  cut(): this {
    this.newline(4);
    this.buf.push(GS, 0x56, 0x00); // GS V 0 — full cut
    return this;
  }

  /** Partial cut */
  partialCut(): this {
    this.newline(4);
    this.buf.push(GS, 0x56, 0x01); // GS V 1 — partial cut
    return this;
  }

  /** Open cash drawer (pulse pin 2) */
  openDrawer(): this {
    this.buf.push(ESC, 0x70, 0x00, 25, 250); // ESC p 0 25 250
    return this;
  }

  /** Get the built byte array */
  build(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

/**
 * Build a receipt from order data.
 * Layout matches Android receipt format.
 */
export function buildReceipt(opts: {
  storeName: string;
  storeAddress?: string;
  terminalName?: string;
  documentNo?: string;
  dateOrdered: string;
  cashierName?: string;
  customerName?: string;
  items: {
    name: string;
    qty: number;
    price: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  tips?: number;
  payments: {
    type: string;
    amount: number;
    tendered?: number;
    change?: number;
  }[];
  brn?: string;
  tan?: string;
  orderUuid?: string;
  width?: number;
}): Uint8Array {
  const w = opts.width ?? 48;
  const b = new EscPosBuilder();

  b.init();

  // Header
  b.align(1);
  b.bold(true);
  b.doubleHeight(true);
  b.text(opts.storeName);
  b.newline();
  b.doubleHeight(false);
  b.bold(false);

  if (opts.storeAddress) {
    b.text(opts.storeAddress);
    b.newline();
  }

  b.newline();
  b.align(0);
  b.separator(w);

  // Order info
  if (opts.documentNo) b.columns("Receipt #", opts.documentNo, w);
  if (opts.terminalName) b.columns("Terminal", opts.terminalName, w);
  b.columns("Date", formatDate(opts.dateOrdered), w);
  if (opts.cashierName) b.columns("Cashier", opts.cashierName, w);
  if (opts.customerName) b.columns("Customer", opts.customerName, w);

  b.separator(w);

  // Column headers
  b.bold(true);
  b.columns("Item", "Total", w);
  b.bold(false);
  b.separator(w);

  // Items
  for (const item of opts.items) {
    b.text(item.name);
    b.newline();
    const qtyPrice = `  ${fmtQty(item.qty)} x ${fmtAmt(item.price)}`;
    b.columns(qtyPrice, fmtAmt(item.lineTotal), w);
  }

  b.separator(w);

  // Totals
  b.columns("Subtotal", fmtAmt(opts.subtotal), w);
  b.columns("Tax", fmtAmt(opts.taxTotal), w);
  if (opts.tips && opts.tips > 0) {
    b.columns("Tips", fmtAmt(opts.tips), w);
  }

  b.bold(true);
  b.doubleSize(true);
  b.columns("TOTAL", fmtAmt(opts.grandTotal), w);
  b.doubleSize(false);
  b.bold(false);

  b.separator(w);

  // Payments
  for (const p of opts.payments) {
    b.columns(p.type, fmtAmt(p.amount), w);
    if (p.tendered && p.tendered > p.amount) {
      b.columns("  Tendered", fmtAmt(p.tendered), w);
      b.columns("  Change", fmtAmt(p.change ?? 0), w);
    }
  }

  // Tax info (MRA compliance)
  if (opts.brn || opts.tan) {
    b.separator(w);
    if (opts.brn) b.columns("BRN", opts.brn, w);
    if (opts.tan) b.columns("TAN", opts.tan, w);
  }

  // Footer
  b.newline();
  b.align(1);
  b.text("Thank you for your purchase!");
  b.newline();

  if (opts.orderUuid) {
    b.newline();
    b.text(opts.orderUuid.substring(0, 16));
    b.newline();
  }

  b.partialCut();

  return b.build();
}

function fmtAmt(n: number): string {
  return n.toFixed(2);
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
