/**
 * Stress Test: Deliveries, Loyalty, Shifts, Suppliers, Purchase Orders, Promotions
 *
 * Tests each feature end-to-end against production API:
 * - CRUD operations (create, read, update, delete)
 * - Edge cases (missing fields, duplicates, invalid status)
 * - Concurrent requests
 * - Cleanup
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://db.posterita.com';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.SCENARIO_BASE_URL || 'https://web.posterita.com';
const SKIP = !SUPABASE_KEY;

function getDb(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

let accountId: string;
let storeId: number;
let userId: number;
const PREFIX = `stress_${Date.now()}`;

// Authenticated fetch helper
async function api(method: string, path: string, body?: any): Promise<Response> {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `posterita_account_cache=${accountId}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${BASE_URL}${path}`, opts);
}

// ============================================================
// Setup: find a demo account
// ============================================================
beforeAll(async () => {
  if (SKIP) return;
  const db = getDb();

  const { data: accounts } = await db
    .from('account')
    .select('account_id')
    .eq('type', 'demo')
    .limit(1);

  expect(accounts?.length).toBeGreaterThan(0);
  accountId = accounts![0].account_id;

  const { data: stores } = await db
    .from('store')
    .select('store_id')
    .eq('account_id', accountId)
    .limit(1);

  storeId = stores?.[0]?.store_id || 0;

  const { data: users } = await db
    .from('pos_user')
    .select('user_id, username')
    .eq('account_id', accountId)
    .limit(1);

  userId = users?.[0]?.user_id || 1;
});

// ============================================================
// 1. DELIVERIES
// ============================================================
describe.skipIf(SKIP)('1. Deliveries', () => {
  const ids: number[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of ids) {
      await db.from('delivery').delete().eq('id', id).eq('account_id', accountId);
    }
  });

  it('GET /api/deliveries returns 200', async () => {
    const res = await api('GET', '/api/deliveries');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('deliveries');
    expect(json).toHaveProperty('summary');
  });

  it('POST /api/deliveries creates delivery', async () => {
    const res = await api('POST', '/api/deliveries', {
      delivery_address: `${PREFIX} 42 Test St`,
      delivery_city: 'Port Louis',
      customer_name: `${PREFIX} Jane`,
      customer_phone: '+230 5555 0001',
      delivery_notes: 'Ring bell',
      estimated_time: 30,
      delivery_fee: 50,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.delivery.status).toBe('pending');
    ids.push(json.delivery.id);
  });

  it('POST fails without address', async () => {
    const res = await api('POST', '/api/deliveries', { customer_name: 'NoAddr' });
    expect(res.status).toBe(400);
  });

  it('PATCH transitions pending → assigned → in_transit → delivered', async () => {
    // Create
    const r1 = await api('POST', '/api/deliveries', { delivery_address: `${PREFIX} lifecycle` });
    const id = (await r1.json()).delivery.id;
    ids.push(id);

    // Assign
    const r2 = await api('PATCH', `/api/deliveries/${id}`, { status: 'assigned', driver_name: 'Mike' });
    expect(r2.status).toBe(200);
    expect((await r2.json()).delivery.status).toBe('assigned');

    // In transit
    const r3 = await api('PATCH', `/api/deliveries/${id}`, { status: 'in_transit' });
    expect((await r3.json()).delivery.status).toBe('in_transit');

    // Delivered
    const r4 = await api('PATCH', `/api/deliveries/${id}`, { status: 'delivered' });
    const final = await r4.json();
    expect(final.delivery.status).toBe('delivered');
    expect(final.delivery.actual_delivery_at).toBeTruthy();
  });

  it('GET with status filter', async () => {
    const res = await api('GET', '/api/deliveries?status=pending');
    expect(res.status).toBe(200);
  });

  it('concurrent creates succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        api('POST', '/api/deliveries', { delivery_address: `${PREFIX} concurrent ${i}` })
      )
    );
    for (const r of results) {
      expect(r.status).toBe(201);
      const j = await r.json();
      ids.push(j.delivery.id);
    }
  });
});

// ============================================================
// 2. LOYALTY
// ============================================================
describe.skipIf(SKIP)('2. Loyalty', () => {
  it('GET /api/loyalty/config returns 200', async () => {
    const res = await api('GET', '/api/loyalty/config');
    expect(res.status).toBe(200);
  });

  it('POST /api/loyalty/config saves settings', async () => {
    const res = await api('POST', '/api/loyalty/config', {
      points_per_currency: 2,
      redemption_rate: 0.01,
      min_redeem_points: 100,
      welcome_bonus: 10,
      is_active: true,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.config.points_per_currency).toBe(2);
  });

  it('GET /api/loyalty/wallets returns 200', async () => {
    const res = await api('GET', '/api/loyalty/wallets');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('wallets');
  });

  it('GET /api/loyalty/transactions returns 200', async () => {
    const res = await api('GET', '/api/loyalty/transactions?page=1');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('transactions');
  });

  it('config can be toggled off and on', async () => {
    await api('POST', '/api/loyalty/config', { is_active: false });
    const r1 = await api('GET', '/api/loyalty/config');
    expect((await r1.json()).config.is_active).toBe(false);

    await api('POST', '/api/loyalty/config', { is_active: true });
    const r2 = await api('GET', '/api/loyalty/config');
    expect((await r2.json()).config.is_active).toBe(true);
  });
});

// ============================================================
// 3. SHIFTS
// ============================================================
describe.skipIf(SKIP)('3. Shifts', () => {
  const shiftIds: number[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of shiftIds) {
      await db.from('shift').delete().eq('id', id).eq('account_id', accountId);
    }
  });

  it('GET /api/shifts returns 200', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api('GET', `/api/shifts?from=${today}&to=${today}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('shifts');
    expect(json).toHaveProperty('summary');
  });

  it('POST clock_in creates active shift', async () => {
    const res = await api('POST', '/api/shifts', {
      action: 'clock_in',
      user_id: userId,
      user_name: `${PREFIX}_user`,
      store_id: storeId,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.action).toBe('clocked_in');
    expect(json.shift.status).toBe('active');
    shiftIds.push(json.shift.id);
  });

  it('POST clock_in rejects duplicate active shift', async () => {
    const res = await api('POST', '/api/shifts', {
      action: 'clock_in',
      user_id: userId,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('active shift');
  });

  it('POST clock_out completes the shift', async () => {
    const res = await api('POST', '/api/shifts', {
      action: 'clock_out',
      user_id: userId,
      break_minutes: 15,
      notes: `${PREFIX} test shift`,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('clocked_out');
    expect(json.shift.status).toBe('completed');
    expect(json.shift.break_minutes).toBe(15);
    expect(json.hours_worked).toBeGreaterThanOrEqual(0);
  });

  it('POST clock_out with no active shift returns 404', async () => {
    const res = await api('POST', '/api/shifts', {
      action: 'clock_out',
      user_id: 99999,
    });
    expect(res.status).toBe(404);
  });

  it('POST fails without action', async () => {
    const res = await api('POST', '/api/shifts', { user_id: userId });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 4. SUPPLIERS
// ============================================================
describe.skipIf(SKIP)('4. Suppliers', () => {
  const supplierIds: number[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of supplierIds) {
      await db.from('supplier').delete().eq('supplier_id', id).eq('account_id', accountId);
    }
  });

  it('GET /api/suppliers returns 200', async () => {
    const res = await api('GET', '/api/suppliers');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('suppliers');
  });

  it('POST creates supplier', async () => {
    const res = await api('POST', '/api/suppliers', {
      name: `${PREFIX} Acme Corp`,
      contact_name: 'John Smith',
      phone: '+1-555-0100',
      email: `${PREFIX}@acme.test`,
      city: 'New York',
      country: 'US',
      payment_terms: 'Net 30',
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.supplier.name).toContain('Acme Corp');
    supplierIds.push(json.supplier.supplier_id);
  });

  it('POST fails without name', async () => {
    const res = await api('POST', '/api/suppliers', { phone: '123' });
    expect(res.status).toBe(400);
  });

  it('PATCH updates supplier', async () => {
    const id = supplierIds[0];
    const res = await api('PATCH', `/api/suppliers/${id}`, {
      payment_terms: 'Net 60',
      notes: 'Updated terms',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.supplier.payment_terms).toBe('Net 60');
  });

  it('GET with search filter', async () => {
    const res = await api('GET', `/api/suppliers?search=Acme`);
    expect(res.status).toBe(200);
  });

  it('concurrent creates succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        api('POST', '/api/suppliers', { name: `${PREFIX} Supplier${i}` })
      )
    );
    for (const r of results) {
      expect(r.status).toBe(201);
      const j = await r.json();
      supplierIds.push(j.supplier.supplier_id);
    }
  });

  it('DELETE removes supplier', async () => {
    const id = supplierIds.pop()!;
    const res = await api('DELETE', `/api/suppliers/${id}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 5. PURCHASE ORDERS
// ============================================================
describe.skipIf(SKIP)('5. Purchase Orders', () => {
  let supplierId: number;
  const poIds: number[] = [];

  beforeAll(async () => {
    if (SKIP) return;
    // Create a supplier for POs
    const res = await api('POST', '/api/suppliers', { name: `${PREFIX} PO Supplier` });
    const json = await res.json();
    supplierId = json.supplier.supplier_id;
  });

  afterAll(async () => {
    const db = getDb();
    for (const id of poIds) {
      await db.from('purchase_order_line').delete().eq('po_id', id);
      await db.from('purchase_order').delete().eq('po_id', id).eq('account_id', accountId);
    }
    if (supplierId) {
      await db.from('supplier').delete().eq('supplier_id', supplierId).eq('account_id', accountId);
    }
  });

  it('GET /api/purchase-orders returns 200', async () => {
    const res = await api('GET', '/api/purchase-orders');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('orders');
  });

  it('POST creates PO with lines', async () => {
    const res = await api('POST', '/api/purchase-orders', {
      supplier_id: supplierId,
      notes: `${PREFIX} test PO`,
      lines: [
        { product_name: 'Widget A', quantity_ordered: 100, unit_cost: 5.50 },
        { product_name: 'Widget B', quantity_ordered: 50, unit_cost: 12.00 },
      ],
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.order.status).toBe('draft');
    expect(json.order.grand_total).toBe(1150); // 100*5.5 + 50*12
    expect(json.po_number).toMatch(/^PO-/);
    poIds.push(json.order.po_id);
  });

  it('POST fails without supplier_id', async () => {
    const res = await api('POST', '/api/purchase-orders', {
      lines: [{ product_name: 'X', quantity_ordered: 1, unit_cost: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('POST fails without lines', async () => {
    const res = await api('POST', '/api/purchase-orders', {
      supplier_id: supplierId,
      lines: [],
    });
    expect(res.status).toBe(400);
  });

  it('PATCH draft → sent → received', async () => {
    const id = poIds[0];

    const r1 = await api('PATCH', `/api/purchase-orders/${id}`, { status: 'sent' });
    expect(r1.status).toBe(200);
    expect((await r1.json()).order.status).toBe('sent');

    const r2 = await api('PATCH', `/api/purchase-orders/${id}`, { status: 'received' });
    expect(r2.status).toBe(200);
    expect((await r2.json()).order.status).toBe('received');
  });

  it('GET with status filter', async () => {
    const res = await api('GET', '/api/purchase-orders?status=received');
    expect(res.status).toBe(200);
  });

  it('concurrent PO creates succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        api('POST', '/api/purchase-orders', {
          supplier_id: supplierId,
          lines: [{ product_name: `Concurrent ${i}`, quantity_ordered: 10, unit_cost: 1 }],
        })
      )
    );
    for (const r of results) {
      expect(r.status).toBe(201);
      const j = await r.json();
      poIds.push(j.order.po_id);
    }
  });
});

// ============================================================
// 6. PROMOTIONS
// ============================================================
describe.skipIf(SKIP)('6. Promotions', () => {
  const promoIds: number[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const id of promoIds) {
      await db.from('promotion').delete().eq('id', id).eq('account_id', accountId);
    }
  });

  it('GET /api/promotions returns 200', async () => {
    const res = await api('GET', '/api/promotions');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('promotions');
  });

  it('POST creates percentage_off promotion', async () => {
    const res = await api('POST', '/api/promotions', {
      name: `${PREFIX} 20% Off`,
      type: 'percentage_off',
      discount_value: 20,
      applies_to: 'order',
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.promotion.type).toBe('percentage_off');
    expect(json.promotion.discount_value).toBe(20);
    promoIds.push(json.promotion.id);
  });

  it('POST creates fixed_off promotion', async () => {
    const res = await api('POST', '/api/promotions', {
      name: `${PREFIX} $50 Off`,
      type: 'fixed_off',
      discount_value: 50,
      min_order_amount: 200,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.promotion.min_order_amount).toBe(200);
    promoIds.push(json.promotion.id);
  });

  it('POST creates buy_x_get_y promotion', async () => {
    const res = await api('POST', '/api/promotions', {
      name: `${PREFIX} Buy 2 Get 1`,
      type: 'buy_x_get_y',
      buy_quantity: 2,
      get_quantity: 1,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.promotion.buy_quantity).toBe(2);
    expect(json.promotion.get_quantity).toBe(1);
    promoIds.push(json.promotion.id);
  });

  it('POST creates promo_code promotion', async () => {
    const code = `TEST${Date.now()}`;
    const res = await api('POST', '/api/promotions', {
      name: `${PREFIX} Code Promo`,
      type: 'promo_code',
      discount_value: 15,
      promo_code: code,
      max_uses: 100,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.promotion.promo_code).toBe(code);
    promoIds.push(json.promotion.id);
  });

  it('POST fails with invalid type', async () => {
    const res = await api('POST', '/api/promotions', {
      name: 'Bad',
      type: 'invalid_type',
    });
    expect(res.status).toBe(400);
  });

  it('POST fails without name', async () => {
    const res = await api('POST', '/api/promotions', {
      type: 'percentage_off',
      discount_value: 10,
    });
    expect(res.status).toBe(400);
  });

  it('PATCH toggles active status', async () => {
    const id = promoIds[0];

    // Deactivate
    const r1 = await api('PATCH', `/api/promotions/${id}`, { is_active: false });
    expect(r1.status).toBe(200);
    expect((await r1.json()).promotion.is_active).toBe(false);

    // Reactivate
    const r2 = await api('PATCH', `/api/promotions/${id}`, { is_active: true });
    expect(r2.status).toBe(200);
    expect((await r2.json()).promotion.is_active).toBe(true);
  });

  it('POST with date constraints', async () => {
    const res = await api('POST', '/api/promotions', {
      name: `${PREFIX} Limited Time`,
      type: 'percentage_off',
      discount_value: 30,
      start_date: '2026-04-01',
      end_date: '2026-04-30',
      start_time: '09:00',
      end_time: '17:00',
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.promotion.start_date).toBeTruthy();
    expect(json.promotion.end_date).toBeTruthy();
    promoIds.push(json.promotion.id);
  });

  it('DELETE removes promotion', async () => {
    const id = promoIds.pop()!;
    const res = await api('DELETE', `/api/promotions/${id}`);
    expect(res.status).toBe(200);
  });

  it('GET with active filter', async () => {
    const res = await api('GET', '/api/promotions?active=true');
    expect(res.status).toBe(200);
  });

  it('concurrent creates succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        api('POST', '/api/promotions', {
          name: `${PREFIX} Concurrent ${i}`,
          type: 'percentage_off',
          discount_value: 5 + i,
        })
      )
    );
    for (const r of results) {
      expect(r.status).toBe(201);
      const j = await r.json();
      promoIds.push(j.promotion.id);
    }
  });
});
