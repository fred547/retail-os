import { vi } from 'vitest';

// ─── Supabase mock infrastructure ───────────────────────────────────
// Shared mock helpers for tests that interact with Supabase.
// The sync route (and others) create a module-level Supabase client via
// createClient.  We intercept that with vi.mock so every
// `supabase.from(table)...` call flows through our controllable chain builder.

/**
 * Per-table result map.  Keys follow two patterns:
 *   "table"                → default result for any query on that table
 *   "table:col=val"        → result when .eq(col, val) is in the chain
 *
 * Values are { data, error } objects.
 */
export let tableResults: Record<string, { data: any; error: any }> = {};

/** Every operation that hits the mock is recorded here for assertions. */
export let supabaseOps: Array<{
  table: string;
  op: string;
  data?: any;
  filters: Record<string, any>;
}> = [];

/**
 * Build a fully-chainable mock that records what was called and resolves
 * to the configured result for the table (+ optional filter key).
 */
export function createChain(table: string) {
  const state = {
    op: 'select' as string,
    data: undefined as any,
    filters: {} as Record<string, any>,
    upsertOpts: undefined as any,
  };

  function resolve() {
    supabaseOps.push({ table, op: state.op, data: state.data, filters: state.filters });
    // Build possible lookup keys from most-specific to least
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
  const passthrough = ['select', 'eq', 'gte', 'order', 'limit', 'in', 'neq', 'is', 'not', 'or', 'ilike', 'contains'] as const;
  for (const m of passthrough) {
    chain[m] = (...args: any[]) => {
      if (m === 'select') state.op = 'select';
      if (m === 'eq') state.filters[args[0]] = args[1];
      if (m === 'in') state.filters[args[0]] = args[1];
      return chain;
    };
  }
  for (const m of ['insert', 'update', 'upsert', 'delete'] as const) {
    chain[m] = (...args: any[]) => {
      state.op = m;
      state.data = args[0];
      if (m === 'upsert') state.upsertOpts = args[1];
      return chain;
    };
  }
  chain.single = () => {
    const r = resolve(); const d = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
    return Promise.resolve({ ...r, data: d });
  };
  chain.maybeSingle = () => {
    const r = resolve(); const d = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
    return Promise.resolve({ ...r, data: d });
  };
  // Make the chain thenable so `const { data } = await supabase.from(...).select(...)...` works
  chain.then = (onFulfilled: Function, onRejected?: Function) =>
    Promise.resolve(resolve()).then(onFulfilled as any, onRejected as any);

  return chain;
}

/** Reset tableResults and supabaseOps to their initial empty state. */
export function resetMockState() {
  tableResults = {};
  supabaseOps = [];
}

/**
 * Build a minimal Request-like object whose `.json()` resolves to `body`.
 */
export function mockRequest(body: any, headers?: Record<string, string>): any {
  const hdrs = new Map(Object.entries(headers ?? {}));
  return {
    json: () => Promise.resolve(body),
    headers: { get: (key: string) => hdrs.get(key) ?? null },
  };
}

/** Seed the pull tables with empty arrays so the route doesn't crash. */
export function seedEmptyPullTables() {
  const pullTables = [
    'product', 'productcategory', 'tax', 'modifier', 'customer',
    'preference', 'pos_user', 'discountcode', 'restaurant_table',
    'store', 'terminal',
  ];
  for (const t of pullTables) {
    tableResults[t] = { data: [], error: null };
  }
}

/**
 * Call this at the top level of your test file (before any describe/it blocks)
 * to register the `@supabase/supabase-js` mock.
 *
 * Because `vi.mock` is hoisted by Vitest, the caller must invoke this at the
 * module scope.  Example:
 *
 * ```ts
 * import { setupSupabaseMock } from '../helpers/supabase-mock';
 * setupSupabaseMock();
 * ```
 */
export function setupSupabaseMock() {
  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      from: (table: string) => createChain(table),
    }),
  }));
}
