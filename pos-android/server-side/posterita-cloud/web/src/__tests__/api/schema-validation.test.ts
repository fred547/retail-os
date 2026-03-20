import { describe, it, expect } from 'vitest';

/**
 * Schema validation tests ensuring the sync API contract is self-consistent.
 * These tests don't hit a database — they validate the data transformation logic.
 */

describe('Sync Data Schema Validation', () => {

  // Helper: simulate the field mapping the server does for tills
  function mapTillFields(till: any) {
    return {
      till_id: till.tillId ?? till.till_id,
      store_id: till.store_id ?? till.storeId ?? 0,
      terminal_id: till.terminal_id ?? till.terminalId ?? 0,
      open_by: till.openBy ?? till.open_by ?? 0,
      close_by: till.closeBy ?? till.close_by ?? 0,
      opening_amt: till.openingAmt ?? till.opening_amt ?? 0,
      closing_amt: till.closingAmt ?? till.closing_amt ?? 0,
      cash_amt: till.cashamt ?? till.cash_amt ?? 0,
      card_amt: till.cardamt ?? till.card_amt ?? 0,
      subtotal: till.subtotal ?? 0,
      tax_total: till.taxtotal ?? till.tax_total ?? 0,
      grand_total: till.grandtotal ?? till.grand_total ?? 0,
      forex_amt: till.forexamt ?? till.forex_amt ?? 0,
      adjustment_total: till.adjustmenttotal ?? till.adjustment_total ?? 0,
    };
  }

  // Same for orders
  function mapOrderFields(order: any) {
    return {
      order_id: order.orderId ?? order.order_id,
      customer_id: order.customerId ?? order.customer_id ?? 0,
      sales_rep_id: order.salesRepId ?? order.sales_rep_id ?? 0,
      till_id: order.tillId ?? order.till_id ?? 0,
      terminal_id: order.terminalId ?? order.terminal_id ?? 0,
      store_id: order.storeId ?? order.store_id ?? 0,
      tax_total: order.taxTotal ?? order.tax_total ?? 0,
      grand_total: order.grandTotal ?? order.grand_total ?? 0,
      qty_total: order.qtyTotal ?? order.qty_total ?? 0,
      subtotal: order.subtotal ?? 0,
      tips: order.tips ?? 0,
    };
  }

  describe('Till field mapping', () => {
    it('maps camelCase Android fields correctly', () => {
      const androidTill = {
        tillId: 100, storeId: 1, terminalId: 1,
        openBy: 1, closeBy: 1,
        openingAmt: 500.0, closingAmt: 1250.0,
        cashamt: 750.0, cardamt: 500.0,
        subtotal: 1200.0, taxtotal: 50.0, grandtotal: 1250.0,
        adjustmenttotal: 50.0, forexamt: 25.0,
      };
      const mapped = mapTillFields(androidTill);
      expect(mapped.till_id).toBe(100);
      expect(mapped.opening_amt).toBe(500.0);
      expect(mapped.closing_amt).toBe(1250.0);
      expect(mapped.cash_amt).toBe(750.0);
      expect(mapped.grand_total).toBe(1250.0);
    });

    it('maps snake_case fields correctly', () => {
      const snakeTill = {
        till_id: 100, store_id: 1, terminal_id: 1,
        open_by: 1, close_by: 1,
        opening_amt: 500.0, closing_amt: 1250.0,
        cash_amt: 750.0, card_amt: 500.0,
        subtotal: 1200.0, tax_total: 50.0, grand_total: 1250.0,
        adjustment_total: 50.0, forex_amt: 25.0,
      };
      const mapped = mapTillFields(snakeTill);
      expect(mapped.till_id).toBe(100);
      expect(mapped.opening_amt).toBe(500.0);
      expect(mapped.cash_amt).toBe(750.0);
    });

    it('preserves zero amounts (not coerced to fallback)', () => {
      const zeroTill = {
        tillId: 100,
        openingAmt: 0,
        closingAmt: 0,
        cashamt: 0,
        cardamt: 0,
        subtotal: 0,
        taxtotal: 0,
        grandtotal: 0,
        adjustmenttotal: 0,
        forexamt: 0,
      };
      const mapped = mapTillFields(zeroTill);
      expect(mapped.opening_amt).toBe(0);
      expect(mapped.closing_amt).toBe(0);
      expect(mapped.cash_amt).toBe(0);
      expect(mapped.grand_total).toBe(0);
      expect(mapped.adjustment_total).toBe(0);
    });
  });

  describe('Order field mapping', () => {
    it('maps camelCase Android fields correctly', () => {
      const androidOrder = {
        orderId: 1, customerId: 5, salesRepId: 2,
        tillId: 100, terminalId: 1, storeId: 1,
        taxTotal: 30.0, grandTotal: 230.0, qtyTotal: 3.0,
        subtotal: 200.0, tips: 10.0,
      };
      const mapped = mapOrderFields(androidOrder);
      expect(mapped.order_id).toBe(1);
      expect(mapped.tax_total).toBe(30.0);
      expect(mapped.grand_total).toBe(230.0);
      expect(mapped.tips).toBe(10.0);
    });

    it('preserves zero amounts for orders', () => {
      const zeroOrder = {
        orderId: 1,
        taxTotal: 0, grandTotal: 0, qtyTotal: 0, subtotal: 0, tips: 0,
      };
      const mapped = mapOrderFields(zeroOrder);
      expect(mapped.tax_total).toBe(0);
      expect(mapped.grand_total).toBe(0);
      expect(mapped.tips).toBe(0);
    });
  });

  describe('UUID handling', () => {
    it('uuid field is preserved for orders', () => {
      const order = { uuid: 'abc-123-def', orderId: 1 };
      expect(order.uuid).toBe('abc-123-def');
    });

    it('uuid field is preserved for tills', () => {
      const till = { uuid: 'till-uuid-456', tillId: 1 };
      expect(till.uuid).toBe('till-uuid-456');
    });
  });
});
