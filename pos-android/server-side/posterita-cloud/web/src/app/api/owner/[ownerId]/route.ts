import { NextRequest, NextResponse } from "next/server";
import { isAccountManager } from "@/lib/super-admin";
import { getDb } from "@/lib/supabase/admin";

/**
 * GET /api/owner/[ownerId] — Get owner details with all their brands
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  const isManager = await isAccountManager();
  if (!isManager) {
    return NextResponse.json({ error: "Account manager access required" }, { status: 403 });
  }

  const { ownerId } = await params;
  const db = getDb();

  const { data: owner } = await db
    .from("owner")
    .select("*")
    .eq("id", ownerId)
    .single();

  if (!owner) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const { data: accounts } = await db
    .from("account")
    .select("account_id, businessname, type, status, currency, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ owner, accounts: accounts ?? [] });
}

/**
 * PATCH /api/owner/[ownerId] — Update owner details
 * Body: { name?, email?, phone? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  const isManager = await isAccountManager();
  if (!isManager) {
    return NextResponse.json({ error: "Account manager access required" }, { status: 403 });
  }

  const { ownerId } = await params;
  const body = await req.json();
  const db = getDb();

  const { data: owner } = await db
    .from("owner")
    .select("id, email")
    .eq("id", ownerId)
    .single();

  if (!owner) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.phone !== undefined) updates.phone = body.phone.trim();

  // Check email uniqueness if changing
  if (updates.email && updates.email !== owner.email) {
    const { data: existing } = await db
      .from("owner")
      .select("id")
      .eq("email", updates.email)
      .neq("id", ownerId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Email already in use by another owner" }, { status: 409 });
    }
  }

  const { data, error } = await db
    .from("owner")
    .update(updates)
    .eq("id", ownerId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, owner: data });
}
