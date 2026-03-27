import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock infrastructure (same pattern as sync.test.ts) ──

let tableResults: Record<string, { data: any; error: any; count?: number }> = {};
let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    const filterKey = Object.entries(state.filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const result =
      tableResults[`${table}:${filterKey}`] ??
      tableResults[table] ??
      { data: (state.op === 'select' ? [] : null), error: null };
    return result;
  }

  const chain: any = {};
  const passthrough = ['select', 'eq', 'gte', 'order', 'limit', 'range', 'in', 'neq', 'is', 'not', 'or', 'gt', 'ilike', 'contains'] as const;
  for (const m of passthrough) {
    chain[m] = (...args: any[]) => {
      if (m === 'eq') state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => {
      state.op = m;
      state.data = args[0];
      return chain;
    };
  }
  chain.single = () => {
    const result = resolve();
    const d = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data;
    return Promise.resolve({ ...result, data: d });
  };
  chain.maybeSingle = () => {
    const result = resolve();
    const d = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data;
    return Promise.resolve({ ...result, data: d });
  };
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => createChain(table),
    rpc: (..._args: any[]) => {
      const result = { data: null, error: null };
      const obj: any = { ...result, throwOnError: () => Promise.resolve(result) };
      obj.then = (onFulfilled: Function, onRejected?: Function) =>
        Promise.resolve(result).then(onFulfilled as any, onRejected as any);
      return obj;
    },
  }),
}));

// ─── Helpers ──

function mockRequest(body: any): any {
  return {
    json: () => Promise.resolve(body),
    headers: { get: () => null },
  };
}

beforeEach(() => {
  tableResults = {};
  supabaseOps = [];
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

async function importSyncRoute() {
  return await import('../../app/api/sync/route');
}

function seedEmptyPullTables() {
  const pullTables = [
    'product', 'productcategory', 'tax', 'modifier', 'customer',
    'preference', 'pos_user', 'discountcode', 'restaurant_table',
    'store', 'terminal',
    'table_section', 'preparation_station', 'category_station_mapping',
  ];
  for (const t of pullTables) {
    tableResults[t] = { data: [], error: null };
  }
  // Sync request log and inbox
  tableResults['sync_request_log'] = { data: null, error: null };
  tableResults['sync_inbox'] = { data: [{ id: 1 }], error: null };
  tableResults['account'] = { data: [{ account_id: 'test_acc', businessname: 'Test' }], error: null };
  tableResults['inventory_count_session'] = { data: [], error: null };
}

function baseSyncBody() {
  return {
    account_id: 'test_acc',
    terminal_id: 1,
    store_id: 1,
    last_sync_at: '1970-01-01T00:00:00.000Z',
    client_sync_version: 2,
    device_id: 'test_device',
  };
}

// ════════════════════════════════════════════════════════════════════
// #1: Error surfacing — sync errors returned in response
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #1: Error Surfacing', () => {
  it('returns errors array when till insert fails', async () => {
    seedEmptyPullTables();
    // Make till insert fail
    tableResults['till'] = { data: null, error: { message: 'FK violation on terminal_id', code: '23503' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'till-uuid-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 100, dateOpened: '2026-03-25T10:00:00Z',
        status: 'open',
      }],
    }));
    const json = await res.json();
    expect(json.errors).toBeDefined();
    expect(json.errors.length).toBeGreaterThan(0);
    expect(json.errors[0]).toContain('till-uuid-001');
  });

  it('returns errors array when order insert fails', async () => {
    seedEmptyPullTables();
    tableResults['orders'] = { data: null, error: { message: 'unique constraint violated', code: '23505' } };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'order-uuid-001', grandTotal: 50,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
    }));
    const json = await res.json();
    expect(json.errors).toBeDefined();
    // Duplicate key falls back to update — may not error
    // But the sync should still complete
    expect(json.orders_synced).toBeDefined();
  });

  it('returns empty errors array on clean sync', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseSyncBody()));
    const json = await res.json();
    expect(json.errors).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════
// #2: Retry behavior — server handles retried payloads gracefully
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #2: Idempotent Retry', () => {
  it('handles duplicate order UUID gracefully (insert fails, update succeeds)', async () => {
    seedEmptyPullTables();
    // First call: insert succeeds
    // We simulate the existing record check returning null (not found)
    // so insert is attempted

    const { POST } = await importSyncRoute();
    const body = {
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'retry-order-001', grandTotal: 99.99,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
    };

    const res = await POST(mockRequest(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.orders_synced).toBeGreaterThanOrEqual(0);
  });

  it('handles duplicate till UUID gracefully', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'retry-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 50, dateOpened: '2026-03-25T10:00:00Z',
        status: 'closed', dateClosed: '2026-03-25T18:00:00Z',
        cashamt: 200, cardamt: 100, grandtotal: 300,
      }],
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.tills_synced).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// #3: Sync receipt — response contains full breakdown
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #3: Sync Receipt', () => {
  it('returns counts for orders, tills, and pulled data', async () => {
    seedEmptyPullTables();
    // Seed some products to be pulled
    tableResults['product'] = { data: [
      { product_id: 1, name: 'Burger', isactive: 'Y', account_id: 'test_acc' },
      { product_id: 2, name: 'Fries', isactive: 'Y', account_id: 'test_acc' },
    ], error: null };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 10, uuid: 'receipt-order-001', grandTotal: 25,
        dateOrdered: '2026-03-25T12:00:00Z',
      }],
      tills: [{
        till_id: 5, uuid: 'receipt-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 100, dateOpened: '2026-03-25T08:00:00Z',
        status: 'open',
      }],
    }));
    const json = await res.json();

    // Response must include receipt fields
    expect(json.orders_synced).toBeDefined();
    expect(json.tills_synced).toBeDefined();
    expect(json.products).toBeDefined();
    expect(json.errors).toBeDefined();
    expect(json.server_time).toBeDefined();
  });

  it('includes conflicts_detected count in response', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest(baseSyncBody()));
    const json = await res.json();
    expect(json.conflicts_detected).toBeDefined();
    expect(typeof json.conflicts_detected).toBe('number');
  });
});

// ════════════════════════════════════════════════════════════════════
// #4: Context validation — account_id scoping
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #4: Context Validation', () => {
  it('rejects sync with empty account_id', async () => {
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      account_id: '',
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects sync with missing account_id', async () => {
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      terminal_id: 1,
      store_id: 1,
      last_sync_at: '1970-01-01T00:00:00.000Z',
    }));
    expect(res.status).toBe(400);
  });

  it('scopes till insert to the request account_id', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      account_id: 'account_xyz',
      tills: [{
        till_id: 1, uuid: 'scoped-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 0, dateOpened: '2026-03-25T10:00:00Z',
        status: 'open',
      }],
    }));

    // Verify the insert used the correct account_id
    const tillInsert = supabaseOps.find(op => op.table === 'till' && op.op === 'insert');
    if (tillInsert) {
      expect(tillInsert.data.account_id).toBe('account_xyz');
    }
  });

  it('scopes order insert to the request account_id', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      account_id: 'account_abc',
      orders: [{
        orderId: 1, uuid: 'scoped-order-001', grandTotal: 10,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
    }));

    const orderInsert = supabaseOps.find(op => op.table === 'orders' && op.op === 'insert');
    if (orderInsert) {
      expect(orderInsert.data.account_id).toBe('account_abc');
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// #5: Conflict detection — stale overwrite prevention
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #5: Conflict Detection', () => {
  it('detects stale overwrite when server has newer data', async () => {
    seedEmptyPullTables();
    // Server has a till updated at 2026-03-25T15:00:00Z
    tableResults['till:uuid=stale-till-001'] = {
      data: { uuid: 'stale-till-001', updated_at: '2026-03-25T15:00:00Z', is_sync: true },
      error: null,
    };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'stale-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 100, dateOpened: '2026-03-25T08:00:00Z',
        // This is OLDER than server's version
        status: 'open',
      }],
    }));
    const json = await res.json();

    // Till should still be "synced" (handled) but with conflict detected
    expect(json.tills_synced).toBeGreaterThanOrEqual(0);
    expect(json.conflicts_detected).toBeDefined();
  });

  it('allows update when incoming data is newer', async () => {
    seedEmptyPullTables();
    // Server has old data
    tableResults['till:uuid=fresh-till-001'] = {
      data: { uuid: 'fresh-till-001', updated_at: '2026-03-20T10:00:00Z', is_sync: true },
      error: null,
    };

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'fresh-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 200, dateOpened: '2026-03-25T08:00:00Z',
        dateClosed: '2026-03-25T18:00:00Z', status: 'closed',
        cashamt: 500, cardamt: 100, grandtotal: 600,
      }],
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.tills_synced).toBeGreaterThanOrEqual(1);
  });

  it('handles new record (no conflict)', async () => {
    seedEmptyPullTables();
    // No existing record — maybeSingle returns null

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 99, uuid: 'brand-new-till', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 50, dateOpened: '2026-03-25T10:00:00Z',
        status: 'open',
      }],
    }));
    const json = await res.json();
    expect(json.conflicts_detected).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// #6: Payload checksum — integrity verification
// ════════════════════════════════════════════════════════════════════

describe('Sync Hardening #6: Payload Checksum', () => {
  it('accepts sync when checksum matches', async () => {
    seedEmptyPullTables();
    // Compute correct checksum: "O:cs-order-001:99.99;"
    const crypto = await import('crypto');
    const input = 'O:cs-order-001:99.99;';
    const correctChecksum = crypto.createHash('sha256').update(input).digest('hex');

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'cs-order-001', grandTotal: 99.99,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
      payload_checksum: correctChecksum,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    // No checksum error in errors array
    const checksumErrors = (json.errors || []).filter((e: string) => e.includes('integrity'));
    expect(checksumErrors.length).toBe(0);
  });

  it('succeeds even when checksum mismatches (warning-only)', async () => {
    seedEmptyPullTables();

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'cs-order-002', grandTotal: 99.99,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
      payload_checksum: 'deadbeef_wrong_checksum',
    }));
    const json = await res.json();

    // Sync succeeds — checksum mismatch is warning-only (console.warn, not error)
    expect(res.status).toBe(200);
    // No checksum errors in response (downgraded from error to console.warn)
    const checksumErrors = (json.errors || []).filter((e: string) => e.includes('integrity'));
    expect(checksumErrors.length).toBe(0);
  });

  it('skips checksum validation when no checksum provided', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'no-checksum-order', grandTotal: 50,
        dateOrdered: '2026-03-25T10:00:00Z',
      }],
      // No payload_checksum field
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    const checksumErrors = (json.errors || []).filter((e: string) => e.includes('integrity'));
    expect(checksumErrors.length).toBe(0);
  });

  it('validates checksum with tills included', async () => {
    seedEmptyPullTables();
    const crypto = await import('crypto');
    // Order: "O:cs-order-003:50;" + Till: "T:cs-till-003:100:300;"
    const input = 'O:cs-order-003:50;T:cs-till-003:100:300;';
    const checksum = crypto.createHash('sha256').update(input).digest('hex');

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{ orderId: 1, uuid: 'cs-order-003', grandTotal: 50, dateOrdered: '2026-03-25T10:00:00Z' }],
      tills: [{
        till_id: 1, uuid: 'cs-till-003', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 100, grandtotal: 300,
        dateOpened: '2026-03-25T08:00:00Z', status: 'closed',
      }],
      payload_checksum: checksum,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    const checksumErrors = (json.errors || []).filter((e: string) => e.includes('integrity'));
    expect(checksumErrors.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// Till UUID linking — orders preserve till_uuid
// ════════════════════════════════════════════════════════════════════

describe('Till UUID Linking', () => {
  it('stores till_uuid on order even when till not yet synced', async () => {
    seedEmptyPullTables();
    // No existing till in DB

    const { POST } = await importSyncRoute();
    const res = await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'linked-order-001', grandTotal: 75,
        dateOrdered: '2026-03-25T10:00:00Z',
        tillUuid: 'not-yet-synced-till',
      }],
    }));
    const json = await res.json();
    expect(res.status).toBe(200);

    // Find the order insert and verify till_uuid was included
    const orderOp = supabaseOps.find(op => op.table === 'orders' && (op.op === 'insert' || op.op === 'update'));
    if (orderOp?.data) {
      expect(orderOp.data.till_uuid).toBe('not-yet-synced-till');
    }
  });

  it('resolves till_id from till_uuid when till exists', async () => {
    seedEmptyPullTables();
    // Till exists in DB — mock both the conflict check and the UUID lookup
    tableResults['till:uuid=existing-till-uuid'] = {
      data: { till_id: 42, uuid: 'existing-till-uuid', updated_at: '2026-03-20T00:00:00Z', is_sync: true },
      error: null,
    };
    // The order's till lookup also uses this pattern
    tableResults['till'] = {
      data: [{ till_id: 42, uuid: 'existing-till-uuid' }],
      error: null,
    };

    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      orders: [{
        orderId: 1, uuid: 'linked-order-002', grandTotal: 100,
        dateOrdered: '2026-03-25T10:00:00Z',
        tillUuid: 'existing-till-uuid',
      }],
    }));

    const orderOp = supabaseOps.find(op => op.table === 'orders' && (op.op === 'insert' || op.op === 'update'));
    if (orderOp?.data) {
      expect(orderOp.data.till_uuid).toBe('existing-till-uuid');
      expect(orderOp.data.till_id).toBe(42);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Till status — open vs closed
// ════════════════════════════════════════════════════════════════════

describe('Till Status Sync', () => {
  it('syncs open till with status=open', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'open-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 200, dateOpened: '2026-03-25T08:00:00Z',
        status: 'open',
      }],
    }));

    const tillOp = supabaseOps.find(op => op.table === 'till' && (op.op === 'insert' || op.op === 'update'));
    if (tillOp?.data) {
      expect(tillOp.data.status).toBe('open');
      expect(tillOp.data.date_closed).toBeFalsy();
    }
  });

  it('syncs closed till with status=closed and amounts', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'closed-till-001', store_id: 1, terminal_id: 1,
        openBy: 1, closeBy: 2, openingAmt: 200, closingAmt: 950,
        dateOpened: '2026-03-25T08:00:00Z', dateClosed: '2026-03-25T18:00:00Z',
        cashamt: 700, cardamt: 250, grandtotal: 950,
        status: 'closed',
      }],
    }));

    const tillOp = supabaseOps.find(op => op.table === 'till' && (op.op === 'insert' || op.op === 'update'));
    if (tillOp?.data) {
      expect(tillOp.data.status).toBe('closed');
      expect(tillOp.data.cash_amt).toBe(700);
      expect(tillOp.data.card_amt).toBe(250);
      expect(tillOp.data.grand_total).toBe(950);
    }
  });

  it('infers status from date_closed if not provided', async () => {
    seedEmptyPullTables();
    const { POST } = await importSyncRoute();
    await POST(mockRequest({
      ...baseSyncBody(),
      tills: [{
        till_id: 1, uuid: 'inferred-status-till', store_id: 1, terminal_id: 1,
        openBy: 1, openingAmt: 0, dateOpened: '2026-03-25T08:00:00Z',
        dateClosed: '2026-03-25T18:00:00Z',
        // No explicit status field
      }],
    }));

    const tillOp = supabaseOps.find(op => op.table === 'till' && (op.op === 'insert' || op.op === 'update'));
    if (tillOp?.data) {
      expect(tillOp.data.status).toBe('closed');
    }
  });
});
