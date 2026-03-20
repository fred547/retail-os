/**
 * Client-side data fetching helper that proxies queries through
 * /api/data (which uses the service role key, bypassing RLS).
 *
 * Usage:
 *   const { data } = await dataQuery("product", {
 *     select: "*, productcategory(name)",
 *     filters: [{ column: "isactive", op: "eq", value: "Y" }],
 *     order: { column: "name" },
 *     limit: 50,
 *   });
 */

interface QueryOptions {
  select?: string;
  filters?: { column: string; op: string; value: any }[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: [number, number];
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

interface QueryResult<T = any> {
  data: T[] | null;
  error: string | null;
  count: number | null;
}

export async function dataQuery<T = any>(
  table: string,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, ...options }),
  });
  return res.json();
}

export async function dataQueryMulti<T = any>(
  queries: (QueryOptions & { table: string })[]
): Promise<QueryResult<T>[]> {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(queries),
  });
  return res.json();
}

/**
 * Convenience: update a record via a dedicated endpoint.
 * For now, we use the Supabase browser client for mutations
 * and the data proxy only for reads.
 */
export async function dataUpdate(
  table: string,
  id: { column: string; value: any },
  updates: Record<string, any>
): Promise<{ error: string | null }> {
  const res = await fetch("/api/data/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id, updates }),
  });
  return res.json();
}

/** Insert a record via the data proxy (service role, bypasses RLS). */
export async function dataInsert<T = any>(
  table: string,
  data: Record<string, any>
): Promise<{ data: T[] | null; error: string | null }> {
  const res = await fetch("/api/data/insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, data }),
  });
  return res.json();
}

/** Delete a record via the data proxy (service role, bypasses RLS). */
export async function dataDelete(
  table: string,
  id: { column: string; value: any }
): Promise<{ error: string | null }> {
  const res = await fetch("/api/data/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id }),
  });
  return res.json();
}
