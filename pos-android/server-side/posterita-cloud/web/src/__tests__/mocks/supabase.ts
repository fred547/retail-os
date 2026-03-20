/**
 * Mock Supabase client for testing API routes without hitting a real database.
 * Each test can configure return values per table/operation.
 */

type MockResult = { data: any; error: any };

export class MockSupabaseBuilder {
  private _result: MockResult = { data: null, error: null };
  private _selectColumns: string = '*';

  select(columns?: string) { this._selectColumns = columns || '*'; return this; }
  insert(data: any) { return this; }
  update(data: any) { return this; }
  upsert(data: any, opts?: any) { return this; }
  delete() { return this; }
  eq(col: string, val: any) { return this; }
  gte(col: string, val: any) { return this; }
  order(col: string, opts?: any) { return this; }
  limit(n: number) { return this; }
  single() { return Promise.resolve(this._result); }
  then(resolve: Function) { return resolve(this._result); }

  // Allow configuring what this chain returns
  mockReturn(data: any, error: any = null) {
    this._result = { data, error };
    return this;
  }
}

export function createMockSupabase(tableConfigs: Record<string, any> = {}) {
  const builders: Record<string, MockSupabaseBuilder> = {};

  return {
    from: (table: string) => {
      if (!builders[table]) {
        builders[table] = new MockSupabaseBuilder();
        if (tableConfigs[table]) {
          builders[table].mockReturn(tableConfigs[table]);
        }
      }
      return builders[table];
    },
    _builders: builders,
    _configureTable: (table: string, data: any, error: any = null) => {
      builders[table] = new MockSupabaseBuilder();
      builders[table].mockReturn(data, error);
    }
  };
}
