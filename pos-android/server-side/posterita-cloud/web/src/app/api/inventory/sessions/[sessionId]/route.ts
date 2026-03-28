import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/inventory/sessions/[sessionId] — Session detail with entries
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: session, error } = await getDb()
    .from("inventory_count_session")
    .select("*")
    .eq("session_id", sessionId)
    .eq("account_id", accountId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get entries aggregated by product
  const { data: entries } = await getDb()
    .from("inventory_count_entry")
    .select("*")
    .eq("session_id", sessionId)
    .order("scanned_at", { ascending: false });

  // Aggregate by product_id
  const productMap: Record<number, {
    product_id: number;
    product_name: string | null;
    upc: string | null;
    total_quantity: number;
    scanned_by: number;
    last_scanned_at: string;
  }> = {};

  for (const entry of entries ?? []) {
    if (!productMap[entry.product_id]) {
      productMap[entry.product_id] = {
        product_id: entry.product_id,
        product_name: entry.product_name,
        upc: entry.upc,
        total_quantity: 0,
        scanned_by: entry.scanned_by,
        last_scanned_at: entry.scanned_at,
      };
    }
    productMap[entry.product_id].total_quantity += entry.quantity;
  }

  const aggregated = Object.values(productMap).sort((a, b) =>
    new Date(b.last_scanned_at).getTime() - new Date(a.last_scanned_at).getTime()
  );

  return NextResponse.json({
    data: {
      ...session,
      entries: aggregated,
      raw_entries: entries ?? [],
      unique_products: aggregated.length,
      total_quantity: aggregated.reduce((sum, e) => sum + e.total_quantity, 0),
    },
  });
}

/**
 * PATCH /api/inventory/sessions/[sessionId] — Update session status
 * Body: { status }
 * Valid transitions: created→active, active→completed, active→cancelled
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  // Load current session
  const { data: session } = await getDb()
    .from("inventory_count_session")
    .select("*")
    .eq("session_id", sessionId)
    .eq("account_id", accountId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    created: ["active", "cancelled"],
    active: ["completed", "cancelled"],
  };

  const allowed = validTransitions[session.status];
  if (!allowed || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from '${session.status}' to '${status}'` },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "active") {
    updates.started_at = new Date().toISOString();
  } else if (status === "completed" || status === "cancelled") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await getDb()
    .from("inventory_count_session")
    .update(updates)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
