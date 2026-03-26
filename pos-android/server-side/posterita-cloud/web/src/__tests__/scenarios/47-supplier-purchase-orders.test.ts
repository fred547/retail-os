/**
 * Scenario 47: Supplier & Purchase Orders
 * Tests: create supplier → create PO → receive goods → stock updated
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{ table: string; op: string; data?: any }> = [];

function createChain(table: string) {
  const state = { op: 'select' as string, data: undefined as any, filters: {} as Record<string, any> };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data });
    const filterKey = Object.entries(state.filters).map(([k, v]) => `${k}=${v}`).join(',');
    return tableResults[`${table}:${filterKey}`] ?? tableResults[table] ?? { data: state.op === 'select' ? [] : null, error: null, count: 0 };
  }

  const chain: any = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'gt', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'head'] as const) {
    chain[m] = (...args: any[]) => { if (m === 'eq') state.filters[args[0]] = args[1]; return chain; };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => { state.op = m; state.data = args[0]; return chain; };
  }
  chain.single = () => { const r = resolve(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }); };
  chain.maybeSingle = chain.single;
  chain.then = (onF: Function, onR?: Function) => Promise.resolve(resolve()).then(onF as any, onR as any);
  return chain;
}

let mockAccountId: string | null = 'test_po_scenario';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => createChain(table) }),
}));

vi.mock('@/lib/account-context', () => ({
  getSessionAccountId: () => Promise.resolve(mockAccountId),
}));

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  mockAccountId = 'test_po_scenario';
});

describe('Scenario 47: Supplier & Purchase Orders', () => {
  it('Step 1: Create a supplier', async () => {
    tableResults['supplier'] = {
      data: { supplier_id: 1, name: 'Acme Supplies', account_id: 'test_po_scenario' },
      error: null,
    };
    const { POST } = await import('@/app/api/suppliers/route');
    const req = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme Supplies', phone: '+230555', payment_terms: 'Net 30' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.supplier.name).toBe('Acme Supplies');
  });

  it('Step 2: Create a purchase order', async () => {
    tableResults['purchase_order'] = {
      data: { po_id: 1, po_number: 'PO-00001', status: 'draft', grand_total: 250 },
      error: null,
      count: 0,
    };
    const { POST } = await import('@/app/api/purchase-orders/route');
    const req = new Request('http://localhost/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: 1,
        lines: [
          { product_id: 10, product_name: 'Widget A', quantity_ordered: 50, unit_cost: 5 },
        ],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.po_number).toBe('PO-00001');

    // Verify PO line was inserted
    const lineInsert = supabaseOps.find(op => op.table === 'purchase_order_line' && op.op === 'insert');
    expect(lineInsert).toBeDefined();
  });

  it('Step 3: Send PO to supplier', async () => {
    tableResults['purchase_order'] = {
      data: { po_id: 1, status: 'sent' },
      error: null,
    };
    const { PATCH } = await import('@/app/api/purchase-orders/[id]/route');
    const req = new Request('http://localhost/api/purchase-orders/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sent' }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order.status).toBe('sent');
  });

  it('Step 4: Receive goods (GRN)', async () => {
    tableResults['purchase_order'] = {
      data: { po_id: 1, status: 'sent', store_id: 1 },
      error: null,
    };
    tableResults['purchase_order_line'] = {
      data: { id: 1, po_id: 1, product_id: 10, quantity_ordered: 50, quantity_received: 0, unit_cost: 5 },
      error: null,
    };
    tableResults['product'] = {
      data: { product_id: 10, quantity_on_hand: 20, track_stock: true },
      error: null,
    };
    const { POST } = await import('@/app/api/purchase-orders/[id]/receive/route');
    const req = new Request('http://localhost/api/purchase-orders/1/receive', {
      method: 'POST',
      body: JSON.stringify({ lines: [{ id: 1, quantity_received: 50 }] }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(body.status).toBe('received');
    expect(body.lines_received).toHaveLength(1);
    expect(body.lines_received[0].total_received).toBe(50);

    // Verify stock journal was created
    const journalInsert = supabaseOps.find(op => op.table === 'stock_journal' && op.op === 'insert');
    expect(journalInsert).toBeDefined();
    expect(journalInsert?.data?.reason).toBe('receive');
  });

  it('Step 5: Cannot receive cancelled PO', async () => {
    tableResults['purchase_order'] = {
      data: { po_id: 2, status: 'cancelled', store_id: 1 },
      error: null,
    };
    const { POST } = await import('@/app/api/purchase-orders/[id]/receive/route');
    const req = new Request('http://localhost/api/purchase-orders/2/receive', {
      method: 'POST',
      body: JSON.stringify({ lines: [{ id: 1, quantity_received: 10 }] }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(400);
  });
});
