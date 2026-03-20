# POS and Transactions
> References: shared/architecture.md, shared/data-model.md

## Overview

The POS module handles all point-of-sale operations: product selection, cart management, checkout, payments (cash and card via Blink), receipt printing with mandatory QR code, till session management, and reconciliation. Every receipt must include a QR code for loyalty enrollment and digital receipt delivery.

## Relevant Tables

`order`, `order_line`, `payment`, `till_session`, `till_reconciliation`, `reconciliation_evidence`, `product`, `category`, `barcode`, `customer`, `loyalty_wallet`, `loyalty_transaction`

## API Routes

### POS, Tills, Products, Categories, Barcodes, Reconciliation

*All routes from v2 §12 remain unchanged.*

### Key routes:

- `POST /v1/auth/owner-login` — Owner login (PIN/biometric -> 30-day refresh JWT)
- `POST /v1/auth/staff-login` — Staff login (staff picker + PIN -> 7-day refresh JWT)
- `POST /v1/qr/receipt/{order_ref}` — Generate receipt QR

## Business Rules

### Receipt QR — Mandatory On Every Receipt

**Rule: Every POS receipt MUST print a QR code. No exceptions.**

This is the highest-volume customer acquisition channel. Every transaction generates a receipt with a QR code.

**Receipt QR format:**
```
https://wa.me/+230XXXXX?text=RECEIPT%20{ORDER_REF}
```

**QR size on receipt:** Minimum 25mm x 25mm for reliable phone camera scanning. Epson ePOS SDK `addSymbol()` function with `QRCODE_MODEL_2`, error correction level M, module size 6+.

**The receipt QR is printed EVEN IF the customer is already linked and points were awarded at POS.** Reason: the receipt is a physical artifact that continues to be an entry point for WhatsApp engagement days later.

### Receipt Layout

```
┌─────────────────────────────────┐
│     Funky Fish — Grand Baie      │
│     Receipt #GBR-20260319-047    │
│     19 Mar 2026 · 14:32          │
│─────────────────────────────────│
│ Reef Sandal Navy    x1  1,290.00 │
│ Canvas Tote Natural x2  1,300.00 │
│ Flip Flop Coral M   x1    490.00 │
│─────────────────────────────────│
│ Subtotal              3,080.00   │
│ VAT 15%                 462.00   │
│ TOTAL                 3,542.00   │
│─────────────────────────────────│
│ Paid: Cash            4,000.00   │
│ Change                  458.00   │
│─────────────────────────────────│
│                                  │
│        ┌──────────┐              │
│        │ QR CODE  │              │
│        │  (large) │              │
│        └──────────┘              │
│                                  │
│   Scan to earn loyalty points    │
│   or get your digital receipt    │
│                                  │
│   Posterita Retail OS            │
└─────────────────────────────────┘
```

### Till Session Management

- Open till at shift start
- Track cash float
- Close till with counted cash
- System calculates expected vs actual
- Discrepancies flagged for supervisor resolution

### Reconciliation Workflow

- Discrepancy detected at till close
- Evidence captured (photos of cash count)
- Supervisor reviews and resolves (accept, adjust, investigate)

## UX Flows

### Product Display Improvements (Section 28)

- **View mode toggle:** Compact list (default, 68px cards) / Visual grid (120px cards, 80px images)
- **Search promotion:** Persistent search icon in top bar, real-time filtering
- **Stock indicator:** 3px colored bar at bottom of each card (Green >=10, Amber 1-9, Red 0 and greyed out)
- **Frequent items:** Auto-populated "Frequent" category chip showing 12 most-sold products in last 7 days
- **Category color accents:** 4px left-border color on each category chip

## Dependencies

- Platform Bootstrap (auth, device enrollment)
- Loyalty module (point award at checkout)
- WhatsApp module (receipt QR triggers)
- Blink SDK (card payments)

## Implementation Notes

- **Phase 1:** `:feature:pos` — product grid, cart, checkout, payment, receipt printing with mandatory QR
- Decision 1: Build `:feature:pos` fresh from architecture, adopt good playground patterns
- Decision 29: COD tracked separately in logistics module
- Blink SDK compatibility is a Phase 1 risk item
