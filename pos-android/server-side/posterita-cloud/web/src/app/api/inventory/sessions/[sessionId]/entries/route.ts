import { NextRequest, NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/account-context";
import { getDb } from "@/lib/supabase/admin";

/**
 * POST /api/inventory/sessions/[sessionId]/entries — Add entries
 * Body: { entries: [{ product_id, product_name?, upc?, quantity?, scanned_by?, terminal_id? }] }
 * Upserts by (session_id, product_id) — increments quantity if exists
 * Auto-transitions session created→active on first entry
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { entries } = body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries array is required" }, { status: 400 });
  }

  // Verify session exists and belongs to this account
  const { data: session } = await getDb()
    .from("inventory_count_session")
    .select("session_id, status, account_id")
    .eq("session_id", sessionId)
    .eq("account_id", accountId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "completed" || session.status === "cancelled") {
    return NextResponse.json(
      { error: `Cannot add entries to a ${session.status} session` },
      { status: 400 }
    );
  }

  // Auto-transition created → active on first entry
  if (session.status === "created") {
    await getDb()
      .from("inventory_count_session")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);
  }

  const results: any[] = [];
  let inserted = 0;
  let updated = 0;

  for (const entry of entries) {
    const { product_id, product_name, upc, quantity, scanned_by, terminal_id } = entry;

    if (!product_id) {
      results.push({ product_id, error: "product_id is required" });
      continue;
    }

    // Check if entry already exists for this product in this session
    const { data: existing } = await getDb()
      .from("inventory_count_entry")
      .select("entry_id, quantity")
      .eq("session_id", sessionId)
      .eq("product_id", product_id)
      .maybeSingle();

    if (existing) {
      // Increment quantity
      const newQty = existing.quantity + (quantity ?? 1);
      const { error } = await getDb()
        .from("inventory_count_entry")
        .update({
          quantity: newQty,
          scanned_at: new Date().toISOString(),
          scanned_by: scanned_by ?? 0,
        })
        .eq("entry_id", existing.entry_id);

      if (error) {
        results.push({ product_id, error: error.message });
      } else {
        results.push({ product_id, action: "incremented", quantity: newQty });
        updated++;
      }
    } else {
      // Insert new entry
      const { error } = await getDb()
        .from("inventory_count_entry")
        .insert({
          session_id: parseInt(sessionId),
          account_id: accountId,
          product_id,
          product_name: product_name || null,
          upc: upc || null,
          quantity: quantity ?? 1,
          scanned_by: scanned_by ?? 0,
          terminal_id: terminal_id ?? 0,
        });

      if (error) {
        results.push({ product_id, error: error.message });
      } else {
        results.push({ product_id, action: "inserted", quantity: quantity ?? 1 });
        inserted++;
      }
    }
  }

  // Update session timestamp
  await getDb()
    .from("inventory_count_session")
    .update({ updated_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  return NextResponse.json({ results, inserted, updated });
}
