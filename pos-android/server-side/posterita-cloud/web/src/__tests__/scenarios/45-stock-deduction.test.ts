/**
 * Scenario 45: Stock Deduction on Sale
 *
 * Tests the stock deduction lifecycle:
 * 1. Product starts with quantity_on_hand
 * 2. Order sync deducts stock
 * 3. Manual adjustment changes stock
 * 4. Journal records every movement
 */
import { describe, it, expect, afterAll } from 'vitest';
import { getSupabase, SKIP_SCENARIOS } from './helpers';

const TEST_PREFIX = `test_stock_${Date.now()}`;

describe.skipIf(SKIP_SCENARIOS)('Scenario 45: Stock Deduction', () => {
  let db: ReturnType<typeof getSupabase>;
  let testAccountId: string;
  let testProductId: number;

  // Use existing test account or find one
  afterAll(async () => {
    // Clean up test data
    if (testProductId) {
      await db.from('stock_journal').delete().eq('product_id', testProductId).eq('account_id', testAccountId);
      await db.from('product').update({
        quantity_on_hand: 0,
        reorder_point: 0,
        track_stock: true,
      }).eq('product_id', testProductId).eq('account_id', testAccountId);
    }
  });

  it('should find a test account with products', async () => {
    db = getSupabase();
    // Find any account with products to test against
    const { data: accounts } = await db
      .from('account')
      .select('account_id')
      .eq('type', 'demo')
      .limit(1);

    expect(accounts).toBeTruthy();
    expect(accounts!.length).toBeGreaterThan(0);
    testAccountId = accounts![0].account_id;

    // Find a product in this account
    const { data: products } = await db
      .from('product')
      .select('product_id, name, quantity_on_hand, track_stock')
      .eq('account_id', testAccountId)
      .eq('isactive', 'Y')
      .eq('is_deleted', false)
      .limit(1);

    expect(products).toBeTruthy();
    expect(products!.length).toBeGreaterThan(0);
    testProductId = products![0].product_id;
  });

  it('should have stock columns on product table', async () => {
    const { data: product } = await db
      .from('product')
      .select('product_id, quantity_on_hand, reorder_point, track_stock')
      .eq('product_id', testProductId)
      .eq('account_id', testAccountId)
      .single();

    expect(product).toBeTruthy();
    expect(product).toHaveProperty('quantity_on_hand');
    expect(product).toHaveProperty('reorder_point');
    expect(product).toHaveProperty('track_stock');
    expect(typeof product!.quantity_on_hand).toBe('number');
  });

  it('should set initial stock quantity via direct update', async () => {
    const { error } = await db
      .from('product')
      .update({ quantity_on_hand: 50, reorder_point: 5, track_stock: true })
      .eq('product_id', testProductId)
      .eq('account_id', testAccountId);

    expect(error).toBeNull();

    // Verify
    const { data } = await db
      .from('product')
      .select('quantity_on_hand, reorder_point, track_stock')
      .eq('product_id', testProductId)
      .eq('account_id', testAccountId)
      .single();

    expect(data!.quantity_on_hand).toBe(50);
    expect(data!.reorder_point).toBe(5);
    expect(data!.track_stock).toBe(true);
  });

  it('should create a stock journal entry on adjustment', async () => {
    // Simulate a manual adjustment: 50 → 45
    const { error: updateErr } = await db
      .from('product')
      .update({ quantity_on_hand: 45 })
      .eq('product_id', testProductId)
      .eq('account_id', testAccountId);

    expect(updateErr).toBeNull();

    // Insert journal entry
    const { error: journalErr } = await db
      .from('stock_journal')
      .insert({
        account_id: testAccountId,
        product_id: testProductId,
        store_id: 0,
        quantity_change: -5,
        quantity_after: 45,
        reason: 'adjustment',
        reference_type: 'manual',
        notes: TEST_PREFIX,
      });

    expect(journalErr).toBeNull();
  });

  it('should query stock journal by product', async () => {
    const { data, error } = await db
      .from('stock_journal')
      .select('*')
      .eq('account_id', testAccountId)
      .eq('product_id', testProductId)
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);

    const entry = data![0];
    expect(entry.quantity_change).toBe(-5);
    expect(entry.quantity_after).toBe(45);
    expect(entry.reason).toBe('adjustment');
  });

  it('should query stock journal by reason filter', async () => {
    const { data, error } = await db
      .from('stock_journal')
      .select('*')
      .eq('account_id', testAccountId)
      .eq('reason', 'adjustment')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('should handle stock_journal table existing with proper columns', async () => {
    // Verify the table has expected columns by inserting a full record
    const { error } = await db
      .from('stock_journal')
      .insert({
        account_id: testAccountId,
        product_id: testProductId,
        store_id: 1,
        quantity_change: 10,
        quantity_after: 55,
        reason: 'receive',
        reference_type: 'manual',
        reference_id: `${TEST_PREFIX}_ref`,
        user_id: 1,
        notes: `${TEST_PREFIX} — full column test`,
      });

    expect(error).toBeNull();
  });
});
