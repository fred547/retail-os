import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionAccountId } from "@/lib/account-context";

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * GET /api/inventory/sessions — List sessions for account
 * Query params: store_id, status
 */
export async function GET(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("store_id");
  const status = searchParams.get("status");

  let query = getDb()
    .from("inventory_count_session")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", parseInt(storeId));
  if (status) query = query.eq("status", status);

  const { data: sessions, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate entry counts per session
  const sessionIds = (sessions ?? []).map((s: any) => s.session_id);
  let entryCounts: Record<number, { unique_products: number; total_quantity: number }> = {};

  if (sessionIds.length > 0) {
    const { data: entries } = await getDb()
      .from("inventory_count_entry")
      .select("session_id, product_id, quantity")
      .in("session_id", sessionIds);

    if (entries) {
      for (const e of entries) {
        if (!entryCounts[e.session_id]) {
          entryCounts[e.session_id] = { unique_products: 0, total_quantity: 0 };
        }
        entryCounts[e.session_id].total_quantity += e.quantity;
      }
      // Count unique products per session
      const productSets: Record<number, Set<number>> = {};
      for (const e of entries) {
        if (!productSets[e.session_id]) productSets[e.session_id] = new Set();
        productSets[e.session_id].add(e.product_id);
      }
      for (const [sid, pset] of Object.entries(productSets)) {
        if (entryCounts[Number(sid)]) {
          entryCounts[Number(sid)].unique_products = pset.size;
        }
      }
    }
  }

  const enriched = (sessions ?? []).map((s: any) => ({
    ...s,
    unique_products: entryCounts[s.session_id]?.unique_products ?? 0,
    total_quantity: entryCounts[s.session_id]?.total_quantity ?? 0,
  }));

  return NextResponse.json({ data: enriched });
}

/**
 * POST /api/inventory/sessions — Create a new session
 * Body: { store_id, type?, name?, notes?, created_by? }
 */
export async function POST(req: NextRequest) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { store_id, type, name, notes, created_by } = body;

  if (!store_id) {
    return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  }

  const { data, error } = await getDb()
    .from("inventory_count_session")
    .insert({
      account_id: accountId,
      store_id,
      type: type || "spot_check",
      name: name || null,
      notes: notes || null,
      created_by: created_by || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
